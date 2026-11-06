<?php
/**
 * The saved format of a bank account: checks it and cleans it before it is stored.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * The saved format of a bank account.
 *
 * Two parts: `depositors` (the names a bank prints for each payment processor, which is how a deposit is
 * recognised) and `mapping` (which column of the bank's file holds what, remembered for the next upload).
 * Anything else sent is dropped.
 */
class LSFH_Bank_Format {

	const MAX_DEPOSITOR_KEYS  = 20;
	const MAX_NAMES_PER_KEY   = 10;
	const MAX_MAPPING_ENTRIES = 30;

	/**
	 * Check a format sent to the API. Used as the REST argument's validate_callback.
	 *
	 * @param mixed $value The format as sent.
	 * @return true|WP_Error
	 */
	public static function validate( $value ) {
		if ( ! is_array( $value ) ) {
			return new WP_Error( 'rest_invalid_param', 'The format must be an object.', array( 'status' => 400 ) );
		}
		foreach ( array( 'depositors', 'mapping' ) as $part ) {
			if ( isset( $value[ $part ] ) && ! is_array( $value[ $part ] ) ) {
				return new WP_Error( 'rest_invalid_param', "The format's $part must be an object.", array( 'status' => 400 ) );
			}
		}
		if ( count( $value['depositors'] ?? array() ) > self::MAX_DEPOSITOR_KEYS || count( $value['mapping'] ?? array() ) > self::MAX_MAPPING_ENTRIES ) {
			return new WP_Error( 'rest_invalid_param', 'The format has too many entries.', array( 'status' => 400 ) );
		}
		foreach ( $value['depositors'] ?? array() as $names ) {
			if ( ! is_array( $names ) || count( $names ) > self::MAX_NAMES_PER_KEY ) {
				return new WP_Error( 'rest_invalid_param', 'Each processor takes a short list of names.', array( 'status' => 400 ) );
			}
		}
		return true;
	}

	/**
	 * Reduce a format to the parts the Hub uses. Used as the REST argument's sanitize_callback.
	 *
	 * @param mixed $value The format as sent (already validated).
	 * @return array{depositors: array, mapping: array}
	 */
	public static function sanitize( $value ) {
		$depositors = array();
		foreach ( (array) ( $value['depositors'] ?? array() ) as $key => $names ) {
			$key   = strtolower( sanitize_text_field( (string) $key ) );
			$names = array_values( array_filter( array_map( 'sanitize_text_field', array_map( 'strval', (array) $names ) ), 'strlen' ) );
			if ( '' !== $key && $names ) {
				$depositors[ $key ] = array_map(
					static function ( $name ) {
						return mb_substr( $name, 0, 60 );
					},
					$names
				);
			}
		}
		$mapping = array();
		foreach ( (array) ( $value['mapping'] ?? array() ) as $key => $setting ) {
			if ( is_scalar( $setting ) ) {
				$mapping[ sanitize_key( (string) $key ) ] = mb_substr( sanitize_text_field( (string) $setting ), 0, 100 );
			}
		}
		return array(
			'depositors' => $depositors,
			'mapping'    => $mapping,
		);
	}
}
