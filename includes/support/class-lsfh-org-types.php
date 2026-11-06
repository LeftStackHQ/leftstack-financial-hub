<?php
/**
 * The kinds of organization that can give, and which of them the organization limit applies to.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * A donation from an organization carries a type, chosen by hand in the donation form. A PAC or a party committee is
 * exempt from the organization limit (Tennessee sets none for them); a union, a business or any other organization keeps
 * it. A donation with no type, which is every organization donation entered before the types existed, keeps the limit
 * too, so nothing changes until someone sets a type.
 *
 * The type is stored on each contribution, like the donor's address. A donor's type is the one on their most recent
 * contribution that has one, so a later gift entered without a type does not wipe it out.
 */
class LSFH_Org_Types {

	/**
	 * Every type a donation can carry.
	 *
	 * @var string[]
	 */
	const TYPES = array( 'pac', 'party', 'union', 'business', 'other' );

	/**
	 * The types the organization limit does not apply to.
	 *
	 * @var string[]
	 */
	const EXEMPT = array( 'pac', 'party' );

	/**
	 * A type from a request, or null when it is blank or not one of the types.
	 *
	 * @param mixed $value The submitted value.
	 * @return string|null
	 */
	public static function clean( $value ) {
		$value = is_string( $value ) ? strtolower( trim( $value ) ) : '';
		return in_array( $value, self::TYPES, true ) ? $value : null;
	}

	/**
	 * A SQL expression for a donor's type: the type on their most recent contribution that has one, or NULL. For a query
	 * that groups donations by donor.
	 *
	 * @param string $alias The table alias holding the columns, with its dot (for example 'd.'), or ''.
	 * @return string
	 */
	public static function latest_sql( $alias = '' ) {
		return 'SUBSTRING_INDEX(GROUP_CONCAT(' . $alias . 'org_type ORDER BY ' . $alias . 'id DESC), \',\', 1)';
	}

	/**
	 * A SQL condition that is true for a donation whose type is exempt from the organization limit.
	 *
	 * Built from the fixed list above, never from a request value.
	 *
	 * @param string $alias The table alias holding the org_type column, with its dot (for example 'latest.').
	 * @return string
	 */
	public static function exempt_sql( $alias = '' ) {
		return $alias . "org_type IN ('" . implode( "','", self::EXEMPT ) . "')";
	}
}
