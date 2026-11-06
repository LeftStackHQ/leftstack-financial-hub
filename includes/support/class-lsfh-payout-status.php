<?php
/**
 * What it means for a payout to be reconciled: its donations are balanced too.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * The one rule for reconciling a payout, shared by the Disbursements screen and the bank tie-out so the
 * two can never disagree: marking a payout reconciled (or not) marks every donation in it balanced (or not),
 * and the payout's fee expense with them.
 */
class LSFH_Payout_Status {

	/**
	 * Set Balanced on every donation of a payout, and on its fee expense, to match the payout's Reconciled flag.
	 *
	 * @param string $disbursement_id The payout's disbursement id (not the row id).
	 * @param bool   $reconciled      Whether the payout is reconciled.
	 */
	public static function sync_donations( $disbursement_id, $reconciled ) {
		global $wpdb;
		if ( '' === (string) $disbursement_id ) {
			return;
		}
		$wpdb->update( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prefix . 'lsfh_donations',
			array(
				'balanced'   => (int) (bool) $reconciled,
				'updated_at' => current_time( 'mysql' ),
			),
			array( 'disbursement_id' => $disbursement_id )
		);
		LSFH_Payout_Fees::follow_reconciled( $disbursement_id, $reconciled );
	}
}
