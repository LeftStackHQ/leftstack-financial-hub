<?php
/**
 * What the bank tie-out routes accept: the declared arguments, their checks and their cleaning.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Argument definitions for the bank tie-out routes.
 *
 * WordPress checks and cleans a request against these before the controller runs, so the controller can
 * rely on its inputs. Structure is declared as a JSON schema; the checks a schema cannot express (a
 * real calendar date, a two-decimal amount) are added in a validate_callback.
 */
class LSFH_Bank_Args {

	const MAX_LINES_PER_UPLOAD = 5000;

	/**
	 * The account id in the URL.
	 *
	 * @return array
	 */
	public static function account_id() {
		return LSFH_REST_Base::id_arg();
	}

	/**
	 * The label of a bank account.
	 *
	 * @param bool $required Whether the label must be sent.
	 * @return array
	 */
	public static function label( $required ) {
		return array(
			'label' => array(
				'type'              => 'string',
				'minLength'         => 1,
				'maxLength'         => 100,
				'required'          => $required,
				'validate_callback' => 'rest_validate_request_arg',
				'sanitize_callback' => 'sanitize_text_field',
			),
		);
	}

	/**
	 * The saved format of a bank account.
	 *
	 * @return array
	 */
	public static function format() {
		return array(
			'format' => array(
				'type'              => 'object',
				'validate_callback' => array( 'LSFH_Bank_Format', 'validate' ),
				'sanitize_callback' => array( 'LSFH_Bank_Format', 'sanitize' ),
			),
		);
	}

	/**
	 * The lines of a bank file.
	 *
	 * @return array
	 */
	public static function lines() {
		return array(
			'lines' => array(
				'type'              => 'array',
				'required'          => true,
				'minItems'          => 1,
				'maxItems'          => self::MAX_LINES_PER_UPLOAD,
				'items'             => array(
					'type'       => 'object',
					'required'   => array( 'date', 'amount' ),
					'properties' => array(
						'date'         => array(
							'type'    => 'string',
							'pattern' => '^\d{4}-\d{2}-\d{2}$',
						),
						'amount'       => array( 'type' => array( 'number', 'string' ) ),
						'description'  => array( 'type' => 'string' ),
						'check_number' => array( 'type' => 'string' ),
					),
				),
				'validate_callback' => array( __CLASS__, 'validate_lines' ),
				'sanitize_callback' => array( __CLASS__, 'sanitize_lines' ),
			),
		);
	}

	/**
	 * The optional start date of a review.
	 *
	 * @return array
	 */
	public static function from() {
		return array(
			'from' => array(
				'type'              => 'string',
				'pattern'           => '^\d{4}-\d{2}-\d{2}$',
				'validate_callback' => array( __CLASS__, 'validate_date' ),
			),
		);
	}

	/**
	 * The groups of a confirmation.
	 *
	 * @return array
	 */
	public static function groups() {
		return array(
			'matches' => array(
				'type'              => 'array',
				'required'          => true,
				'minItems'          => 1,
				'maxItems'          => LSFH_Bank_Matches::MAX_GROUPS,
				'validate_callback' => 'rest_validate_request_arg',
				'items'             => array(
					'type'       => 'object',
					'required'   => array( 'bank', 'hub' ),
					'properties' => array(
						'bank'   => array(
							'type'     => 'array',
							'minItems' => 1,
							'maxItems' => LSFH_Bank_Matches::MAX_ITEMS_PER_SIDE,
							'items'    => array(
								'type'    => 'string',
								'pattern' => '^b[1-9]\d{0,17}$',
							),
						),
						'hub'    => array(
							'type'     => 'array',
							'minItems' => 1,
							'maxItems' => LSFH_Bank_Matches::MAX_ITEMS_PER_SIDE,
							'items'    => array(
								'type'    => 'string',
								'pattern' => '^[pde][1-9]\d{0,17}$',
							),
						),
						'tier'   => array(
							'type' => 'string',
							'enum' => array( 'clear', 'group', 'manual' ),
						),
						'reason' => array(
							'type'      => 'string',
							'maxLength' => 40,
						),
						'note'   => array(
							'type'      => 'string',
							'maxLength' => 255,
						),
					),
				),
				'sanitize_callback' => array( __CLASS__, 'sanitize_groups' ),
			),
		);
	}

	/**
	 * Whether confirming also fills blank dates on the Hub items from the bank lines.
	 *
	 * @return array
	 */
	public static function fill_dates() {
		return array(
			'fill_dates' => array(
				'type'              => 'boolean',
				'default'           => true,
				'validate_callback' => 'rest_validate_request_arg',
				'sanitize_callback' => 'rest_sanitize_request_arg',
			),
		);
	}

	/**
	 * Which way the money moved: in, out, or empty for both.
	 *
	 * @return array
	 */
	public static function direction() {
		return array(
			'direction' => array(
				'type'              => 'string',
				'default'           => '',
				'enum'              => array( '', 'in', 'out' ),
				'validate_callback' => 'rest_validate_request_arg',
				'sanitize_callback' => 'rest_sanitize_request_arg',
			),
		);
	}

	/**
	 * Paging for a list.
	 *
	 * @return array
	 */
	public static function paging() {
		return array(
			'page'     => array(
				'type'              => 'integer',
				'default'           => 1,
				'minimum'           => 1,
				'validate_callback' => 'rest_validate_request_arg',
				'sanitize_callback' => 'rest_sanitize_request_arg',
			),
			'per_page' => array(
				'type'              => 'integer',
				'default'           => 25,
				'minimum'           => 1,
				'maximum'           => 100,
				'validate_callback' => 'rest_validate_request_arg',
				'sanitize_callback' => 'rest_sanitize_request_arg',
			),
		);
	}

	/**
	 * Is this a real calendar date written Y-m-d?
	 *
	 * @param mixed           $value Value sent.
	 * @param WP_REST_Request $req   Request.
	 * @param string          $param Argument name.
	 * @return true|WP_Error
	 */
	public static function validate_date( $value, $req, $param ) {
		$schema = rest_validate_request_arg( $value, $req, $param );
		if ( true !== $schema ) {
			return $schema;
		}
		return self::is_date( $value ) ? true : new WP_Error( 'rest_invalid_param', "$param must be a real date.", array( 'status' => 400 ) );
	}

	/**
	 * Check every line of an upload: real dates, amounts of at most two decimals.
	 *
	 * @param mixed           $value Value sent.
	 * @param WP_REST_Request $req   Request.
	 * @param string          $param Argument name.
	 * @return true|WP_Error
	 */
	public static function validate_lines( $value, $req, $param ) {
		$schema = rest_validate_request_arg( $value, $req, $param );
		if ( true !== $schema ) {
			return $schema;
		}
		foreach ( $value as $number => $line ) {
			if ( ! self::is_date( $line['date'] ) ) {
				return new WP_Error( 'rest_invalid_param', 'Line ' . ( $number + 1 ) . ' does not have a real date.', array( 'status' => 400 ) );
			}
			if ( null === self::cents( $line['amount'] ) ) {
				return new WP_Error( 'rest_invalid_param', 'Line ' . ( $number + 1 ) . ' does not have an amount in dollars and cents.', array( 'status' => 400 ) );
			}
		}
		return true;
	}

	/**
	 * Reduce uploaded lines to date, cents, description and check number.
	 *
	 * @param array $lines Lines as sent (already checked).
	 * @return array[]
	 */
	public static function sanitize_lines( $lines ) {
		return array_map(
			static function ( $line ) {
				return array(
					'date'         => $line['date'],
					'cents'        => self::cents( $line['amount'] ),
					'description'  => mb_substr( sanitize_text_field( $line['description'] ?? '' ), 0, 255 ),
					'check_number' => mb_substr( sanitize_text_field( $line['check_number'] ?? '' ), 0, 50 ),
				);
			},
			$lines
		);
	}

	/**
	 * Put confirmed groups in the shape LSFH_Bank_Matches expects.
	 *
	 * @param array $groups Groups as sent (already checked).
	 * @return array[]
	 */
	public static function sanitize_groups( $groups ) {
		return array_map(
			static function ( $group ) {
				return array(
					'bank'   => array_map( static fn( $id ) => (int) substr( $id, 1 ), $group['bank'] ),
					'hub'    => $group['hub'],
					'tier'   => $group['tier'] ?? 'manual',
					'reason' => sanitize_key( $group['reason'] ?? '' ),
					'note'   => sanitize_text_field( $group['note'] ?? '' ),
				);
			},
			$groups
		);
	}

	/**
	 * Is this a real calendar date written Y-m-d?
	 *
	 * @param mixed $value Value to test.
	 * @return bool
	 */
	private static function is_date( $value ) {
		if ( ! is_string( $value ) || 1 !== preg_match( '/^(\d{4})-(\d{2})-(\d{2})$/', $value, $part ) ) {
			return false;
		}
		return checkdate( (int) $part[2], (int) $part[3], (int) $part[1] );
	}

	/**
	 * An amount in dollars and cents as whole cents, or null when it is not one.
	 *
	 * @param mixed $amount Number or numeric string, at most two decimals.
	 * @return int|null
	 */
	private static function cents( $amount ) {
		$text = is_string( $amount ) ? $amount : (string) $amount;
		if ( 1 !== preg_match( '/^-?\d{1,8}(\.\d{1,2})?$/', trim( $text ) ) ) {
			return null;
		}
		return (int) round( (float) $text * 100 );
	}
}
