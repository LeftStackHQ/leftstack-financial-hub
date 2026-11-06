<?php
/**
 * What the payout fee routes accept: the declared arguments, their checks and their cleaning.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Argument definitions for the payout fee routes (the row ids use LSFH_REST_Base::id_arg()).
 */
class LSFH_Fee_Args {

	/**
	 * The payouts to fix: left out, every payout that needs it.
	 *
	 * @return array
	 */
	public static function payout_ids() {
		return array(
			'ids' => array(
				'type'              => 'array',
				'items'             => array(
					'type'    => 'integer',
					'minimum' => 1,
				),
				'maxItems'          => 500,
				'required'          => false,
				'validate_callback' => 'rest_validate_request_arg',
				'sanitize_callback' => static fn( $ids ) => array_map( 'absint', (array) $ids ),
			),
		);
	}
}
