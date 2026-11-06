<?php
/**
 * The check before a state report: which contributions in it are missing what the state needs.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Looks at the contributions a state report would contain (itemized, not refunds, in the chosen period) and lists the
 * ones missing a name, street, city, state or ZIP, and, for an individual, an occupation or employer. A donor the
 * campaign has recorded best efforts for is excused the occupation and employer. Nothing here changes a donation or the
 * report; it only reads.
 *
 * The export and this check choose their rows with the same function (report_wheres) and decide a missing address with
 * the same one (address_gaps), so they cannot drift apart. A test still compares the two counts.
 */
class LSFH_Filing_Check {

	/**
	 * The conditions that choose the contributions a state report contains: the filters of the request, but never a
	 * dollar-size filter (nobody is left out of a filing by the size of a gift), only positive amounts (a refund is
	 * reported on its own) and only itemized ones. Used by the export and by this check.
	 *
	 * @param WP_REST_Request $req    The request; its amount_min and amount_max are cleared.
	 * @param array           $values Placeholder values for the conditions, added to in order.
	 * @return string[] Conditions to join with AND.
	 */
	public static function report_wheres( WP_REST_Request $req, array &$values ) {
		$req->set_param( 'amount_min', null );
		$req->set_param( 'amount_max', null );
		$wheres   = LSFH_Donations_Controller::build_donation_where( $req, $values );
		$wheres[] = 'gross_amount > 0';
		$wheres[] = "report_type = 'itemized'";
		return $wheres;
	}

	/**
	 * Which parts of the address a contribution is missing.
	 *
	 * @param object $row A donation row (address, city, state, zip, zip_formatted).
	 * @return string[] Any of street, city, state, zip, in that order.
	 */
	public static function address_gaps( $row ) {
		$gaps  = array();
		$blank = static function ( $value ) {
			return '' === trim( (string) $value );
		};
		if ( $blank( $row->address ) ) {
			$gaps[] = 'street';
		}
		if ( $blank( $row->city ) ) {
			$gaps[] = 'city';
		}
		if ( $blank( $row->state ) ) {
			$gaps[] = 'state';
		}
		if ( $blank( $row->zip_formatted ) && $blank( $row->zip ) ) {
			$gaps[] = 'zip';
		}
		return $gaps;
	}

	/**
	 * What is missing from one contribution.
	 *
	 * @param object $row    A donation row (donor_type, first_name, last_name, address, city, state, zip, zip_formatted,
	 *                       occupation, employer).
	 * @param bool   $excuse Whether best efforts are on record for the donor, which excuses occupation and employer.
	 * @return string[] What is missing, in the order it is listed: name, street, city, state, zip, occupation, employer.
	 */
	public static function problems( $row, $excuse ) {
		$is_org  = 'organization' === $row->donor_type;
		$missing = array();
		$blank   = static function ( $value ) {
			return '' === trim( (string) $value );
		};
		// An organization's whole name is kept in the first name field.
		if ( $blank( $row->first_name ) || ( ! $is_org && $blank( $row->last_name ) ) ) {
			$missing[] = 'name';
		}
		$missing = array_merge( $missing, self::address_gaps( $row ) );
		if ( ! $is_org && ! $excuse ) {
			if ( $blank( $row->occupation ) ) {
				$missing[] = 'occupation';
			}
			if ( $blank( $row->employer ) ) {
				$missing[] = 'employer';
			}
		}
		return $missing;
	}

	/**
	 * Check every contribution the report would contain.
	 *
	 * @param WP_REST_Request $req The request; it narrows the contributions the way the export does (filing_period_id,
	 *                             date_from, date_to and so on).
	 * @return array{checked: int, donors: array<int, array<string, mixed>>, covered: array<int, array<string, mixed>>}
	 *         checked is how many contributions were looked at. donors lists those with something missing, by name, each
	 *         with its contributions. covered lists donors whose only gaps are excused by best efforts (missing then
	 *         holds what is excused, and rows is empty).
	 */
	public static function run( WP_REST_Request $req ) {
		global $wpdb;
		$values = array();
		$where  = 'WHERE ' . implode( ' AND ', self::report_wheres( $req, $values ) );

		$efforts = LSFH_Best_Efforts::all();
		$donors  = array();
		$covered = array();
		$checked = 0;
		$offset  = 0;
		$chunk   = 2000;
		do {
			// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
			$sql  = "SELECT id, donor_type, first_name, last_name, address, city, state, zip, zip_formatted, occupation, employer, contribution_date, gross_amount FROM {$wpdb->prefix}lsfh_donations $where ORDER BY id ASC LIMIT %d OFFSET %d";
			$rows = (array) $wpdb->get_results( $wpdb->prepare( $sql, ...array_merge( $values, array( $chunk, $offset ) ) ) );
			// phpcs:enable
			$fetched  = count( $rows );
			$offset  += $chunk;
			$checked += $fetched;
			foreach ( $rows as $row ) {
				$hash   = LSFH_Best_Efforts::hash( $row->first_name, $row->last_name );
				$effort = $efforts[ $hash ] ?? null;
				$none   = self::problems( $row, false );
				$left   = self::problems( $row, null !== $effort );
				if ( ! $none ) {
					continue;
				}
				// Rows that are complete once best efforts count go to the covered list, once per donor.
				if ( ! $left ) {
					if ( ! isset( $covered[ $hash ] ) ) {
						$covered[ $hash ] = self::donor_entry( $row, $effort );
					}
					$covered[ $hash ]['gifts']  += 1;
					$covered[ $hash ]['total']  += (float) $row->gross_amount;
					$covered[ $hash ]['missing'] = array_values( array_unique( array_merge( $covered[ $hash ]['missing'], $none ) ) );
					continue;
				}
				if ( ! isset( $donors[ $hash ] ) ) {
					$donors[ $hash ] = self::donor_entry( $row, $effort );
				}
				$donors[ $hash ]['gifts']  += 1;
				$donors[ $hash ]['total']  += (float) $row->gross_amount;
				$donors[ $hash ]['missing'] = array_values( array_unique( array_merge( $donors[ $hash ]['missing'], $left ) ) );
				$donors[ $hash ]['rows'][]  = array(
					'id'      => (int) $row->id,
					'date'    => (string) $row->contribution_date,
					'amount'  => (float) $row->gross_amount,
					'missing' => $left,
				);
			}
		} while ( $fetched === $chunk );

		// A donor with some complete-by-best-efforts rows and some with gaps stays in the problem list only.
		$covered = array_diff_key( $covered, $donors );
		// By last name then first name; an organization sorts by its name, which is kept in the first name field.
		$by_name = static function ( $a, $b ) {
			$key = static function ( $d ) {
				return strtolower( $d['is_org'] ? $d['first_name'] : $d['last_name'] . ' ' . $d['first_name'] );
			};
			return strcmp( $key( $a ), $key( $b ) );
		};
		$donors  = array_values( $donors );
		$covered = array_values( $covered );
		usort( $donors, $by_name );
		usort( $covered, $by_name );
		return array(
			'checked' => $checked,
			'donors'  => $donors,
			'covered' => $covered,
		);
	}

	/**
	 * The start of a donor's entry in the result.
	 *
	 * @param object     $row    One of the donor's contributions.
	 * @param array|null $effort The donor's best-efforts record, or null.
	 * @return array<string, mixed>
	 */
	private static function donor_entry( $row, $effort ) {
		return array(
			'first_name'   => (string) $row->first_name,
			'last_name'    => (string) $row->last_name,
			'is_org'       => 'organization' === $row->donor_type,
			'gifts'        => 0,
			'total'        => 0.0,
			'missing'      => array(),
			'rows'         => array(),
			'best_efforts' => $effort,
		);
	}
}
