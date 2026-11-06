<?php
/**
 * Whether Hub items are matched to the bank, for the screens that list them.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Read-only questions the Disbursements, Expenditures and Donations lists ask about the bank tie-out.
 */
class LSFH_Bank_Status {

	/**
	 * Which of these items are in a confirmed bank match, and by how much each match differs.
	 *
	 * @param string $kind payout, donation or expense.
	 * @param int[]  $ids  Row ids.
	 * @return array<int, float> Row id => the match's difference in dollars (0 when it matched exactly). Only matched ids are present.
	 */
	public static function matched( $kind, array $ids ) {
		global $wpdb;
		$ids = array_values( array_filter( array_map( 'absint', $ids ) ) );
		if ( ! $ids ) {
			return array();
		}
		$marks = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
		$rows  = (array) $wpdb->get_results( $wpdb->prepare( "SELECT k.ref_id, m.difference FROM {$wpdb->prefix}lsfh_bank_match_links k JOIN {$wpdb->prefix}lsfh_bank_matches m ON m.id = k.match_id WHERE k.kind = %s AND k.ref_id IN ($marks)", $kind, ...$ids ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$out   = array();
		foreach ( $rows as $row ) {
			$out[ (int) $row['ref_id'] ] = (float) $row['difference'];
		}
		return $out;
	}

	/**
	 * Which of these donations are matched to the bank: on their own (a check, cash or wire donation), or
	 * through the payout they are part of.
	 *
	 * @param object[] $donations Donation rows with id and disbursement_id.
	 * @return array<int, true> Donation id => true, only for matched ones.
	 */
	public static function matched_donations( array $donations ) {
		global $wpdb;
		$own     = self::matched( 'donation', array_map( static fn( $d ) => (int) $d->id, $donations ) );
		$payouts = array_values( array_unique( array_filter( array_map( static fn( $d ) => (string) $d->disbursement_id, $donations ) ) ) );
		$through = array();
		if ( $payouts ) {
			$marks   = implode( ',', array_fill( 0, count( $payouts ), '%s' ) );
			$rows    = (array) $wpdb->get_col( $wpdb->prepare( "SELECT p.disbursement_id FROM {$wpdb->prefix}lsfh_actblue_disbursements p JOIN {$wpdb->prefix}lsfh_bank_match_links k ON k.kind = 'payout' AND k.ref_id = p.id WHERE p.disbursement_id IN ($marks)", ...$payouts ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber,PluginCheck.Security.DirectDB.UnescapedDBParameter
			$through = array_flip( $rows );
		}
		$out = array();
		foreach ( $donations as $donation ) {
			if ( isset( $own[ (int) $donation->id ] ) || isset( $through[ (string) $donation->disbursement_id ] ) ) {
				$out[ (int) $donation->id ] = true;
			}
		}
		return $out;
	}

	/**
	 * How far along the payouts are: how many there are, how many are balanced, matched to the bank and filed.
	 *
	 * @param int $period_id Filing period id to count within, or 0 for every payout.
	 * @return array{total: int, balanced: int, matched: int, filed: int}
	 */
	public static function payout_counts( $period_id = 0 ) {
		global $wpdb;
		$sql    = "SELECT COUNT(*) AS total,
				COALESCE(SUM(d.reconciled = 1), 0) AS balanced,
				COALESCE(SUM(d.filed = 1), 0) AS filed,
				COALESCE(SUM(EXISTS (SELECT 1 FROM {$wpdb->prefix}lsfh_bank_match_links k WHERE k.kind = 'payout' AND k.ref_id = d.id)), 0) AS matched
			FROM {$wpdb->prefix}lsfh_actblue_disbursements d";
		$values = array();
		if ( $period_id ) {
			$sql     .= ' WHERE d.filing_period_id = %d';
			$values[] = $period_id;
		}
		$row = $wpdb->get_row( $values ? $wpdb->prepare( $sql, ...$values ) : $sql, ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		return array(
			'total'    => (int) $row['total'],
			'balanced' => (int) $row['balanced'],
			'matched'  => (int) $row['matched'],
			'filed'    => (int) $row['filed'],
		);
	}
}
