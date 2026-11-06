<?php
/**
 * Donation routes: list, add, edit, delete, split, bulk actions, unitemized allocation, and the search filter the exports share.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Donation routes: list, add, edit, delete, split, bulk actions, unitemized allocation, and the search filter the exports share.
 */
class LSFH_Donations_Controller extends LSFH_REST_Base {

	/**
	 * Distinct PAC names for the response header.
	 *
	 * $pac_names holds one entry per PAC ROW, so the same handful of
	 * committee names repeat once per contribution — 102 entries for 3 names in
	 * testing, and a projected 35 KB header at 107k contributions. HTTP servers
	 * commonly cap headers near 8 KB, so at scale the response would have been
	 * truncated or rejected outright. The row count travels separately in
	 * X-LSFH-PAC-Rows, which is what the UI actually reports.
	 *
	 * @param array $pacs One entry per PAC row.
	 * @return array Distinct names, re-indexed so wp_json_encode emits an array.
	 */
	public static function unique_pacs( $pacs ) {
		return array_values( array_unique( $pacs ) );
	}

	/**
	 * Is this organisation name a PAC?
	 *
	 * Matches "PAC" as a whole word only. The old test was a bare
	 * stripos( $name, 'pac' ), which also fired on Impact, Pacific, Compact
	 * and Pacheco — and back when a match meant the row was dropped from the
	 * filing, a donor called "Impact Fund" would have disappeared with no
	 * warning. Nothing is dropped now, so a false positive would only
	 * mislabel a count, but the boundary is still what was meant.
	 *
	 * @param string $name Organisation name, already tn_clean()ed.
	 * @return bool
	 */
	public static function is_pac_name( $name ) {
		return (bool) preg_match( '/(^|[^a-z])pac([^a-z]|$)/i', (string) $name );
	}

	/**
	 * Cast a donation row's fields to their proper types.
	 *
	 * @param object $row Donation row from the database.
	 * @return object
	 */
	public static function donation_row( $row ) {
		$row->id               = (int) $row->id;
		$row->gross_amount     = (float) $row->gross_amount;
		$row->actblue_fee      = (float) $row->actblue_fee;
		$row->net_amount       = (float) $row->net_amount;
		$row->recurring        = (bool) $row->recurring;
		$row->balanced         = (bool) $row->balanced;
		$row->event_id         = $row->event_id ? (int) $row->event_id : null;
		$row->filing_period_id = $row->filing_period_id ? (int) $row->filing_period_id : null;
		$row->refund_of_id     = $row->refund_of_id ? (int) $row->refund_of_id : null;
		return $row;
	}

	/**
	 * Build the WHERE conditions for the donation filters.
	 *
	 * Each condition's value is added to $values, in order, ready for $wpdb->prepare().
	 *
	 * @param WP_REST_Request $req Request.
	 * @param array           $values Placeholder values, added to in order.
	 * @return string[] Conditions to join with AND.
	 */
	public static function build_donation_where( WP_REST_Request $req, array &$values ) {
		$wheres = array();
		global $wpdb;

		$date_from  = sanitize_text_field( $req->get_param( 'date_from' ) ?? '' );
		$date_to    = sanitize_text_field( $req->get_param( 'date_to' ) ?? '' );
		$election   = sanitize_text_field( $req->get_param( 'election_type' ) ?? '' );
		$rtype      = sanitize_text_field( $req->get_param( 'report_type' ) ?? '' );
		$rstatus    = sanitize_text_field( $req->get_param( 'reporting_status' ) ?? '' );
		$source     = sanitize_text_field( $req->get_param( 'source' ) ?? '' );
		$state      = strtoupper( sanitize_text_field( $req->get_param( 'state' ) ?? '' ) );
		$city       = sanitize_text_field( $req->get_param( 'city' ) ?? '' );
		$zip        = sanitize_text_field( $req->get_param( 'zip' ) ?? '' );
		$disb_id    = sanitize_text_field( $req->get_param( 'disbursement_id' ) ?? '' );
		$fpage      = sanitize_text_field( $req->get_param( 'fundraising_page' ) ?? '' );
		$balanced   = $req->get_param( 'balanced' );
		$period     = $req->get_param( 'filing_period_id' );
		$search     = sanitize_text_field( $req->get_param( 'search' ) ?? '' );
		$amt_min    = sanitize_text_field( $req->get_param( 'amount_min' ) ?? '' );
		$amt_max    = sanitize_text_field( $req->get_param( 'amount_max' ) ?? '' );
		$has_refund = (bool) $req->get_param( 'has_refund' );

		if ( $date_from ) {
			$wheres[] = 'contribution_date >= %s';
			$values[] = $date_from;
		}
		if ( $date_to ) {
			$wheres[] = 'contribution_date <= %s';
			$values[] = $date_to;
		}
		if ( $election ) {
			$wheres[] = 'election_type = %s';
			$values[] = $election;
		}
		if ( $rtype ) {
			$wheres[] = 'report_type = %s';
			$values[] = $rtype;
		}
		if ( $rstatus ) {
			$wheres[] = 'reporting_status = %s';
			$values[] = $rstatus;
		}
		if ( $source ) {
			$wheres[] = 'source = %s';
			$values[] = $source;
		}
		if ( $state ) {
			$wheres[] = 'state = %s';
			$values[] = $state;
		}
		if ( $city ) {
			$wheres[] = 'city LIKE %s';
			$values[] = '%' . $wpdb->esc_like( $city ) . '%';
		}
		if ( $zip ) {
			$wheres[] = '(zip LIKE %s OR zip_formatted LIKE %s)';
			$zl       = '%' . $wpdb->esc_like( $zip ) . '%';
			$values[] = $zl;
			$values[] = $zl;
		}
		if ( $disb_id ) {
			$wheres[] = 'disbursement_id = %s';
			$values[] = $disb_id;
		}
		if ( $fpage ) {
			$wheres[] = 'fundraising_page = %s';
			$values[] = $fpage;
		}
		if ( $period ) {
			$wheres[] = 'filing_period_id = %d';
			$values[] = (int) $period;
		}
		// Amount range — reject non-numeric input instead of silently casting it to 0
		// (which would produce a near-no-op filter with no indication anything was
		// wrong), clamp negatives to 0 (a minimum/maximum contribution below $0 has
		// no meaning here and would otherwise let a negative "minimum" quietly admit
		// refund rows), and swap min/max if entered backwards so the filter doesn't
		// silently return zero rows instead of the range the user meant.
		$amt_min = ( '' !== $amt_min && is_numeric( $amt_min ) ) ? max( 0.0, (float) $amt_min ) : null;
		$amt_max = ( '' !== $amt_max && is_numeric( $amt_max ) ) ? max( 0.0, (float) $amt_max ) : null;
		if ( null !== $amt_min && null !== $amt_max && $amt_min > $amt_max ) {
			[ $amt_min, $amt_max ] = array( $amt_max, $amt_min );
		}
		if ( null !== $amt_min ) {
			// Refund rows carry a negative gross_amount, so a positive minimum would
			// otherwise exclude them even when has_refund explicitly asked to surface
			// refund activity alongside the contributions it applies to.
			$wheres[] = $has_refund ? '(gross_amount >= %f OR gross_amount < 0)' : 'gross_amount >= %f';
			$values[] = $amt_min;
		}
		if ( null !== $amt_max ) {
			$wheres[] = 'gross_amount <= %f';
			$values[] = $amt_max;
		}
		if ( $has_refund ) {
			// Show both the original donations that have refunds AND the refund rows themselves.
			$td_sub   = $wpdb->prefix . 'lsfh_donations';
			$wheres[] = "(id IN (SELECT DISTINCT refund_of_id FROM $td_sub WHERE refund_of_id IS NOT NULL AND refund_of_id > 0) OR refund_of_id IS NOT NULL)"; // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		}
		if ( null !== $balanced && '' !== $balanced ) {
			$wheres[] = 'balanced = %d';
			$values[] = (int) (bool) $balanced;
		}
		if ( $search ) {
			$like     = '%' . $wpdb->esc_like( $search ) . '%';
			$amount   = self::search_amount( $search );
			$name_sql = 'first_name LIKE %s OR last_name LIKE %s OR CONCAT(first_name," ",last_name) LIKE %s';
			$values[] = $like;
			$values[] = $like;
			$values[] = $like;
			// An order number as ActBlue prints it (AB402867556) also finds the contribution with that receipt number. The
			// receipt is stored as the file wrote it, letters included, so the digits alone match it too.
			$receipt = self::search_receipt( $search );
			if ( $receipt ) {
				$name_sql .= ' OR actblue_id = %s OR actblue_id LIKE %s';
				$values[]  = $receipt['typed'];
				$values[]  = '%' . $wpdb->esc_like( $receipt['digits'] );
			}
			if ( null === $amount ) {
				$wheres[] = "($name_sql)";
			} else {
				// A number also matches a gift of that amount, gross or net, refunds included.
				$wheres[] = "($name_sql OR ROUND(ABS(gross_amount),2) = %f OR ROUND(ABS(net_amount),2) = %f)";
				$values[] = $amount;
				$values[] = $amount;
			}
		}
		return $wheres;
	}

	/**
	 * Read a search box entry as a receipt (order) number, so the number ActBlue shows on a refund screen finds the gift.
	 *
	 * @param string $search What was typed.
	 * @return array{typed: string, digits: string}|null The entry without spaces and its digits, or null when the text
	 *         does not look like a receipt number (up to three letters, then six or more digits).
	 */
	private static function search_receipt( $search ) {
		$clean = preg_replace( '/[\s#-]/', '', $search );
		if ( ! preg_match( '/^[A-Za-z]{0,3}(\d{6,})$/', $clean, $m ) ) {
			return null;
		}
		return array(
			'typed'  => $clean,
			'digits' => $m[1],
		);
	}

	/**
	 * List the distinct fundraising pages on donations, for the filter dropdown.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function list_fundraising_pages( WP_REST_Request $req ) {
		global $wpdb;
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_col(
			"SELECT DISTINCT fundraising_page FROM {$wpdb->prefix}lsfh_donations
             WHERE fundraising_page IS NOT NULL AND fundraising_page <> ''
             ORDER BY fundraising_page ASC"
		);
		// phpcs:enable
		return rest_ensure_response( $rows );
	}

	/**
	 * List donations, with filters, sorting, paging and totals.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function list_donations( WP_REST_Request $req ) {
		global $wpdb;
		$table = $wpdb->prefix . 'lsfh_donations';

		$per_page = self::per_page( $req, 50, 500 );
		$page     = max( 1, (int) ( $req->get_param( 'page' ) ?? 1 ) );
		$offset   = ( $page - 1 ) * $per_page;

		$values    = array();
		$wheres    = self::build_donation_where( $req, $values );
		$where_sql = $wheres ? 'WHERE ' . implode( ' AND ', $wheres ) : '';

		// phpcs:disable WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare
		$total = (int) $wpdb->get_var( self::prepared( "SELECT COUNT(*) FROM $table $where_sql", $values ) );

		// Count only contributions (exclude refund rows) for the export button label.
		// Skip the redundant >= 0 clause when a non-negative amount_min is already
		// applied — it would otherwise duplicate a comparison already enforced by
		// build_donation_where() on every row of this unindexed column.
		$amt_min_check      = $req->get_param( 'amount_min' );
		$skip_ge_zero       = null !== $amt_min_check && '' !== $amt_min_check && is_numeric( $amt_min_check ) && (float) $amt_min_check >= 0;
		$contrib_where      = $skip_ge_zero
			? $where_sql
			: ( $where_sql ? "$where_sql AND gross_amount >= 0" : 'WHERE gross_amount >= 0' );
		$contribution_count = (int) $wpdb->get_var( self::prepared( "SELECT COUNT(*) FROM $table $contrib_where", $values ) );

		// Aggregate totals for the current filter (before adding LIMIT).
		$agg = $wpdb->get_row( self::prepared( "SELECT SUM(gross_amount) AS total_gross, SUM(net_amount) AS total_net, SUM(actblue_fee) AS total_fees FROM $table $where_sql", $values ) );

		$allowed_sort = array( 'contribution_date', 'last_name', 'first_name', 'gross_amount', 'net_amount', 'election_type', 'reporting_status', 'source' );
		$ob           = in_array( $req->get_param( 'orderby' ), $allowed_sort, true ) ? $req->get_param( 'orderby' ) : 'contribution_date';
		$od           = strtoupper( $req->get_param( 'order' ) ?? 'DESC' ) === 'ASC' ? 'ASC' : 'DESC';
		$order        = "$ob $od, id DESC";
		$limit        = 'LIMIT %d OFFSET %d';
		$values[]     = $per_page;
		$values[]     = $offset;

		$rows = $wpdb->get_results(
			$wpdb->prepare( "SELECT * FROM $table $where_sql ORDER BY $order $limit", ...$values )
		);
		// phpcs:enable

		return rest_ensure_response(
			array(
				'total'              => $total,
				'contribution_count' => $contribution_count,
				'pages'              => (int) ceil( $total / $per_page ),
				'page'               => $page,
				'per_page'           => $per_page,
				'total_gross'        => (float) ( $agg->total_gross ?? 0 ),
				'total_net'          => (float) ( $agg->total_net ?? 0 ),
				'total_fees'         => (float) ( $agg->total_fees ?? 0 ),
				'data'               => self::with_bank_status( $rows ),
			)
		);
	}

	/**
	 * Donation rows as the list returns them, each saying whether it is matched to the bank.
	 *
	 * @param object[] $rows Donation rows from the database.
	 * @return object[]
	 */
	private static function with_bank_status( array $rows ) {
		$matched = LSFH_Bank_Status::matched_donations( $rows );
		$out     = array_map( array( __CLASS__, 'donation_row' ), $rows );
		foreach ( $out as $row ) {
			$row->bank_matched = isset( $matched[ $row->id ] );
		}
		return $out;
	}

	/**
	 * Add a donation.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function create_donation( WP_REST_Request $req ) {
		global $wpdb;
		$d = self::sanitize_donation( $req->get_json_params() ?? array() );
		// A refund is NOT deducted from the disbursement that carried the original.
		// It comes out of the next disbursement, or the same one if that lands
		// first, which is a fact about ActBlue's payout timing that we cannot infer
		// here. Inheriting the original's disbursement pulled every later-month
		// refund back into the original month, so the field is left empty for the
		// user to set. refund_of_id still records the link for amendment purposes.
		//
		// The filing period comes from the contribution date right away. Left empty it
		// was only filled in by the next sync, and until then the row was in no period,
		// so a report exported in that window quietly left it out.
		if ( empty( $d['filing_period_id'] ) && ! empty( $d['contribution_date'] ) ) {
			$d['filing_period_id'] = LSFH_Periods::period_for_date( $d['contribution_date'] );
		}
		$d['created_at'] = current_time( 'mysql' );
		$d['updated_at'] = current_time( 'mysql' );

		$fmt = self::donation_formats( $d );
		$ok  = $wpdb->insert( $wpdb->prefix . 'lsfh_donations', $d, $fmt ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		if ( ! $ok ) {
			return new WP_Error( 'db_error', 'Insert failed', array( 'status' => 500 ) );
		}

		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}lsfh_donations WHERE id=%d", $wpdb->insert_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		// A donation (a refund, for example) can change the fees its payout carries.
		LSFH_Payout_Totals::donations_changed( array( (string) $row->disbursement_id ) );
		return rest_ensure_response( self::with_limit_warning( self::donation_row( $row ) ) );
	}

	/**
	 * Add a limit warning to a saved donation when it put the donor over a contribution limit. The donation is saved
	 * either way; the key is added only when there is something to say.
	 *
	 * @param object $row The saved donation, as returned by donation_row().
	 * @return object The same row, with limit_warning (name, election, total, limit) when the donor is over a limit.
	 */
	private static function with_limit_warning( $row ) {
		if ( $row->gross_amount > 0 ) {
			$over = LSFH_Donor_Limits::over( array( (array) $row ) );
			if ( $over ) {
				$row->limit_warning = $over[0];
			}
		}
		return $row;
	}

	/**
	 * Update the fields sent for a donation.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function update_donation( WP_REST_Request $req ) {
		global $wpdb;
		$id     = (int) $req->get_param( 'id' );
		$params = $req->get_json_params() ?? array();
		$all    = self::sanitize_donation( $params );

		// Only write fields that were explicitly present in the request body —
		// the same guard update_expenditure has carried for a while.
		// sanitize_donation() supplies a default for every field it does not
		// find, so without this a partial update silently writes balanced = 0
		// and reporting_status = 'pending' over values the user set by hand
		// after checking a bank statement and filing with the state. Nothing
		// sends a partial body today; this keeps it that way by construction.
		$d = array();
		foreach ( array_keys( $all ) as $key ) {
			if ( array_key_exists( $key, $params ) ) {
				$d[ $key ] = $all[ $key ];
			}
		}
		if ( ! $d ) {
			$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}lsfh_donations WHERE id=%d", $id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			if ( ! $row ) {
				return new WP_Error( 'not_found', 'Donation not found.', array( 'status' => 404 ) );
			}
			return rest_ensure_response( self::donation_row( $row ) );
		}
		// See create_donation: a refund does not belong to the original's
		// disbursement, so clearing the field must not silently restore it.
		$d['updated_at'] = current_time( 'mysql' );

		$payouts_before = LSFH_Payout_Fees::payouts_of_donations( array( $id ) );
		$fmt            = self::donation_formats( $d );
		$wpdb->update( $wpdb->prefix . 'lsfh_donations', $d, array( 'id' => $id ), $fmt, array( '%d' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}lsfh_donations WHERE id=%d", $id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		if ( ! $row ) {
			return new WP_Error( 'not_found', 'Donation not found.', array( 'status' => 404 ) );
		}
		// The payout it was in and the payout it is in now may carry different fees.
		LSFH_Payout_Totals::donations_changed( array_merge( $payouts_before, array( (string) $row->disbursement_id ) ) );
		$row = self::donation_row( $row );
		// Only an edit that can change a donor's total says anything about a limit; a note or a status does not.
		if ( array_intersect_key( $d, array_flip( array( 'gross_amount', 'election_type', 'first_name', 'last_name' ) ) ) ) {
			$row = self::with_limit_warning( $row );
		}
		return rest_ensure_response( $row );
	}

	/**
	 * Get one donation.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function get_donation( WP_REST_Request $req ) {
		global $wpdb;
		$id  = (int) $req->get_param( 'id' );
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}lsfh_donations WHERE id=%d", $id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		if ( ! $row ) {
			return new WP_Error( 'not_found', 'Donation not found.', array( 'status' => 404 ) );
		}
		return rest_ensure_response( self::donation_row( $row ) );
	}

	/**
	 * Delete a donation.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function delete_donation( WP_REST_Request $req ) {
		global $wpdb;
		$id      = (int) $req->get_param( 'id' );
		$payouts = LSFH_Payout_Fees::payouts_of_donations( array( $id ) );
		$wpdb->delete( $wpdb->prefix . 'lsfh_donations', array( 'id' => $id ), array( '%d' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		LSFH_Payout_Totals::donations_changed( $payouts );
		return rest_ensure_response( array( 'deleted' => $id ) );
	}

	/**
	 * Split a donation between two elections.
	 *
	 * The two amounts must add up to the original, and both parts are saved or neither.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function split_donation( WP_REST_Request $req ) {
		global $wpdb;
		$id     = (int) $req->get_param( 'id' );
		$params = $req->get_json_params() ?? array();

		$p_amount = round( (float) ( $params['primary_amount'] ?? 0 ), 2 );
		$g_amount = round( (float) ( $params['general_amount'] ?? 0 ), 2 );
		$p_elec   = strtolower( sanitize_text_field( $params['primary_election'] ?? 'primary' ) );
		$g_elec   = strtolower( sanitize_text_field( $params['general_election'] ?? 'general' ) );
		if ( ! in_array( $p_elec, LSFH_Period_Elections::TYPES, true ) || ! in_array( $g_elec, LSFH_Period_Elections::TYPES, true ) ) {
			return new WP_Error( 'invalid_election', 'Choose a valid election for each part of the split.', array( 'status' => 400 ) );
		}

		if ( $p_amount <= 0 || $g_amount <= 0 ) {
			return new WP_Error( 'invalid_amounts', 'Both amounts must be greater than zero.', array( 'status' => 400 ) );
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$orig = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}lsfh_donations WHERE id=%d", $id ) );
		if ( ! $orig ) {
			return new WP_Error( 'not_found', 'Donation not found.', array( 'status' => 404 ) );
		}

		$total = round( (float) $orig->gross_amount, 2 );
		if ( abs( ( $p_amount + $g_amount ) - $total ) > 0.02 ) {
			return new WP_Error( 'amount_mismatch', 'Split amounts must sum to the original gross amount.', array( 'status' => 400 ) );
		}

		$now = current_time( 'mysql' );

		// All-or-nothing: the original is cut down first and the second part added after,
		// so a failure in between used to leave the donation reduced with no matching row.
		$wpdb->query( 'START TRANSACTION' ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching

		// Update original record — primary portion.
		$updated = $wpdb->update( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prefix . 'lsfh_donations',
			array(
				'gross_amount'  => $p_amount,
				'net_amount'    => $p_amount - (float) $orig->actblue_fee,
				'election_type' => $p_elec,
				'updated_at'    => $now,
			),
			array( 'id' => $id ),
			array( '%f', '%f', '%s', '%s' ),
			array( '%d' )
		);
		if ( false === $updated ) {
			$wpdb->query( 'ROLLBACK' ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			return new WP_Error( 'update_failed', 'Failed to update the original donation.', array( 'status' => 500 ) );
		}

		// Build general portion — copy all donor/date fields, override amounts and election.
		$new = array(
			'source'            => $orig->source,
			'actblue_id'        => null,
			'first_name'        => $orig->first_name,
			'last_name'         => $orig->last_name,
			'donor_type'        => $orig->donor_type,
			'org_type'          => $orig->org_type,
			'address'           => $orig->address,
			'city'              => $orig->city,
			'state'             => $orig->state,
			'zip'               => $orig->zip,
			'zip_formatted'     => $orig->zip_formatted,
			'occupation'        => $orig->occupation,
			'employer'          => $orig->employer,
			'email'             => $orig->email,
			'phone'             => $orig->phone,
			'contribution_date' => $orig->contribution_date,
			'date_deposited'    => $orig->date_deposited,
			'gross_amount'      => $g_amount,
			'actblue_fee'       => 0,
			'net_amount'        => $g_amount,
			'payment_type'      => $orig->payment_type,
			'check_number'      => $orig->check_number,
			'election_type'     => $g_elec,
			'report_type'       => $orig->report_type,
			'reporting_status'  => $orig->reporting_status,
			'filing_period_id'  => $orig->filing_period_id,
			'disbursement_id'   => $orig->disbursement_id,
			'notes'             => $orig->notes ? $orig->notes . ' [split from #' . $id . ']' : '[split from #' . $id . ']',
			'created_at'        => $now,
			'updated_at'        => $now,
		);

		$ok     = $wpdb->insert( $wpdb->prefix . 'lsfh_donations', $new ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$new_id = $wpdb->insert_id;
		if ( ! $ok || ! $new_id ) {
			$wpdb->query( 'ROLLBACK' ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			return new WP_Error( 'insert_failed', 'Failed to create the split donation.', array( 'status' => 500 ) );
		}

		// Back-annotate the original record now that we have the new ID.
		$orig_note = $orig->notes ? $orig->notes . ' [split: #' . $new_id . ']' : '[split: #' . $new_id . ']';
		$wpdb->update( $wpdb->prefix . 'lsfh_donations', array( 'notes' => $orig_note ), array( 'id' => $id ), array( '%s' ), array( '%d' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query( 'COMMIT' ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching

		// Return both updated rows.
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$row_a = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}lsfh_donations WHERE id=%d", $id ) );
		$row_b = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}lsfh_donations WHERE id=%d", $new_id ) );
		// phpcs:enable
		return rest_ensure_response(
			array(
				'primary' => self::donation_row( $row_a ),
				'general' => self::donation_row( $row_b ),
			)
		);
	}

	/**
	 * Apply one action (report type, status, election, balanced or delete) to many donations.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function bulk_donations( WP_REST_Request $req ) {
		global $wpdb;
		$params = $req->get_json_params() ?? array();
		$ids    = array_map( 'intval', (array) ( $params['ids'] ?? array() ) );
		if ( empty( $ids ) ) {
			return rest_ensure_response( array( 'updated' => 0 ) );
		}

		$action = sanitize_text_field( $params['action'] ?? '' );
		$data   = array();
		$fmt    = array();

		switch ( $action ) {
			case 'itemized':
				$data = array(
					'report_type' => 'itemized',
					'updated_at'  => current_time( 'mysql' ),
				);
				$fmt  = array( '%s', '%s' );
				break;
			case 'unitemized':
				$data = array(
					'report_type' => 'unitemized',
					'updated_at'  => current_time( 'mysql' ),
				);
				$fmt  = array( '%s', '%s' );
				break;
			case 'filed':
				$data = array(
					'reporting_status' => 'filed',
					'updated_at'       => current_time( 'mysql' ),
				);
				$fmt  = array( '%s', '%s' );
				break;
			case 'pending':
				$data = array(
					'reporting_status' => 'pending',
					'updated_at'       => current_time( 'mysql' ),
				);
				$fmt  = array( '%s', '%s' );
				break;
			case 'balanced':
				$data = array(
					'balanced'   => 1,
					'updated_at' => current_time( 'mysql' ),
				);
				$fmt  = array( '%d', '%s' );
				break;
			case 'unbalanced':
				$data = array(
					'balanced'   => 0,
					'updated_at' => current_time( 'mysql' ),
				);
				$fmt  = array( '%d', '%s' );
				break;
			case 'delete':
				$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
				$payouts      = LSFH_Payout_Fees::payouts_of_donations( $ids );
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,PluginCheck.Security.DirectDB.UnescapedDBParameter
				$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->prefix}lsfh_donations WHERE id IN ($placeholders)", ...$ids ) );
				LSFH_Payout_Totals::donations_changed( $payouts );
				return rest_ensure_response( array( 'deleted' => count( $ids ) ) );
			default:
				// An election name sets the election of the chosen donations.
				if ( ! in_array( $action, LSFH_Period_Elections::TYPES, true ) ) {
					return new WP_Error( 'invalid_action', 'Unknown bulk action', array( 'status' => 400 ) );
				}
				$data = array(
					'election_type' => $action,
					'updated_at'    => current_time( 'mysql' ),
				);
				$fmt  = array( '%s', '%s' );
		}

		// Build SET clause with %s placeholders; IN clause uses %d placeholders for IDs.
		$set_phs = implode( ', ', array_map( fn( $k ) => "$k = %s", array_keys( $data ) ) );
		$id_phs  = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
		$args    = array_merge( array_values( $data ), $ids );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$wpdb->query( $wpdb->prepare( "UPDATE {$wpdb->prefix}lsfh_donations SET $set_phs WHERE id IN ($id_phs)", ...$args ) );
		return rest_ensure_response( array( 'updated' => count( $ids ) ) );
	}

	/**
	 * Mark a period's smallest contributions as unitemized, up to the state's total, and the rest as itemized.
	 *
	 * Pass preview to see the result without saving.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 *
	 * Greedy algorithm: pick the smallest eligible donations (gross below the threshold) in the
	 * given filing period, ascending by amount, until the running total reaches the maximum
	 * (default $2,000). Selected donations become unitemized; the rest become itemized. Pass
	 * preview=true to dry-run and get counts without writing anything.
	 */
	public static function allocate_unitemized( WP_REST_Request $req ) {
		global $wpdb;
		$p         = $req->get_json_params() ?? array();
		$period_id = isset( $p['filing_period_id'] ) ? (int) $p['filing_period_id'] : 0;
		$preview   = ! empty( $p['preview'] );
		$max_total = isset( $p['max_total'] ) ? (float) $p['max_total'] : 2000.0;
		$threshold = (float) get_option( 'lsfh_unitemized_threshold', 100 );
		if ( $threshold <= 0 ) {
			$threshold = 100.0; // guard: option exists but was saved as 0.
		}

		if ( ! $period_id ) {
			return new WP_Error( 'missing_period', 'filing_period_id is required', array( 'status' => 400 ) );
		}

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$period_name = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT name FROM {$wpdb->prefix}lsfh_filing_periods WHERE id = %d",
				$period_id
			)
		);

		// All positive donations under the threshold in this period, smallest first.
		$eligible = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT id, gross_amount FROM {$wpdb->prefix}lsfh_donations
             WHERE filing_period_id = %d AND gross_amount > 0 AND gross_amount < %f
             ORDER BY gross_amount ASC, id ASC",
				$period_id,
				$threshold
			)
		);

		$running        = 0.0;
		$unitemized_ids = array();
		$itemized_ids   = array();
		foreach ( $eligible as $r ) {
			$amt = (float) $r->gross_amount;
			if ( round( $running + $amt, 2 ) <= $max_total ) {
				$unitemized_ids[] = (int) $r->id;
				$running          = round( $running + $amt, 2 );
			} else {
				$itemized_ids[] = (int) $r->id;
			}
		}

		// A gift that is refunded is reported at what was given and the refund on its own, but the unitemized total a
		// person compares with the books is net of those refunds, so say both.
		$refunded = 0.0;
		if ( $unitemized_ids ) {
			$phs      = implode( ',', array_fill( 0, count( $unitemized_ids ), '%d' ) );
			$refunded = abs( (float) $wpdb->get_var( $wpdb->prepare( "SELECT COALESCE(SUM(gross_amount), 0) FROM {$wpdb->prefix}lsfh_donations WHERE gross_amount < 0 AND refund_of_id IN ($phs)", $unitemized_ids ) ) );
		}

		if ( ! $preview ) {
			$now = current_time( 'mysql' );
			if ( $unitemized_ids ) {
				$phs = implode( ',', array_fill( 0, count( $unitemized_ids ), '%d' ) );
				$wpdb->query(
					$wpdb->prepare(
						"UPDATE {$wpdb->prefix}lsfh_donations SET report_type='unitemized', updated_at=%s WHERE id IN ($phs)",
						array_merge( array( $now ), $unitemized_ids )
					)
				);
			}
			if ( $itemized_ids ) {
				$phs = implode( ',', array_fill( 0, count( $itemized_ids ), '%d' ) );
				$wpdb->query(
					$wpdb->prepare(
						"UPDATE {$wpdb->prefix}lsfh_donations SET report_type='itemized', updated_at=%s WHERE id IN ($phs)",
						array_merge( array( $now ), $itemized_ids )
					)
				);
			}
		}
		// phpcs:enable

		return rest_ensure_response(
			array(
				'period_name'         => $period_name,
				'eligible_count'      => count( $eligible ),
				'unitemized_count'    => count( $unitemized_ids ),
				'unitemized_total'    => $running,
				'unitemized_refunded' => round( $refunded, 2 ),
				'unitemized_net'      => round( $running - $refunded, 2 ),
				'itemized_count'      => count( $itemized_ids ),
				'max_total'           => $max_total,
				'threshold'           => $threshold,
				'preview'             => $preview,
			)
		);
	}

	/**
	 * Clean the fields of a donation from a request body.
	 *
	 * @param array $p Request body.
	 * @return array Every field, with defaults for those not supplied.
	 */
	public static function sanitize_donation( array $p ): array {
		return array(
			'source'            => sanitize_text_field( $p['source'] ?? 'manual' ),
			'actblue_id'        => sanitize_text_field( $p['actblue_id'] ?? '' ) ?: null,
			'first_name'        => sanitize_text_field( $p['first_name'] ?? '' ),
			'last_name'         => sanitize_text_field( $p['last_name'] ?? '' ),
			'address'           => sanitize_text_field( $p['address'] ?? '' ),
			'city'              => sanitize_text_field( $p['city'] ?? '' ),
			'state'             => strtoupper( substr( sanitize_text_field( $p['state'] ?? '' ), 0, 2 ) ),
			'zip'               => sanitize_text_field( $p['zip'] ?? '' ),
			'zip_formatted'     => sanitize_text_field( $p['zip_formatted'] ?? '' ),
			'occupation'        => sanitize_text_field( $p['occupation'] ?? '' ),
			'employer'          => sanitize_text_field( $p['employer'] ?? '' ),
			'disbursement_id'   => sanitize_text_field( $p['disbursement_id'] ?? '' ) ?: null,
			'refund_of_id'      => isset( $p['refund_of_id'] ) && $p['refund_of_id'] ? (int) $p['refund_of_id'] : null,
			'disbursement_date' => sanitize_text_field( $p['disbursement_date'] ?? '' ) ?: null,
			'payment_date'      => sanitize_text_field( $p['payment_date'] ?? '' ) ?: null,
			'fundraising_page'  => sanitize_text_field( $p['fundraising_page'] ?? '' ) ?: null,
			'reference_code'    => sanitize_text_field( $p['reference_code'] ?? '' ) ?: null,
			'phone'             => sanitize_text_field( $p['phone'] ?? '' ),
			'email'             => sanitize_email( $p['email'] ?? '' ),
			// The ?? guarded the in_array() test but not the branch that used
			// the value, so any body omitting donor_type raised a warning.
			'donor_type'        => in_array( $p['donor_type'] ?? 'individual', array( 'individual', 'organization' ), true ) ? ( $p['donor_type'] ?? 'individual' ) : 'individual',
			'org_type'          => LSFH_Org_Types::clean( $p['org_type'] ?? '' ),
			'contribution_date' => sanitize_text_field( $p['contribution_date'] ?? '' ) ?: null,
			'date_deposited'    => sanitize_text_field( $p['date_deposited'] ?? '' ) ?: null,
			'gross_amount'      => (float) ( $p['gross_amount'] ?? 0 ),
			'actblue_fee'       => (float) ( $p['actblue_fee'] ?? 0 ),
			'net_amount'        => (float) ( $p['net_amount'] ?? ( ( (float) ( $p['gross_amount'] ?? 0 ) ) - ( (float) ( $p['actblue_fee'] ?? 0 ) ) ) ),
			// 'other', not 'manual': manual is a SOURCE value, and the payment
			// types the form offers are actblue/check/cash/money_order/wire/other.
			'payment_type'      => sanitize_text_field( $p['payment_type'] ?? 'other' ),
			'check_number'      => sanitize_text_field( $p['check_number'] ?? '' ),
			'recurring'         => (int) (bool) ( $p['recurring'] ?? false ),
			'balanced'          => (int) (bool) ( $p['balanced'] ?? false ),
			'event_id'          => isset( $p['event_id'] ) && $p['event_id'] ? (int) $p['event_id'] : null,
			'election_type'     => sanitize_text_field( ( $p['election_type'] ?? '' ) ?: ( LSFH_Periods::period_election_for_date( sanitize_text_field( $p['contribution_date'] ?? '' ) ) ?: 'primary' ) ),
			'report_type'       => sanitize_text_field( $p['report_type'] ?? 'itemized' ),
			'reporting_status'  => sanitize_text_field( $p['reporting_status'] ?? 'pending' ),
			'notes'             => sanitize_textarea_field( $p['notes'] ?? '' ),
			'filing_period_id'  => isset( $p['filing_period_id'] ) && $p['filing_period_id'] ? (int) $p['filing_period_id'] : null,
		);
	}

	/**
	 * The database format code (%s, %d or %f) for each field of a donation.
	 *
	 * @param array $d Donation fields.
	 * @return array
	 */
	public static function donation_formats( array $d ): array {
		$map = array(
			'source'            => '%s',
			'actblue_id'        => '%s',
			'first_name'        => '%s',
			'last_name'         => '%s',
			'address'           => '%s',
			'city'              => '%s',
			'state'             => '%s',
			'zip'               => '%s',
			'zip_formatted'     => '%s',
			'occupation'        => '%s',
			'employer'          => '%s',
			'disbursement_id'   => '%s',
			'refund_of_id'      => '%d',
			'disbursement_date' => '%s',
			'payment_date'      => '%s',
			'fundraising_page'  => '%s',
			'reference_code'    => '%s',
			'phone'             => '%s',
			'email'             => '%s',
			'donor_type'        => '%s',
			'org_type'          => '%s',
			'contribution_date' => '%s',
			'date_deposited'    => '%s',
			'gross_amount'      => '%f',
			'actblue_fee'       => '%f',
			'net_amount'        => '%f',
			'payment_type'      => '%s',
			'check_number'      => '%s',
			'recurring'         => '%d',
			'balanced'          => '%d',
			'event_id'          => '%d',
			'election_type'     => '%s',
			'report_type'       => '%s',
			'reporting_status'  => '%s',
			'notes'             => '%s',
			'filing_period_id'  => '%d',
			'created_at'        => '%s',
			'updated_at'        => '%s',
		);
		return array_map( fn( $k )=>$map[ $k ] ?? '%s', array_keys( $d ) );
	}
}
