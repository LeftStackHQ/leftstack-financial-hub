<?php
/**
 * Disbursement routes: the payout list, editing and deleting a payout, and the ledger rebuild.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Disbursement routes: the payout list, editing and deleting a payout, and the ledger rebuild.
 */
class LSFH_Disbursements_Controller extends LSFH_REST_Base {

	/**
	 * How far along the payouts of one filing period are: how many there are, and how many are balanced, matched to the bank
	 * and filed. The same counts the Disbursements tab shows, without the list.
	 *
	 * @param WP_REST_Request $req Request (filing_period_id).
	 * @return WP_REST_Response total, balanced, matched and filed.
	 */
	public static function progress( WP_REST_Request $req ) {
		return rest_ensure_response( LSFH_Bank_Status::payout_counts( (int) $req->get_param( 'filing_period_id' ) ) );
	}

	/**
	 * List payouts with live totals from their donations, election tallies and amendment counts.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function list_disbursements( WP_REST_Request $req ) {
		global $wpdb;
		$t  = $wpdb->prefix . 'lsfh_actblue_disbursements';
		$td = $wpdb->prefix . 'lsfh_donations';

		$per_page          = self::per_page( $req, 50, 200 );
		$page              = max( 1, (int) ( $req->get_param( 'page' ) ?? 1 ) );
		$offset            = ( $page - 1 ) * $per_page;
		$allowed_disb_sort = array( 'disbursement_date', 'live_gross', 'live_net', 'live_count', 'reconciled', 'filed', 'date_received' );
		// Optional filters: only payouts that are not balanced yet, and only one filing period.
		$period_id = absint( $req->get_param( 'filing_period_id' ) );
		$where     = array();
		$where_val = array();
		if ( 'needs_attention' === $req->get_param( 'status' ) ) {
			$where[] = 'd.reconciled = 0';
		}
		if ( $period_id ) {
			$where[]     = 'd.filing_period_id = %d';
			$where_val[] = $period_id;
		}
		$where_sql = $where ? 'WHERE ' . implode( ' AND ', $where ) : '';
		$disb_ob   = in_array( $req->get_param( 'orderby' ), $allowed_disb_sort, true ) ? $req->get_param( 'orderby' ) : 'disbursement_date';
		$disb_od   = strtoupper( $req->get_param( 'order' ) ?? 'DESC' ) === 'ASC' ? 'ASC' : 'DESC';
		// A payout with no date has not been paid out yet — Democracy Engine
		// leaves "Transmittal Payment Posted On" empty until it posts. MySQL
		// sorts NULL last on a descending sort, so on the default date-desc view
		// those landed on the final page and looked as though the import had
		// never created them. Pending payouts surface first instead. (Ascending
		// already puts NULL first, so it needs no help.).
		$disb_nulls = ( 'disbursement_date' === $disb_ob && 'DESC' === $disb_od )
			? '(d.disbursement_date IS NULL) DESC, '
			: '';

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter,WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT d.*,
                    COALESCE(agg.live_count,0)       AS live_count,
                    COALESCE(agg.live_gross,0)       AS live_gross,
                    COALESCE(agg.live_net,0)         AS live_net,
                    COALESCE(amd.amendment_count,0)  AS amendment_count,
                    COALESCE(amd.amendment_total,0)  AS amendment_total,
                    COALESCE(agg.elec_primary,0)     AS elec_primary,
                    COALESCE(agg.elec_general,0)     AS elec_general,
                    COALESCE(agg.elec_runoff,0)      AS elec_runoff,
                    COALESCE(agg.elec_special,0)     AS elec_special,
                    COALESCE(agg.refund_charge_count,0) AS refund_charge_count,
                    COALESCE(agg.refund_charge_total,0) AS refund_charge_total
                 FROM $t d
                 LEFT JOIN (
                     SELECT disbursement_id,
                         COUNT(CASE WHEN gross_amount >= 0 THEN 1 END) AS live_count,
                         SUM(CASE WHEN gross_amount >= 0 THEN gross_amount ELSE 0 END) AS live_gross,
                         SUM(net_amount) AS live_net,
                         SUM(CASE WHEN gross_amount >= 0 AND election_type = 'primary' THEN 1 ELSE 0 END) AS elec_primary,
                         SUM(CASE WHEN gross_amount >= 0 AND election_type = 'general' THEN 1 ELSE 0 END) AS elec_general,
                         SUM(CASE WHEN gross_amount >= 0 AND election_type = 'runoff'  THEN 1 ELSE 0 END) AS elec_runoff,
                         SUM(CASE WHEN gross_amount >= 0 AND election_type = 'special' THEN 1 ELSE 0 END) AS elec_special,
                         COUNT(CASE WHEN gross_amount < 0 AND (refund_of_id IS NULL OR refund_of_id = 0) THEN 1 END) AS refund_charge_count,
                         SUM(CASE WHEN gross_amount < 0 AND (refund_of_id IS NULL OR refund_of_id = 0) THEN ABS(gross_amount) ELSE 0 END) AS refund_charge_total
                     FROM $td
                     WHERE disbursement_id IS NOT NULL AND disbursement_id != ''
                     GROUP BY disbursement_id
                 ) agg ON agg.disbursement_id = d.disbursement_id
                 LEFT JOIN (
                     SELECT ref.disbursement_id AS ref_disb_id,
                         COUNT(*) AS amendment_count,
                         SUM(ABS(ref.gross_amount)) AS amendment_total
                     FROM $td ref
                     WHERE ref.refund_of_id IS NOT NULL AND ref.refund_of_id > 0
                       AND ref.disbursement_id IS NOT NULL AND ref.disbursement_id != ''
                     GROUP BY ref.disbursement_id
                 ) amd ON amd.ref_disb_id = d.disbursement_id
                 $where_sql
                 ORDER BY $disb_nulls $disb_ob $disb_od, d.id DESC LIMIT %d OFFSET %d",
				...array_merge( $where_val, array( $per_page, $offset ) )
			)
		);

		// Flag deposits that hold donations from a period other than the Filing Period the
		// row shows (Pre-Primary contributions in a deposit that carries another period, a
		// Q2 refund taken out of a Q3 deposit). The totals above still add up everything
		// linked to the deposit, so they match the bank; this only says which other periods'
		// donations are inside it, because those report under their own period. A deposit
		// whose donations all sit in the period it shows is not mixed, however its date falls.
		$other_periods = array();
		$page_ids      = array_values(
			array_filter(
				array_map(
					static function ( $r ) {
						return (string) $r->disbursement_id;
					},
					$rows
				)
			)
		);
		if ( $page_ids ) {
			$fps = $wpdb->get_results( "SELECT id, name, start_date, end_date FROM {$wpdb->prefix}lsfh_filing_periods" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
			$in  = implode( ',', array_fill( 0, count( $page_ids ), '%s' ) );
			// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
			$split        = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT disbursement_id, filing_period_id, COUNT(*) AS cnt, ROUND(SUM(net_amount),2) AS net
                 FROM $td WHERE disbursement_id IN ($in) AND filing_period_id IS NOT NULL
                 GROUP BY disbursement_id, filing_period_id ORDER BY filing_period_id",
					$page_ids
				)
			);
			$period_names = array();
			foreach ( $fps as $fp ) {
				$period_names[ (int) $fp->id ] = $fp->name;
			}
			$paid_in = array();
			foreach ( $rows as $r ) {
				// The period the row shows is the deposit's own; only one that has none (or whose period no longer exists)
				// is placed by its date.
				if ( $r->filing_period_id && isset( $period_names[ (int) $r->filing_period_id ] ) ) {
					$paid_in[ $r->disbursement_id ] = (int) $r->filing_period_id;
					continue;
				}
				foreach ( $fps as $fp ) {
					if ( $r->disbursement_date && $r->disbursement_date >= $fp->start_date && $r->disbursement_date <= $fp->end_date ) {
						$paid_in[ $r->disbursement_id ] = (int) $fp->id;
						break;
					}
				}
			}
			foreach ( $split as $sp ) {
				// A deposit with no period of its own and no payout date yet has nothing to compare against.
				if ( empty( $paid_in[ $sp->disbursement_id ] ) || (int) $sp->filing_period_id === $paid_in[ $sp->disbursement_id ] ) {
					continue;
				}
				$other_periods[ $sp->disbursement_id ][] = array(
					'period' => $period_names[ (int) $sp->filing_period_id ] ?? ( 'Period ' . (int) $sp->filing_period_id ),
					'count'  => (int) $sp->cnt,
					'net'    => (float) $sp->net,
				);
			}
		}

		$total_disb = (int) $wpdb->get_var( $where ? $wpdb->prepare( "SELECT COUNT(*) FROM $t d $where_sql", ...$where_val ) : "SELECT COUNT(*) FROM $t d" );
		$disb_agg   = $wpdb->get_row(
			"SELECT
                COALESCE(SUM(don.net_amount), 0) AS total_net,
                COALESCE(SUM(CASE WHEN disb.reconciled = 1 THEN don.net_amount ELSE 0 END), 0) AS reconciled_net
             FROM $t disb
             LEFT JOIN $td don ON don.disbursement_id = disb.disbursement_id
                 AND don.disbursement_id IS NOT NULL AND don.disbursement_id != ''"
		);
		// phpcs:enable

		$bank_matches = LSFH_Bank_Status::matched( 'payout', array_map( static fn( $r ) => (int) $r->id, $rows ) );
		$fees         = LSFH_Payout_Fees::overview( $page_ids );
		$fee_plan     = array_column( LSFH_Payout_Fees::plan(), 'action', 'disbursement_id' );
		foreach ( $rows as $r ) {
			$r->id                  = (int) $r->id;
			$r->bank_matched        = isset( $bank_matches[ $r->id ] );
			$r->bank_difference     = $bank_matches[ $r->id ] ?? null;
			$r->donation_count      = (int) $r->donation_count;
			$r->gross_total         = (float) $r->gross_total;
			$r->net_total           = (float) $r->net_total;
			$r->reconciled          = (bool) $r->reconciled;
			$r->filed               = (bool) $r->filed;
			$r->filing_period_id    = $r->filing_period_id ? (int) $r->filing_period_id : null;
			$r->processor           = (string) ( $r->processor ?? '' );
			$r->live_count          = (int) $r->live_count;
			$r->live_gross          = (float) $r->live_gross;
			$r->live_net            = (float) $r->live_net;
			$r->amendment_count     = (int) $r->amendment_count;
			$r->amendment_total     = (float) $r->amendment_total;
			$r->elec_primary        = (int) $r->elec_primary;
			$r->elec_general        = (int) $r->elec_general;
			$r->elec_runoff         = (int) $r->elec_runoff;
			$r->elec_special        = (int) $r->elec_special;
			$r->refund_charge_count = (int) $r->refund_charge_count;
			$r->refund_charge_total = (float) $r->refund_charge_total;
			$fee                    = $fees[ $r->disbursement_id ] ?? array();
			// The fees on the payout's donations: one rule, in LSFH_Payout_Fees, shared with the fee state below.
			$r->live_fees       = (float) ( $fee['expected'] ?? 0 );
			$r->fees_logged     = (float) ( $fee['logged'] ?? 0 );
			$r->fee_state       = $fee['state'] ?? 'nothing';
			$r->fee_expense_ids = $fee['expense_ids'] ?? array();
			$r->fee_action      = $fee_plan[ $r->disbursement_id ] ?? '';
			$r->other_periods   = $other_periods[ $r->disbursement_id ] ?? array();
		}
		return rest_ensure_response(
			array(
				'total'          => $total_disb,
				'pages'          => (int) ceil( $total_disb / $per_page ),
				'page'           => $page,
				'per_page'       => $per_page,
				'total_net'      => (float) ( $disb_agg->total_net ?? 0 ),
				'reconciled_net' => (float) ( $disb_agg->reconciled_net ?? 0 ),
				'counts'         => LSFH_Bank_Status::payout_counts( $period_id ) + self::fee_counts( $fee_plan ),
				'data'           => $rows,
			)
		);
	}

	/**
	 * Update a payout. Reconciled, filed and period changes carry through to its donations.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function update_disbursement( WP_REST_Request $req ) {
		global $wpdb;
		$id = (int) $req->get_param( 'id' );
		$p  = $req->get_json_params() ?? array();
		$d  = array();
		// array_key_exists() (not isset()) so sending null correctly clears the field.
		if ( array_key_exists( 'date_received', $p ) ) {
			$d['date_received'] = sanitize_text_field( $p['date_received'] ?? '' ) ?: null;
		}
		// Settable by hand because not every provider reports it, and a file's date can be
		// wrong. Democracy Engine leaves "Transmittal Payment Posted On" empty until a
		// transmittal settles, and the date it eventually settles on may never appear in
		// a file the user can re-import. The date is also copied to the donations below,
		// so sync_disbursements, which recomputes it from them, keeps what was set.
		if ( array_key_exists( 'disbursement_date', $p ) ) {
			$d['disbursement_date'] = sanitize_text_field( $p['disbursement_date'] ?? '' ) ?: null;
		}
		if ( isset( $p['bank_reference'] ) ) {
			$d['bank_reference'] = sanitize_text_field( $p['bank_reference'] );
		}
		// Who pays this out. Cleared (null) when emptied, so the payout goes back to being named by its source.
		if ( array_key_exists( 'processor', $p ) ) {
			$d['processor'] = mb_substr( sanitize_text_field( (string) ( $p['processor'] ?? '' ) ), 0, 100 ) ?: null;
		}
		if ( isset( $p['reconciled'] ) ) {
			$d['reconciled'] = (int) (bool) $p['reconciled'];
		}
		if ( isset( $p['filed'] ) ) {
			$d['filed'] = (int) (bool) $p['filed'];
		}
		if ( isset( $p['election_type'] ) ) {
			$d['election_type'] = sanitize_text_field( $p['election_type'] );
		}
		if ( isset( $p['filing_period_id'] ) ) {
			$d['filing_period_id'] = $p['filing_period_id'] ? (int) $p['filing_period_id'] : null;
		}
		if ( isset( $p['notes'] ) ) {
			$d['notes'] = mb_substr( sanitize_textarea_field( $p['notes'] ), 0, 500 );
		}
		$d['updated_at'] = current_time( 'mysql' );

		$disb_id = $wpdb->get_var( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prepare(
				"SELECT disbursement_id FROM {$wpdb->prefix}lsfh_actblue_disbursements WHERE id=%d",
				$id
			)
		);
		if ( null === $disb_id ) {
			return new WP_Error( 'not_found', 'Disbursement not found.', array( 'status' => 404 ) );
		}

		$wpdb->update( $wpdb->prefix . 'lsfh_actblue_disbursements', $d, array( 'id' => $id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching

		// A payout date set by hand is copied to the donations in it, as the filing period is, because the ledger sync
		// recomputes the payout's date from them and would otherwise put the file's date back.
		if ( array_key_exists( 'disbursement_date', $p ) && $disb_id ) {
			$wpdb->update( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
				$wpdb->prefix . 'lsfh_donations',
				array(
					'disbursement_date' => $d['disbursement_date'],
					'updated_at'        => current_time( 'mysql' ),
				),
				array( 'disbursement_id' => $disb_id )
			);
		}

		// When reconciled toggles, sync balanced on all linked donations.
		if ( isset( $p['reconciled'] ) ) {
			LSFH_Payout_Status::sync_donations( $disb_id, $d['reconciled'] );
		}
		// When filed toggles, sync reporting_status on the linked donations (refunds that have to be reported by hand stay as they are).
		if ( isset( $p['filed'] ) ) {
			LSFH_Amendments::set_payout_status( $disb_id, $d['filed'] );
		}
		// When filing_period_id is set, propagate to all linked donations.
		if ( isset( $p['filing_period_id'] ) ) {
			if ( $disb_id ) {
				$wpdb->update( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
					$wpdb->prefix . 'lsfh_donations',
					array(
						'filing_period_id' => $d['filing_period_id'],
						'updated_at'       => current_time( 'mysql' ),
					),
					array( 'disbursement_id' => $disb_id )
				);
			}
		}
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}lsfh_actblue_disbursements WHERE id=%d", $id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		if ( $row ) {
			$row->id          = (int) $row->id;
			$row->reconciled  = (bool) $row->reconciled;
			$row->filed       = (bool) $row->filed;
			$row->gross_total = (float) $row->gross_total;
			$row->net_total   = (float) $row->net_total;
		}
		return rest_ensure_response( $row );
	}

	/**
	 * Delete a payout that has no donations linked to it.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function delete_disbursement( WP_REST_Request $req ) {
		global $wpdb;
		$id = (int) $req->get_param( 'id' );
		$ta = $wpdb->prefix . 'lsfh_actblue_disbursements';
		$td = $wpdb->prefix . 'lsfh_donations';

		// Fetch disbursement_id for the row.
		$disb_id = $wpdb->get_var( $wpdb->prepare( "SELECT disbursement_id FROM $ta WHERE id=%d", $id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		if ( ! $disb_id ) {
			return new WP_Error( 'not_found', 'Disbursement not found.', array( 'status' => 404 ) );
		}

		// Safety — refuse if any donations are still linked to this disbursement_id.
		$linked = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM $td WHERE disbursement_id=%s", $disb_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		if ( $linked > 0 ) {
			return new WP_Error( 'has_transactions', "Cannot delete: $linked transaction(s) are still linked to this disbursement.", array( 'status' => 409 ) );
		}

		$wpdb->delete( $ta, array( 'id' => $id ), array( '%d' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		return rest_ensure_response( array( 'deleted' => $id ) );
	}

	/**
	 * Fill a disbursement's Bank Reference from the deposit number the provider's
	 * file carries (ActBlue's "Check Number" column is the direct deposit number).
	 *
	 * Only ever writes to a blank Bank Reference, so a value typed in by hand is
	 * never replaced. Deliberately writes to the disbursement alone: the number is
	 * not copied onto donation rows, where a check number could surface in filings.
	 *
	 * @param array<string,string> $refs disbursement_id => deposit number.
	 * @return int How many payouts got a Bank Reference.
	 */
	public static function fill_bank_references( array $refs ) {
		global $wpdb;
		$filled = 0;
		foreach ( $refs as $disb_id => $ref ) {
			if ( '' === (string) $disb_id || '' === (string) $ref ) {
				continue;
			}
			$filled += (int) $wpdb->query( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
				$wpdb->prepare(
					"UPDATE {$wpdb->prefix}lsfh_actblue_disbursements
                 SET bank_reference = %s, updated_at = %s
                 WHERE disbursement_id = %s AND (bank_reference IS NULL OR bank_reference = '')",
					substr( $ref, 0, 255 ),
					current_time( 'mysql' ),
					(string) $disb_id
				)
			);
		}
		return $filled;
	}

	/**
	 * Rebuild the disbursements ledger from donation rows.
	 *
	 * Safe to call repeatedly: it updates a payout by its disbursement_id, or adds it.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function sync_disbursements( WP_REST_Request $req ) {
		global $wpdb;
		$td = $wpdb->prefix . 'lsfh_donations';
		$ta = $wpdb->prefix . 'lsfh_actblue_disbursements';

		// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$groups = $wpdb->get_results(
			"SELECT disbursement_id, MIN(disbursement_date) AS disbursement_date,
                 COUNT(*) AS donation_count,
                 SUM(gross_amount) AS gross_total,
                 SUM(net_amount)   AS net_total,
                 MIN(election_type) AS elec_min,
                 MAX(election_type) AS elec_max
             FROM $td
             WHERE disbursement_id IS NOT NULL AND disbursement_id != ''
             GROUP BY disbursement_id"
		);
		// phpcs:enable

		// The processor an import or sync names its payouts after, for the payouts it lists; only a payout with no name takes it.
		$processor     = sanitize_text_field( (string) $req->get_param( 'processor' ) );
		$processor_for = array_map( 'strval', (array) $req->get_param( 'processor_for' ) );
		$upserted      = 0;
		foreach ( $groups as $g ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
			$existing    = $wpdb->get_row( $wpdb->prepare( "SELECT id, election_type, processor FROM $ta WHERE disbursement_id=%s", $g->disbursement_id ) );
			$existing_id = $existing ? (int) $existing->id : 0;
			// The election a payout belongs to is the one its contributions carry.
			// Only adopt it when they all agree — a mixed payout is genuinely
			// ambiguous and is left blank for the user to resolve. Nothing here
			// overwrites an election already set by hand.
			$elec = ( '' !== $g->elec_min && $g->elec_min === $g->elec_max ) ? $g->elec_min : '';
			// Treat MySQL zero-date as "no date" so it gets replaced by a valid value.
			$computed_date = ( $g->disbursement_date && '0000-00-00' !== $g->disbursement_date ) ? $g->disbursement_date : null;
			$data          = array(
				'donation_count' => (int) $g->donation_count,
				'gross_total'    => (float) $g->gross_total,
				'net_total'      => (float) $g->net_total,
				'updated_at'     => current_time( 'mysql' ),
			);
			if ( $existing_id ) {
				// Always refresh disbursement_date from donation data — it's the source of truth.
				// This also self-heals rows that were created with a missing/zero date.
				if ( $computed_date ) {
					$data['disbursement_date'] = $computed_date;
				}
				if ( $elec && '' === (string) $existing->election_type ) {
					$data['election_type'] = $elec;
				}
				if ( '' !== $processor && '' === (string) $existing->processor && in_array( (string) $g->disbursement_id, $processor_for, true ) ) {
					$data['processor'] = $processor;
				}
				$wpdb->update( $ta, $data, array( 'id' => $existing_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			} else {
				$data['disbursement_id']   = $g->disbursement_id;
				$data['disbursement_date'] = $computed_date;
				$data['election_type']     = $elec;
				if ( '' !== $processor && in_array( (string) $g->disbursement_id, $processor_for, true ) ) {
					$data['processor'] = $processor;
				}
				$data['reconciled'] = 0;
				$data['created_at'] = current_time( 'mysql' );
				$wpdb->insert( $ta, $data ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			}
			++$upserted;
		}

		// Give each record with no filing period the one its date falls in (LSFH_Periods::fill_missing). Only where none is
		// set: this used to overwrite every row, which silently reversed deliberate assignments (a donation given in Q1 but
		// paid out in Q2 is attached to the Q2 disbursement so the totals match the bank, and the next sync moved it back to
		// Q1 by date). Marking a disbursement's period, and setting a period by hand on a record, are decisions; date
		// matching is only a starting guess for rows nobody has decided about yet.
		LSFH_Periods::fill_missing();

		// A payout's own filing period is the one most of its donations carry (a tie goes to the later period id), so a
		// payout that is mostly Q3 reads Q3. Runs after the date assignment above so the donations' periods are set. A
		// payout whose donations are all outside any defined period gets none.
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$wpdb->query(
			"UPDATE $ta disb
             SET disb.filing_period_id = (
                 SELECT x.filing_period_id FROM $td x
                 WHERE x.disbursement_id = disb.disbursement_id AND x.filing_period_id IS NOT NULL
                 GROUP BY x.filing_period_id
                 ORDER BY COUNT(*) DESC, x.filing_period_id DESC
                 LIMIT 1
             )"
		);
		// phpcs:enable

		// Donations may have changed since the last sync, so each payout's fee expense is brought in step too.
		LSFH_Payout_Fees::refresh( array_map( static fn( $g ) => (string) $g->disbursement_id, $groups ) );

		$total = (int) $wpdb->get_var( "SELECT COUNT(*) FROM $ta" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		return rest_ensure_response(
			array(
				'synced' => $upserted,
				'total'  => $total,
			)
		);
	}

	/**
	 * How many payouts have fees that one click can fix, and how many need a person to look.
	 *
	 * @param string[] $fee_plan Disbursement id => planned fee action.
	 * @return int[] fees_to_fix and fees_to_check.
	 */
	private static function fee_counts( array $fee_plan ) {
		$actions = LSFH_Payout_Fees::count_actions( $fee_plan );
		return array(
			'fees_to_fix'   => $actions['link'] + $actions['create'] + $actions['update'] + $actions['rename'] + $actions['balance'],
			'fees_to_check' => $actions['many'] + $actions['review'],
		);
	}
}
