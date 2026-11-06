<?php
/**
 * Refunds that reach back into a report that was already filed.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * A donation is always reported in its own period, whatever happens to it later. A refund of a donation whose period was
 * already filed means that period's report has to be amended, so the refund is listed here until someone marks it
 * reported. Marking it reported is the ordinary Filed status of the refund row; no field is added.
 *
 * Filing a payout marks every donation in it Filed, but a refund that needs reporting by hand is left out of that, or the
 * list would empty itself without anything being amended. A refund that needs reporting is one whose original is Filed,
 * or one with no original on record (so nobody can tell whether its period was filed).
 */
class LSFH_Amendments {

	/**
	 * How many refunds the list shows at most.
	 */
	const LIMIT = 500;

	/**
	 * The test for "this refund has to be reported by hand", for a query that joins the refund as r and its original as o
	 * (LEFT JOIN on o.id = r.refund_of_id).
	 */
	const NEEDS_REPORT = "r.gross_amount < 0 AND (o.id IS NULL OR o.reporting_status = 'filed')";

	/**
	 * Refunds that still have to be reported, grouped by the period they amend.
	 *
	 * @return array periods (each: id, name, start_date, end_date, count, total, refunds), unplaced (refunds that can't be
	 *               matched to a period, each with a reason of no_original or no_period), count and total of everything
	 *               listed, and more (true when the list was cut at LIMIT).
	 */
	public static function pending() {
		global $wpdb;
		$td    = $wpdb->prefix . 'lsfh_donations';
		$tp    = $wpdb->prefix . 'lsfh_filing_periods';
		$needs = self::NEEDS_REPORT;
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT r.id, r.donor_type, r.first_name, r.last_name, r.gross_amount, r.created_at, r.refund_of_id,
				        o.id AS original_id, o.contribution_date AS original_date,
				        p.id AS period_id, p.name AS period_name, p.start_date, p.end_date
				 FROM $td r
				 LEFT JOIN $td o ON o.id = r.refund_of_id
				 LEFT JOIN $tp p ON p.id = o.filing_period_id
				 WHERE r.reporting_status = %s AND $needs
				 ORDER BY p.end_date DESC, r.created_at DESC, r.id DESC
				 LIMIT %d",
				'pending',
				self::LIMIT + 1
			)
		);
		// phpcs:enable
		$more = count( $rows ) > self::LIMIT;
		$rows = array_slice( $rows, 0, self::LIMIT );

		$periods  = array();
		$unplaced = array();
		$total    = 0.0;
		foreach ( $rows as $r ) {
			$refund = array(
				'id'            => (int) $r->id,
				'donor'         => 'organization' === $r->donor_type ? (string) $r->first_name : trim( $r->first_name . ' ' . $r->last_name ),
				'gross_amount'  => (float) $r->gross_amount,
				'entered'       => substr( (string) $r->created_at, 0, 10 ),
				'original_id'   => $r->original_id ? (int) $r->original_id : 0,
				'original_date' => (string) $r->original_date,
			);
			$total += abs( $refund['gross_amount'] );
			if ( ! $r->period_id ) {
				$refund['reason'] = $r->original_id ? 'no_period' : 'no_original';
				$unplaced[]       = $refund;
				continue;
			}
			$key = (int) $r->period_id;
			if ( ! isset( $periods[ $key ] ) ) {
				$periods[ $key ] = array(
					'id'         => $key,
					'name'       => (string) $r->period_name,
					'start_date' => (string) $r->start_date,
					'end_date'   => (string) $r->end_date,
					'count'      => 0,
					'total'      => 0.0,
					'refunds'    => array(),
				);
			}
			++$periods[ $key ]['count'];
			$periods[ $key ]['total']    += abs( $refund['gross_amount'] );
			$periods[ $key ]['refunds'][] = $refund;
		}
		return array(
			'periods'  => array_values( $periods ),
			'unplaced' => $unplaced,
			'count'    => count( $rows ),
			'total'    => round( $total, 2 ),
			'more'     => $more,
		);
	}

	/**
	 * Set the reporting status of a payout's donations to match the payout's Filed flag, leaving out the refunds that have
	 * to be reported by hand.
	 *
	 * @param string $disbursement_id The payout's disbursement id (not the row id).
	 * @param bool   $filed           Whether the payout is filed.
	 */
	public static function set_payout_status( $disbursement_id, $filed ) {
		global $wpdb;
		if ( '' === (string) $disbursement_id ) {
			return;
		}
		$td    = $wpdb->prefix . 'lsfh_donations';
		$needs = self::NEEDS_REPORT;
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$wpdb->query(
			$wpdb->prepare(
				"UPDATE $td SET reporting_status = %s, updated_at = %s
				 WHERE disbursement_id = %s
				   AND id NOT IN (
				       SELECT id FROM (
				           SELECT r.id FROM $td r LEFT JOIN $td o ON o.id = r.refund_of_id
				           WHERE r.disbursement_id = %s AND $needs
				       ) AS by_hand
				   )",
				$filed ? 'filed' : 'pending',
				current_time( 'mysql' ),
				$disbursement_id,
				$disbursement_id
			)
		);
		// phpcs:enable
	}
}
