<?php
/**
 * Who pays a payout out: the processor's name a payout carries, and the names a campaign already uses for each source.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * A payout can carry the name of the processor that paid it out (ActBlue, OATH, Democracy Engine, WinRed, ...). The
 * name comes from the person who imports the file, or from the ActBlue sync, and is only ever added going forward.
 * A payout without one is named by what its source implies (the name this campaign already uses for that source's
 * fee expenses, else a default). The fee expense of a payout is named from this.
 */
class LSFH_Payout_Processor {

	/**
	 * The name a payout gets when its campaign has not named it yet, by source (the only copy of these names).
	 */
	const DEFAULTS = array(
		'actblue' => 'ActBlue',
		'stripe'  => 'Stripe',
		'manual'  => 'Democracy Engine',
	);

	/**
	 * The name this campaign uses for each source's payouts: the most common name that is not a payout id on that
	 * source's fee expenses, else the processor's own name. Payouts that carry a name of their own are left out, so a
	 * processor imported as "manual" (WinRed, say) does not change the name every other "manual" payout gets.
	 *
	 * @return array<string, string> Source (actblue, stripe or manual) => name.
	 */
	public static function names() {
		global $wpdb;
		$rows  = (array) $wpdb->get_results( "SELECT d.source, e.payee, COUNT(DISTINCT e.id) AS n FROM {$wpdb->prefix}lsfh_expenditures e INNER JOIN {$wpdb->prefix}lsfh_donations d ON d.disbursement_id = e.disbursement_id INNER JOIN {$wpdb->prefix}lsfh_actblue_disbursements p ON p.disbursement_id = e.disbursement_id WHERE e.payment_method = 'fee' AND e.payee <> e.disbursement_id AND (p.processor IS NULL OR p.processor = '') GROUP BY d.source, e.payee ORDER BY n DESC", ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$names = self::DEFAULTS;
		$seen  = array();
		foreach ( $rows as $row ) {
			if ( ! isset( $seen[ $row['source'] ] ) ) {
				$seen[ $row['source'] ]  = true;
				$names[ $row['source'] ] = (string) $row['payee'];
			}
		}
		return $names;
	}

	/**
	 * The name for a payout: its own when it has one, else the name its source implies.
	 *
	 * @param array                 $payout A payout row with processor and source.
	 * @param array<string, string> $names  What names() returned.
	 * @return string
	 */
	public static function for_payout( array $payout, array $names ) {
		if ( ! empty( $payout['processor'] ) ) {
			return (string) $payout['processor'];
		}
		return $names[ (string) ( $payout['source'] ?? '' ) ] ?? 'Payment processor';
	}

	/**
	 * A request for the ledger sync that names the payouts of one import or sync, so a payout is named when it is
	 * created and its fee expense is named from it. Only a payout with no name yet takes it.
	 *
	 * @param string   $name             The processor's name, or an empty string to name nothing.
	 * @param string[] $disbursement_ids The payouts the name is for.
	 * @return WP_REST_Request
	 */
	public static function sync_request( $name, array $disbursement_ids ) {
		$req = new WP_REST_Request();
		$req->set_param( 'processor', sanitize_text_field( (string) $name ) );
		$req->set_param( 'processor_for', array_map( 'strval', array_keys( array_flip( $disbursement_ids ) ) ) );
		return $req;
	}
}
