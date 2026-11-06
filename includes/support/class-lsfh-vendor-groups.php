<?php
/**
 * The vendor groups: which payees and fundraising pages belong to one vendor.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * A fundraising vendor is paid under one or more payee names (a consultant and the texting platform it uses) and raises
 * money through one or more ActBlue pages. A group holds those, so what was spent on the vendor can be set beside what
 * its pages raised. The groups are one option; a payee or a page belongs to at most one group.
 */
class LSFH_Vendor_Groups {

	const OPTION     = 'lsfh_vendor_groups';
	const MAX_GROUPS = 30;
	const MAX_ITEMS  = 200;

	/**
	 * The saved groups.
	 *
	 * @return array[] Each: name, payees (names as paid), pages (normalized names).
	 */
	public static function all() {
		return self::clean( get_option( self::OPTION, array() ) );
	}

	/**
	 * Save the groups, after cleaning them.
	 *
	 * @param mixed $raw The groups as sent.
	 * @return array[] The groups as saved.
	 */
	public static function save( $raw ) {
		$groups = self::clean( $raw );
		update_option( self::OPTION, $groups, false );
		return $groups;
	}

	/**
	 * Clean a list of groups: names and entries trimmed and cut to length, entries without text dropped, a payee (any
	 * letter case) or a page kept only in the first group that has it, and the sizes capped.
	 *
	 * @param mixed $raw The groups as sent or as stored.
	 * @return array[] Each: name, payees, pages.
	 */
	public static function clean( $raw ) {
		$out         = array();
		$used_payees = array();
		$used_pages  = array();
		foreach ( array_slice( is_array( $raw ) ? array_values( $raw ) : array(), 0, self::MAX_GROUPS ) as $group ) {
			$name = is_array( $group ) ? trim( sanitize_text_field( (string) ( $group['name'] ?? '' ) ) ) : '';
			if ( '' === $name ) {
				continue;
			}
			$payees = array();
			foreach ( array_slice( (array) ( $group['payees'] ?? array() ), 0, self::MAX_ITEMS ) as $payee ) {
				$payee = substr( trim( sanitize_text_field( (string) $payee ) ), 0, 255 );
				$key   = strtolower( $payee );
				if ( '' !== $payee && ! isset( $used_payees[ $key ] ) ) {
					$used_payees[ $key ] = true;
					$payees[]            = $payee;
				}
			}
			$pages = array();
			foreach ( array_slice( (array) ( $group['pages'] ?? array() ), 0, self::MAX_ITEMS ) as $page ) {
				$page = substr( LSFH_Fundraising_Pages::normalize( sanitize_text_field( (string) $page ) ), 0, 255 );
				if ( '' !== $page && ! isset( $used_pages[ $page ] ) ) {
					$used_pages[ $page ] = true;
					$pages[]             = $page;
				}
			}
			$out[] = array(
				'name'   => substr( $name, 0, 100 ),
				'payees' => $payees,
				'pages'  => $pages,
			);
		}
		return $out;
	}
}
