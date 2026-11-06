<?php
/**
 * A payout's totals, kept in step with the donations in it.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * A payout row stores a donation count, a gross total and a net total. The bank tie-out matches a payout on its net
 * total, so the three must follow the donations whenever those change, not only when the ledger is rebuilt.
 */
class LSFH_Payout_Totals {

	/**
	 * Recount these payouts from their donations. A payout left with no donations is set to zero, not skipped.
	 *
	 * @param string[] $disbursement_ids The payouts whose donations changed.
	 */
	public static function refresh( array $disbursement_ids ) {
		global $wpdb;
		$ids = array_values( array_filter( array_unique( array_map( 'strval', $disbursement_ids ) ) ) );
		if ( ! $ids ) {
			return;
		}
		$marks = implode( ',', array_fill( 0, count( $ids ), '%s' ) );
		$sql   = "UPDATE {$wpdb->prefix}lsfh_actblue_disbursements a SET
				a.donation_count = (SELECT COUNT(*) FROM {$wpdb->prefix}lsfh_donations d WHERE d.disbursement_id = a.disbursement_id),
				a.gross_total = (SELECT COALESCE(SUM(d.gross_amount), 0) FROM {$wpdb->prefix}lsfh_donations d WHERE d.disbursement_id = a.disbursement_id),
				a.net_total = (SELECT COALESCE(SUM(d.net_amount), 0) FROM {$wpdb->prefix}lsfh_donations d WHERE d.disbursement_id = a.disbursement_id),
				a.updated_at = %s
			WHERE a.disbursement_id IN ($marks)";
		$wpdb->query( $wpdb->prepare( $sql, current_time( 'mysql' ), ...$ids ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,PluginCheck.Security.DirectDB.UnescapedDBParameter
	}

	/**
	 * Everything a payout keeps that depends on its donations, after they were added, edited, split or deleted:
	 * its totals first, then its fee expense (which is worked out from them).
	 *
	 * @param string[] $disbursement_ids The payouts whose donations changed.
	 */
	public static function donations_changed( array $disbursement_ids ) {
		self::refresh( $disbursement_ids );
		LSFH_Payout_Fees::refresh( $disbursement_ids );
	}
}
