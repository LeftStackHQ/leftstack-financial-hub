<?php
/**
 * The contribution limits, and which donors have gone over one.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * The limits are per election: an individual has one cap, an organization another, and a PAC or a party committee has
 * none. Settings holds the caps; this reads them in one place for the Donors list, the dashboard and the page config,
 * and works out which donors a new contribution has pushed over a cap, so the person is told at entry and after a sync
 * and not only in an audit. A warning never blocks a save.
 */
class LSFH_Donor_Limits {

	/**
	 * Most donors the warning looks at in one call (a sync of a very large file is not held up by it).
	 */
	const MAX_CHECKED = 200;

	/**
	 * The limit settings. Turning elections off, or the no-limit switches on, leaves a kind of donor with no limit.
	 *
	 * @return array no_limit and org_no_limit (bool), ind_/org_ primary, general and runoff caps (float), and near_pct (float).
	 */
	public static function caps() {
		$off = LSFH_Period_Elections::hidden();
		return array(
			'no_limit'     => $off || (bool) get_option( 'lsfh_no_limit', false ),
			'org_no_limit' => $off || (bool) get_option( 'lsfh_org_no_limit', false ),
			'ind_primary'  => (float) get_option( 'lsfh_limit_primary', 3300 ),
			'ind_general'  => (float) get_option( 'lsfh_limit_general', 3300 ),
			'ind_runoff'   => (float) get_option( 'lsfh_limit_runoff', 3300 ),
			'org_primary'  => (float) get_option( 'lsfh_org_limit_primary', 5000 ),
			'org_general'  => (float) get_option( 'lsfh_org_limit_general', 5000 ),
			'org_runoff'   => (float) get_option( 'lsfh_org_limit_runoff', 5000 ),
			'near_pct'     => (float) get_option( 'lsfh_near_limit_pct', 80 ),
		);
	}

	/**
	 * The donors, among those given, whose total for an election is now over the cap that applies to them.
	 *
	 * Only primary and general have caps, as on the Donors list. Over means more than the cap; a donor exactly at it is
	 * Maxed on the list but has not gone over.
	 *
	 * @param array $gifts Each: first_name, last_name, election_type.
	 * @return array[] Each: name, election, total, limit; one per donor and election.
	 */
	public static function over( array $gifts ) {
		global $wpdb;
		$caps = self::caps();
		if ( $caps['no_limit'] && $caps['org_no_limit'] ) {
			return array();
		}
		$td      = $wpdb->prefix . 'lsfh_donations';
		$seen    = array();
		$over    = array();
		$checked = 0;
		foreach ( $gifts as $g ) {
			$election = (string) ( $g['election_type'] ?? '' );
			if ( ! in_array( $election, array( 'primary', 'general' ), true ) ) {
				continue;
			}
			$key = LSFH_Donor_Key::of( $g['first_name'] ?? '', $g['last_name'] ?? '' );
			$id  = implode( '|', $key ) . '|' . $election;
			if ( isset( $seen[ $id ] ) ) {
				continue;
			}
			$seen[ $id ] = true;
			if ( ++$checked > self::MAX_CHECKED ) {
				break;
			}
			$fn       = LSFH_Donor_Key::first_sql();
			$ln       = LSFH_Donor_Key::last_sql();
			$org_type = LSFH_Org_Types::latest_sql();
			// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
			$donor = $wpdb->get_row(
				$wpdb->prepare(
					"SELECT SUM(CASE WHEN election_type = %s THEN gross_amount ELSE 0 END) AS total,
					        SUBSTRING_INDEX(GROUP_CONCAT(donor_type ORDER BY id DESC), ',', 1) AS donor_type,
					        $org_type AS org_type
					 FROM $td WHERE $fn = %s AND $ln = %s",
					$election,
					$key[0],
					$key[1]
				)
			);
			// phpcs:enable
			if ( ! $donor ) {
				continue;
			}
			$is_org = 'organization' === $donor->donor_type;
			if ( $is_org ? ( $caps['org_no_limit'] || in_array( $donor->org_type, LSFH_Org_Types::EXEMPT, true ) ) : $caps['no_limit'] ) {
				continue;
			}
			$limit = $caps[ ( $is_org ? 'org_' : 'ind_' ) . $election ];
			$total = (float) $donor->total;
			if ( $limit > 0 && $total > $limit ) {
				$over[] = array(
					'name'     => $is_org ? trim( (string) $g['first_name'] ) : trim( $g['first_name'] . ' ' . ( $g['last_name'] ?? '' ) ),
					'election' => $election,
					'total'    => round( $total, 2 ),
					'limit'    => $limit,
				);
			}
		}
		return $over;
	}
}
