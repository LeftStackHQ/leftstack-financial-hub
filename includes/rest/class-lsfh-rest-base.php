<?php
/**
 * Shared helpers for the REST controllers: page size, prepared queries, amount search and the id, flag and text arguments.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Shared helpers for the REST controllers: page size, prepared queries, amount search and the id and flag arguments.
 */
abstract class LSFH_REST_Base {

	/**
	 * Page size from the request, kept between 1 and $max. A value of 0 or less used to
	 * reach the SQL LIMIT and the page-count division, which failed the request.
	 *
	 * @param WP_REST_Request $req     Request.
	 * @param int             $fallback Size when none is given.
	 * @param int             $max     Largest size allowed.
	 * @return int
	 */
	public static function per_page( WP_REST_Request $req, $fallback, $max ) {
		$n = $req->get_param( 'per_page' );
		$n = is_numeric( $n ) ? (int) $n : (int) $fallback;
		return max( 1, min( $n, (int) $max ) );
	}

	/**
	 * Bind $values into $sql with $wpdb->prepare(), or return $sql untouched when there is nothing to bind.
	 *
	 * The prepare() method rejects a call with no arguments, and the list and export queries build their
	 * filters dynamically, so any of them can end up with none. This replaces a raw-or-prepared
	 * ternary at every call site.
	 *
	 * @param string $sql    SQL with placeholders.
	 * @param array  $values Values for the placeholders, in order.
	 * @return string Prepared SQL.
	 */
	public static function prepared( string $sql, array $values ): string {
		global $wpdb;
		return $values ? $wpdb->prepare( $sql, ...$values ) : $sql; // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,PluginCheck.Security.DirectDB.UnescapedDBParameter
	}

	/**
	 * Read a search box entry as an amount, so "172.50" or "$1,000" can match money as well as names.
	 *
	 * @param string $search What was typed.
	 * @return float|null The amount, or null when the text is not a plain number.
	 */
	public static function search_amount( $search ) {
		$clean = str_replace( array( '$', ',', ' ' ), '', $search );
		return preg_match( '/^-?\d+(\.\d{1,2})?$/', $clean ) ? abs( round( (float) $clean, 2 ) ) : null;
	}

	/**
	 * The declared argument for a row id: a whole number of 1 or more, checked and cleaned by WordPress.
	 *
	 * @param string $key Name of the argument (the URL part or body field).
	 * @return array The argument, keyed by its name, ready to add to a route's arguments.
	 */
	public static function id_arg( $key = 'id' ) {
		return array(
			$key => array(
				'type'              => 'integer',
				'minimum'           => 1,
				'required'          => true,
				'validate_callback' => 'rest_validate_request_arg',
				'sanitize_callback' => 'absint',
			),
		);
	}

	/**
	 * The declared argument for a yes/no flag, off unless sent.
	 *
	 * @param string $key Name of the argument.
	 * @return array The argument, keyed by its name, ready to add to a route's arguments.
	 */
	public static function flag_arg( $key ) {
		return array(
			$key => array(
				'type'              => 'boolean',
				'default'           => false,
				'validate_callback' => 'rest_validate_request_arg',
				'sanitize_callback' => 'rest_sanitize_boolean',
			),
		);
	}

	/**
	 * The declared argument for a short piece of text, optional, cleaned with sanitize_text_field.
	 *
	 * @param string $key        Name of the argument.
	 * @param int    $max_length Longest text accepted.
	 * @return array The argument, keyed by its name, ready to add to a route's arguments.
	 */
	public static function text_arg( $key, $max_length ) {
		return array(
			$key => array(
				'type'              => 'string',
				'maxLength'         => (int) $max_length,
				'required'          => false,
				'validate_callback' => 'rest_validate_request_arg',
				'sanitize_callback' => 'sanitize_text_field',
			),
		);
	}

	/**
	 * The declared argument for an optional date written YYYY-MM-DD (blank means no date).
	 *
	 * @param string $key Name of the argument.
	 * @return array The argument, keyed by its name, ready to add to a route's arguments.
	 */
	public static function date_arg( $key ) {
		return array(
			$key => array(
				'type'              => 'string',
				'pattern'           => '^(\\d{4}-\\d{2}-\\d{2})?$',
				'required'          => false,
				'validate_callback' => 'rest_validate_request_arg',
				'sanitize_callback' => 'sanitize_text_field',
			),
		);
	}
}
