<?php
/**
 * How two donation rows are known to be the same donor.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * A donor is the first and last name on a donation, ignoring case and surrounding spaces. The Donors list, the dashboard
 * and the pre-filing check all group donations this way, so the rule lives here once, as SQL for grouping and as PHP for
 * a single name.
 */
class LSFH_Donor_Key {

	/**
	 * SQL that gives the first-name part of the key.
	 *
	 * @param string $alias Table alias to read the column from, with its dot (for example 'd.'), or '' for none.
	 * @return string An SQL expression.
	 */
	public static function first_sql( $alias = '' ) {
		return "LOWER(TRIM({$alias}first_name))";
	}

	/**
	 * SQL that gives the last-name part of the key.
	 *
	 * @param string $alias Table alias to read the column from, with its dot, or '' for none.
	 * @return string An SQL expression.
	 */
	public static function last_sql( $alias = '' ) {
		return "LOWER(TRIM({$alias}last_name))";
	}

	/**
	 * The key of one name, worked out the way the SQL above does it (spaces trimmed from both ends, case ignored).
	 *
	 * @param string $first First name (an organization's whole name is kept in this field).
	 * @param string $last  Last name.
	 * @return array{0: string, 1: string} The first and last parts of the key.
	 */
	public static function of( $first, $last ) {
		return array( mb_strtolower( trim( (string) $first, ' ' ) ), mb_strtolower( trim( (string) $last, ' ' ) ) );
	}
}
