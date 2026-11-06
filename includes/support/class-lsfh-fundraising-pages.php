<?php
/**
 * The name of a fundraising page, written one way.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * ActBlue's sync stores a page as its full link (https://secure.actblue.com/page/your-page) and a file import stores
 * just the name (your-page). Both are the same page, so anything that adds pages up reads them through this.
 */
class LSFH_Fundraising_Pages {

	/**
	 * A page's name in one form: lower case, and for an ActBlue page link only the name after /page/. Any other link
	 * loses its scheme and a trailing slash; a plain name is only trimmed and lower-cased.
	 *
	 * @param string $page The stored fundraising page.
	 * @return string The name, or an empty string when there is none.
	 */
	public static function normalize( $page ) {
		$name = strtolower( trim( (string) $page ) );
		if ( preg_match( '#^https?://[^/]+/page/([^/?\#]+)#', $name, $m ) ) {
			return $m[1];
		}
		return rtrim( (string) preg_replace( '#^https?://#', '', $name ), '/' );
	}
}
