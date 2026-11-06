<?php
/**
 * Setting the election of the donations inside a filing period to the period's election.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * A donation takes its election from the filing period its date falls in, but only when it is created. Changing a
 * period's election later, or adding a period over donations that are already there, leaves them as they were. This
 * lists the donations a period governs that carry another election, and sets them once the person agrees.
 *
 * A donation that is already filed is never changed. A donation is governed by the shortest period that covers its
 * date, so a shorter period inside this one keeps its own donations. When the donations of a payout all end up with the
 * same election, the payout's own election label follows them.
 */
class LSFH_Period_Elections {

	/**
	 * The elections a period can carry that donations can follow. Local is for a PAC or a party that does not report by
	 * election: no limit applies to it and nothing else treats it differently.
	 *
	 * @var string[]
	 */
	const TYPES = array( 'primary', 'general', 'runoff', 'special', 'local' );

	/**
	 * Whether this site has turned elections off (a PAC or party that does not report by election). New donations and
	 * periods are then Local, the screens leave the election fields out, and no contribution limit is applied. Records
	 * that already exist are never changed by the setting.
	 *
	 * @return bool
	 */
	public static function hidden() {
		return (bool) get_option( 'lsfh_no_elections', false );
	}

	/**
	 * What setting the election would change, without changing it.
	 *
	 * @param object $period The filing period row.
	 * @return array{applicable: bool, election: string, total: int, from: array<string,int>, filed: int, payouts: int}
	 *         applicable is false when the period's election is a custom name; total is how many donations would change,
	 *         from is how many of them carry each election now, filed is how many were left out because they are filed,
	 *         and payouts is how many payouts hold the donations that would change.
	 */
	public static function preview( $period ) {
		global $wpdb;
		$election = strtolower( (string) $period->election_type );
		$out      = array(
			'applicable' => in_array( $election, self::TYPES, true ),
			'election'   => $election,
			'total'      => 0,
			'from'       => array(),
			'filed'      => 0,
			'payouts'    => 0,
		);
		if ( ! $out['applicable'] ) {
			return $out;
		}
		$table = $wpdb->prefix . 'lsfh_donations';
		$where = self::where( $period, $election );
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$rows = (array) $wpdb->get_results( "SELECT election_type, (reporting_status = 'filed') AS filed, COUNT(*) AS n FROM $table WHERE $where GROUP BY election_type, filed" );
		foreach ( $rows as $row ) {
			if ( (int) $row->filed ) {
				$out['filed'] += (int) $row->n;
				continue;
			}
			$out['total']                      += (int) $row->n;
			$out['from'][ $row->election_type ] = (int) $row->n;
		}
		$out['payouts'] = (int) $wpdb->get_var( "SELECT COUNT(DISTINCT disbursement_id) FROM $table WHERE $where AND reporting_status <> 'filed' AND disbursement_id IS NOT NULL AND disbursement_id <> ''" );
		// phpcs:enable
		return $out;
	}

	/**
	 * Set the election of the donations the preview lists, and of the payouts whose donations then all agree.
	 *
	 * @param object $period The filing period row.
	 * @return array{changed: int, payouts: int, filed: int}|WP_Error How many donations and payout labels changed, and how
	 *         many filed donations were left alone; an error when nothing could be changed.
	 */
	public static function apply( $period ) {
		global $wpdb;
		$election = strtolower( (string) $period->election_type );
		if ( ! in_array( $election, self::TYPES, true ) ) {
			return new WP_Error( 'custom_election', 'This period has a custom election name, so donations cannot follow it.', array( 'status' => 400 ) );
		}
		$table = $wpdb->prefix . 'lsfh_donations';
		$where = self::where( $period, $election );
		$left  = (int) self::preview( $period )['filed'];
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$wpdb->query( 'START TRANSACTION' );
		$payouts = (array) $wpdb->get_col( "SELECT DISTINCT disbursement_id FROM $table WHERE $where AND reporting_status <> 'filed' AND disbursement_id IS NOT NULL AND disbursement_id <> ''" );
		$changed = $wpdb->query( $wpdb->prepare( "UPDATE $table SET election_type = %s, updated_at = %s WHERE $where AND reporting_status <> 'filed'", $election, current_time( 'mysql' ) ) );
		if ( false === $changed ) {
			$wpdb->query( 'ROLLBACK' );
			return new WP_Error( 'db_error', 'Could not change the elections. Nothing was changed.', array( 'status' => 500 ) );
		}
		$labels = self::realign_payouts( $payouts );
		$wpdb->query( 'COMMIT' );
		// phpcs:enable
		return array(
			'changed' => (int) $changed,
			'payouts' => $labels,
			'filed'   => $left,
		);
	}

	/**
	 * Give each payout the election its donations share, when they all share one.
	 *
	 * @param string[] $disbursement_ids The payouts to look at.
	 * @return int How many payout labels changed.
	 */
	private static function realign_payouts( array $disbursement_ids ) {
		global $wpdb;
		if ( ! $disbursement_ids ) {
			return 0;
		}
		$marks = implode( ',', array_fill( 0, count( $disbursement_ids ), '%s' ) );
		$sql   = "UPDATE {$wpdb->prefix}lsfh_actblue_disbursements p
			SET p.election_type = (SELECT MIN(x.election_type) FROM {$wpdb->prefix}lsfh_donations x WHERE x.disbursement_id = p.disbursement_id),
				p.updated_at = %s
			WHERE p.disbursement_id IN ($marks)
			AND (SELECT COUNT(DISTINCT x.election_type) FROM {$wpdb->prefix}lsfh_donations x WHERE x.disbursement_id = p.disbursement_id) = 1
			AND p.election_type <> (SELECT MIN(x.election_type) FROM {$wpdb->prefix}lsfh_donations x WHERE x.disbursement_id = p.disbursement_id)";
		return (int) $wpdb->query( $wpdb->prepare( $sql, current_time( 'mysql' ), ...array_values( $disbursement_ids ) ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,PluginCheck.Security.DirectDB.UnescapedDBParameter
	}

	/**
	 * SQL for the donations this period governs that carry an election other than the given one.
	 *
	 * @param object $period   The filing period row.
	 * @param string $election The election the donations should have.
	 * @return string A WHERE condition, already prepared.
	 */
	private static function where( $period, $election ) {
		global $wpdb;
		return LSFH_Periods::governed_where( $period, 'contribution_date' ) . $wpdb->prepare( ' AND election_type <> %s', $election );
	}
}
