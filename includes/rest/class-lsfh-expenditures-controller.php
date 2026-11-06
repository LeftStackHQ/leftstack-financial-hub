<?php
/**
 * Expenditure routes: list, add, edit, delete, bulk changes, status rules and receipt upload.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Expenditure routes: list, add, edit, delete, bulk changes, status rules and receipt upload.
 */
class LSFH_Expenditures_Controller extends LSFH_REST_Base {

	/**
	 * Status of an expenditure on the Transactions screen.
	 *
	 * A Posted date makes it "posted". Without one it stays "scheduled" while dated after today
	 * (site time), then becomes "pending".
	 *
	 * @param string|null $expense_date Payment date, YYYY-MM-DD.
	 * @param string|null $date_posted  Date it posted at the bank, YYYY-MM-DD.
	 * @return string One of "posted", "scheduled" or "pending".
	 */
	public static function expenditure_status( $expense_date, $date_posted ): string {
		if ( $date_posted && '0000-00-00' !== $date_posted ) {
			return 'posted';
		}
		return ( $expense_date && $expense_date > current_time( 'Y-m-d' ) ) ? 'scheduled' : 'pending';
	}

	/**
	 * A payment dated in the future cannot have a Posted date yet.
	 *
	 * @param string|null $expense_date Payment date, YYYY-MM-DD.
	 * @param string|null $date_posted  Posted date, YYYY-MM-DD.
	 * @return WP_Error|null An error to return, or null when the two dates are consistent.
	 */
	public static function scheduled_posted_error( $expense_date, $date_posted ): ?WP_Error {
		if ( $date_posted && '0000-00-00' !== $date_posted && $expense_date && $expense_date > current_time( 'Y-m-d' ) ) {
			return new WP_Error(
				'lsfh_scheduled_posted',
				'A scheduled payment cannot have a Posted date until its payment date arrives.',
				array( 'status' => 400 )
			);
		}
		return null;
	}

	/**
	 * List expenditures, with filters (including status), sorting, paging and totals.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function list_expenditures( WP_REST_Request $req ) {
		global $wpdb;
		$t = $wpdb->prefix . 'lsfh_expenditures';
		$c = $wpdb->prefix . 'lsfh_budget_categories';

		$per_page = self::per_page( $req, 50, 500 );
		$page     = max( 1, (int) ( $req->get_param( 'page' ) ?? 1 ) );
		$offset   = ( $page - 1 ) * $per_page;

		$wheres    = array();
		$values    = array();
		$date_from = sanitize_text_field( $req->get_param( 'date_from' ) ?? '' );
		$date_to   = sanitize_text_field( $req->get_param( 'date_to' ) ?? '' );
		$cat_id    = $req->get_param( 'category_id' );
		$method    = sanitize_text_field( $req->get_param( 'payment_method' ) ?? '' );
		$balanced  = $req->get_param( 'balanced' );
		$period    = $req->get_param( 'filing_period_id' );
		$search    = sanitize_text_field( $req->get_param( 'search' ) ?? '' );
		$status    = sanitize_key( $req->get_param( 'status' ) ?? '' );
		$today     = current_time( 'Y-m-d' );

		if ( $date_from ) {
			$wheres[] = 'e.expense_date >= %s';
			$values[] = $date_from;
		}
		if ( $date_to ) {
			$wheres[] = 'e.expense_date <= %s';
			$values[] = $date_to;
		}
		// Status: a Posted date means posted; otherwise future-dated is scheduled, the rest pending.
		$no_posted = "(e.date_posted IS NULL OR e.date_posted = '0000-00-00')";
		if ( 'posted' === $status ) {
			$wheres[] = "NOT $no_posted";
		}
		if ( 'scheduled' === $status ) {
			$wheres[] = "$no_posted AND e.expense_date > %s";
			$values[] = $today;
		}
		if ( 'pending' === $status ) {
			$wheres[] = "$no_posted AND e.expense_date <= %s";
			$values[] = $today;
		}
		if ( $cat_id ) {
			$wheres[] = 'e.category_id = %d';
			$values[] = (int) $cat_id;
		}
		if ( $method ) {
			$wheres[] = 'e.payment_method = %s';
			$values[] = $method;
		}
		if ( $period ) {
			$wheres[] = 'e.filing_period_id = %d';
			$values[] = (int) $period;
		}
		if ( null !== $balanced && '' !== $balanced ) {
			$wheres[] = 'e.balanced = %d';
			$values[] = (int) (bool) $balanced;
		}
		if ( $search ) {
			$like     = '%' . $wpdb->esc_like( $search ) . '%';
			$values[] = $like;
			$values[] = $like;
			$amount   = self::search_amount( $search );
			if ( null === $amount ) {
				$wheres[] = '(e.payee LIKE %s OR e.description LIKE %s)';
			} else {
				// A number also matches a payment of that amount.
				$wheres[] = '(e.payee LIKE %s OR e.description LIKE %s OR ROUND(ABS(e.amount),2) = %f)';
				$values[] = $amount;
			}
		}
		$where_sql = $wheres ? 'WHERE ' . implode( ' AND ', $wheres ) : '';

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$agg_sql      = "SELECT COUNT(*) AS cnt, COALESCE(SUM(e.amount),0) AS total_amount FROM $t e $where_sql";
		$agg          = $wpdb->get_row( self::prepared( $agg_sql, $values ) );
		$total        = (int) ( $agg->cnt ?? 0 );
		$total_amount = (float) ( $agg->total_amount ?? 0 );

		$values[]         = $per_page;
		$values[]         = $offset;
		$exp_allowed_sort = array( 'expense_date', 'date_posted', 'payee', 'amount', 'category_name' );
		$exp_ob           = in_array( $req->get_param( 'orderby' ), $exp_allowed_sort, true ) ? $req->get_param( 'orderby' ) : 'expense_date';
		$exp_od           = strtoupper( $req->get_param( 'order' ) ?? 'DESC' ) === 'ASC' ? 'ASC' : 'DESC';
		$exp_order        = ( 'category_name' === $exp_ob ) ? "c.name $exp_od, e.expense_date DESC" : "e.$exp_ob $exp_od, e.id DESC";
		$sql              = "SELECT e.*, c.name as category_name, c.color as category_color
                FROM $t e
                LEFT JOIN $c c ON c.id = e.category_id
                $where_sql
                ORDER BY $exp_order
                LIMIT %d OFFSET %d";
		$rows             = $wpdb->get_results( self::prepared( $sql, $values ) );
		// phpcs:enable

		$bank_matches = LSFH_Bank_Status::matched( 'expense', array_map( static fn( $r ) => (int) $r->id, $rows ) );
		foreach ( $rows as $r ) {
			$r->id                    = (int) $r->id;
			$r->bank_matched          = isset( $bank_matches[ $r->id ] );
			$r->amount                = (float) $r->amount;
			$r->balanced              = (bool) $r->balanced;
			$r->status                = self::expenditure_status( $r->expense_date, $r->date_posted );
			$r->is_future             = (bool) ( $r->expense_date && $r->expense_date > current_time( 'Y-m-d' ) );
			$r->receipt_attachment_id = $r->receipt_attachment_id ? (int) $r->receipt_attachment_id : null;
			if ( $r->receipt_attachment_id ) {
				$r->receipt_url_resolved = wp_get_attachment_url( $r->receipt_attachment_id ) ?: $r->receipt_url;
			}
		}
		return rest_ensure_response(
			array(
				'total'        => $total,
				'total_amount' => $total_amount,
				'page'         => $page,
				'per_page'     => $per_page,
				'data'         => $rows,
			)
		);
	}

	/**
	 * Add an expenditure.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function create_expenditure( WP_REST_Request $req ) {
		global $wpdb;
		$d   = self::sanitize_expenditure( $req->get_json_params() ?? array() );
		$err = self::scheduled_posted_error( $d['expense_date'] ?? '', $d['date_posted'] ?? '' );
		if ( $err ) {
			return $err;
		}
		// Auto-assign filing period by expense date when none is explicitly provided.
		if ( empty( $d['filing_period_id'] ) && ! empty( $d['expense_date'] ) ) {
			$d['filing_period_id'] = LSFH_Periods::period_for_date( $d['expense_date'] );
		}
		// A fee expense named after a payout is that payout's fee expense.
		$payout = 'fee' === $d['payment_method'] ? LSFH_Payout_Fees::payout_for_payee( $d['payee'] ) : null;
		if ( null !== $payout ) {
			$d['disbursement_id'] = $payout;
		}
		$now             = current_time( 'mysql' );
		$d['created_at'] = $now;
		$d['updated_at'] = $now;
		$wpdb->insert( $wpdb->prefix . 'lsfh_expenditures', $d ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		return rest_ensure_response( self::get_expenditure_row( $wpdb->insert_id ) );
	}

	/**
	 * Update the fields sent for an expenditure.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function update_expenditure( WP_REST_Request $req ) {
		global $wpdb;
		$id     = (int) $req->get_param( 'id' );
		$params = $req->get_json_params() ?? array();
		$all    = self::sanitize_expenditure( $params );

		// Only write fields that were explicitly present in the request body.
		// Prevents partial updates (e.g. the balanced one-click toggle) from
		// defaulting omitted fields to '' / 0 / null and overwriting real data.
		$d = array();
		foreach ( array_keys( $all ) as $key ) {
			if ( array_key_exists( $key, $params ) ) {
				$d[ $key ] = $all[ $key ];
			}
		}
		if ( ! $d ) {
			return rest_ensure_response( self::get_expenditure_row( $id ) );
		}
		// Block a Posted date on a future-dated payment, but only when one of the two dates
		// is being changed, so other edits to an older row are not held up.
		$cur = self::get_expenditure_row( $id );
		if ( $cur ) {
			$eff_date   = array_key_exists( 'expense_date', $d ) ? $d['expense_date'] : $cur->expense_date;
			$eff_posted = array_key_exists( 'date_posted', $d ) ? $d['date_posted'] : $cur->date_posted;
			$changed    = ( array_key_exists( 'date_posted', $d ) && (string) $d['date_posted'] !== (string) $cur->date_posted )
				|| ( array_key_exists( 'expense_date', $d ) && (string) $d['expense_date'] !== (string) $cur->expense_date );
			$err        = $changed ? self::scheduled_posted_error( $eff_date, $eff_posted ) : null;
			if ( $err ) {
				return $err;
			}
		}
		$d['updated_at'] = current_time( 'mysql' );
		$wpdb->update( $wpdb->prefix . 'lsfh_expenditures', $d, array( 'id' => $id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		return rest_ensure_response( self::get_expenditure_row( $id ) );
	}

	/**
	 * Fetch one expenditure with its category name and type-cast fields.
	 *
	 * @param int $id Expenditure ID.
	 * @return object|null The row, or null when it does not exist.
	 */
	public static function get_expenditure_row( int $id ): ?object {
		global $wpdb;
		$row = $wpdb->get_row( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prepare(
				"SELECT e.*, c.name AS category_name, c.color AS category_color
             FROM {$wpdb->prefix}lsfh_expenditures e
             LEFT JOIN {$wpdb->prefix}lsfh_budget_categories c ON c.id = e.category_id
             WHERE e.id = %d",
				$id
			)
		);
		if ( ! $row ) {
			return null;
		}
		$row->amount                = (float) $row->amount;
		$row->balanced              = (bool) $row->balanced;
		$row->status                = self::expenditure_status( $row->expense_date, $row->date_posted );
		$row->is_future             = (bool) ( $row->expense_date && $row->expense_date > current_time( 'Y-m-d' ) );
		$row->receipt_attachment_id = $row->receipt_attachment_id ? (int) $row->receipt_attachment_id : null;
		if ( $row->receipt_attachment_id ) {
			$row->receipt_url_resolved = wp_get_attachment_url( $row->receipt_attachment_id ) ?: $row->receipt_url;
		}
		return $row;
	}

	/**
	 * Delete an expenditure.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function delete_expenditure( WP_REST_Request $req ) {
		global $wpdb;
		$id = (int) $req->get_param( 'id' );
		$wpdb->delete( $wpdb->prefix . 'lsfh_expenditures', array( 'id' => $id ), array( '%d' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		return rest_ensure_response( array( 'deleted' => $id ) );
	}

	/**
	 * Delete several expenditures.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function bulk_delete_expenditures( WP_REST_Request $req ) {
		global $wpdb;
		$ids = array_values( array_filter( array_map( 'absint', (array) ( $req->get_json_params()['ids'] ?? array() ) ) ) );
		if ( ! $ids ) {
			return rest_ensure_response( array( 'deleted' => 0 ) );
		}
		$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$deleted = $wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->prefix}lsfh_expenditures WHERE id IN ($placeholders)", ...$ids ) );
		return rest_ensure_response( array( 'deleted' => (int) $deleted ) );
	}

	/**
	 * Change the category, payment method or balanced flag on several expenditures at once.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function bulk_update_expenditures( WP_REST_Request $req ) {
		global $wpdb;
		$params = $req->get_json_params() ?? array();
		$ids    = array_values( array_filter( array_map( 'absint', (array) ( $params['ids'] ?? array() ) ) ) );
		if ( ! $ids ) {
			return new WP_Error( 'missing', 'No IDs provided.', array( 'status' => 400 ) );
		}

		$data = array();
		// category_id: 0 = clear (NULL), positive int = set, absent = skip.
		if ( array_key_exists( 'category_id', $params ) ) {
			$cat                 = $params['category_id'];
			$data['category_id'] = ( null === $cat || 0 === (int) $cat ) ? null : absint( $cat );
		}
		// payment_method: non-empty string = set, absent = skip.
		if ( isset( $params['payment_method'] ) && '' !== $params['payment_method'] ) {
			$data['payment_method'] = sanitize_key( $params['payment_method'] );
		}
		// balanced: true/false = set, absent = skip.
		if ( array_key_exists( 'balanced', $params ) ) {
			$data['balanced'] = $params['balanced'] ? 1 : 0;
		}

		if ( ! $data ) {
			return new WP_Error( 'nothing', 'No fields to update.', array( 'status' => 400 ) );
		}

		$data['updated_at'] = current_time( 'mysql' );

		// Build a single UPDATE ... WHERE id IN (...) instead of one query per row.
		$set_parts = array();
		$set_vals  = array();
		foreach ( $data as $col => $val ) {
			$safe_col = sanitize_key( $col );
			if ( is_null( $val ) ) {
				$set_parts[] = "`$safe_col` = NULL";
			} elseif ( is_int( $val ) ) {
				$set_parts[] = "`$safe_col` = %d";
				$set_vals[]  = $val;
			} else {
				$set_parts[] = "`$safe_col` = %s";
				$set_vals[]  = $val;
			}
		}
		$set_sql      = implode( ', ', $set_parts );
		$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$updated = (int) $wpdb->query(
			$wpdb->prepare( "UPDATE {$wpdb->prefix}lsfh_expenditures SET $set_sql WHERE id IN ($placeholders)", ...array_merge( $set_vals, $ids ) )
		);
		// phpcs:enable
		return rest_ensure_response( array( 'updated' => $updated ) );
	}

	/**
	 * Upload a receipt image or PDF to the Media Library, shrinking large images.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function upload_receipt( WP_REST_Request $req ) {
		// REST authenticates with the permission_callback, so no nonce check is needed here.
		// The file must be a genuine PHP upload, not just a path someone typed into the request.
		$file = ( isset( $_FILES['receipt'] ) && is_array( $_FILES['receipt'] ) ) ? $_FILES['receipt'] : null; // phpcs:ignore WordPress.Security.NonceVerification.Missing,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- checked below and handed to media_handle_upload().
		if ( ! $file || empty( $file['tmp_name'] ) || ! is_string( $file['tmp_name'] ) || ! is_uploaded_file( $file['tmp_name'] ) ) {
			return new WP_Error( 'no_file', 'No file uploaded.', array( 'status' => 400 ) );
		}

		// ── File size cap (10 MB) ─────────────────────────────────────────
		if ( (int) ( $file['size'] ?? 0 ) > 10 * 1024 * 1024 ) {
			return new WP_Error( 'file_too_large', 'Receipt must be under 10 MB.', array( 'status' => 413 ) );
		}

		// ── Server-side MIME validation ───────────────────────────────────
		$allowed_mimes = array( 'image/jpeg', 'image/png', 'application/pdf' );
		$detected_mime = mime_content_type( $file['tmp_name'] );
		if ( ! in_array( $detected_mime, $allowed_mimes, true ) ) {
			return new WP_Error( 'invalid_type', 'Only JPEG, PNG, and PDF files are accepted.', array( 'status' => 415 ) );
		}

		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		// Restrict WP allowed MIME types to receipt formats for this upload only.
		$mime_filter = static function () {
			return array(
				'jpg|jpeg|jpe' => 'image/jpeg',
				'png'          => 'image/png',
				'pdf'          => 'application/pdf',
			);
		};
		add_filter( 'upload_mimes', $mime_filter, 99 );
		$id = media_handle_upload( 'receipt', 0 );
		remove_filter( 'upload_mimes', $mime_filter, 99 );

		if ( is_wp_error( $id ) ) {
			return $id;
		}

		// ── Image compression: resize to ≤1500px, save at 85% quality ────
		if ( in_array( $detected_mime, array( 'image/jpeg', 'image/png' ), true ) ) {
			$path   = get_attached_file( $id );
			$editor = wp_get_image_editor( $path );
			if ( ! is_wp_error( $editor ) ) {
				$size = $editor->get_size();
				if ( $size['width'] > 1500 || $size['height'] > 1500 ) {
					$editor->resize( 1500, 1500, false ); // maintain aspect ratio, no crop.
				}
				$editor->set_quality( 85 );
				$saved = $editor->save( $path ); // overwrite original in place.
				if ( ! is_wp_error( $saved ) ) {
					wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $path ) );
				}
			}
		}

		return rest_ensure_response(
			array(
				'attachment_id' => $id,
				'url'           => wp_get_attachment_url( $id ),
			)
		);
	}

	/**
	 * Clean the fields of an expenditure from a request body.
	 *
	 * @param array $p Request body.
	 * @return array Every field, with defaults for those not supplied.
	 */
	public static function sanitize_expenditure( array $p ): array {
		return array(
			'expense_date'          => sanitize_text_field( $p['expense_date'] ?? '' ) ?: null,
			'date_posted'           => sanitize_text_field( $p['date_posted'] ?? '' ) ?: null,
			'payee'                 => sanitize_text_field( $p['payee'] ?? '' ),
			'address'               => sanitize_text_field( $p['address'] ?? '' ),
			'category_id'           => isset( $p['category_id'] ) && $p['category_id'] ? (int) $p['category_id'] : null,
			'description'           => sanitize_textarea_field( $p['description'] ?? '' ),
			'amount'                => (float) ( $p['amount'] ?? 0 ),
			'payment_method'        => sanitize_text_field( $p['payment_method'] ?? 'check' ),
			'check_number'          => sanitize_text_field( $p['check_number'] ?? '' ),
			'receipt_attachment_id' => isset( $p['receipt_attachment_id'] ) && $p['receipt_attachment_id'] ? (int) $p['receipt_attachment_id'] : null,
			'receipt_url'           => esc_url_raw( $p['receipt_url'] ?? '' ),
			'balanced'              => (int) (bool) ( $p['balanced'] ?? false ),
			'paid_by'               => sanitize_text_field( $p['paid_by'] ?? '' ),
			'notes'                 => sanitize_textarea_field( $p['notes'] ?? '' ),
			'filing_period_id'      => isset( $p['filing_period_id'] ) && $p['filing_period_id'] ? (int) $p['filing_period_id'] : null,
		);
	}

	/**
	 * What a route that looks up expenses by check number accepts.
	 *
	 * @return array
	 */
	public static function by_check_args() {
		return array(
			'number'  => array(
				'type'              => 'string',
				'required'          => true,
				'minLength'         => 1,
				'maxLength'         => 50,
				'validate_callback' => 'rest_validate_request_arg',
				'sanitize_callback' => 'sanitize_text_field',
			),
			// phpcs:ignore WordPressVIPMinimum.Performance.WPQueryParams.PostNotIn_exclude -- A REST argument name, not a query parameter.
			'exclude' => array(
				'type'              => 'integer',
				'default'           => 0,
				'minimum'           => 0,
				'validate_callback' => 'rest_validate_request_arg',
				'sanitize_callback' => 'absint',
			),
		);
	}

	/**
	 * The other expenses written on the same check number, so the expense form can say what a check also covers.
	 *
	 * @param WP_REST_Request $req Request: number, and exclude (an expense id to leave out, the one being edited).
	 * @return WP_REST_Response
	 */
	public static function expenses_by_check( WP_REST_Request $req ) {
		global $wpdb;
		$rows  = (array) $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prepare(
				"SELECT id, payee, amount, expense_date FROM {$wpdb->prefix}lsfh_expenditures WHERE check_number = %s AND id <> %d ORDER BY expense_date, id LIMIT 20",
				$req['number'],
				$req['exclude']
			),
			ARRAY_A
		);
		$total = 0.0;
		foreach ( $rows as &$row ) {
			$row['id']     = (int) $row['id'];
			$row['amount'] = (float) $row['amount'];
			$total        += $row['amount'];
		}
		unset( $row );
		return rest_ensure_response(
			array(
				'data'  => $rows,
				'total' => round( $total, 2 ),
			)
		);
	}
}
