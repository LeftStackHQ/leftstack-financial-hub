<?php
/**
 * Routes for the vendor report: spend against money raised.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * The vendor groups and the report built from them.
 */
class LSFH_Vendors_Controller extends LSFH_REST_Base {

	/**
	 * Spend against money raised for each saved group, with every page and payee seen so groups can be edited.
	 *
	 * @param WP_REST_Request $req Request; date_from and date_to (YYYY-MM-DD, both optional) limit the report to those dates.
	 * @return WP_REST_Response
	 */
	public static function report( WP_REST_Request $req ) {
		return rest_ensure_response( LSFH_Vendor_Report::run( (string) $req->get_param( 'date_from' ), (string) $req->get_param( 'date_to' ) ) );
	}

	/**
	 * What the report route accepts.
	 *
	 * @return array
	 */
	public static function report_args() {
		return self::date_arg( 'date_from' ) + self::date_arg( 'date_to' );
	}

	/**
	 * Replace the vendor groups, then answer with the new report.
	 *
	 * @param WP_REST_Request $req Request; groups is the whole list, date_from and date_to as for the report.
	 * @return WP_REST_Response
	 */
	public static function save_groups( WP_REST_Request $req ) {
		LSFH_Vendor_Groups::save( $req->get_param( 'groups' ) );
		return self::report( $req );
	}

	/**
	 * What the groups route accepts.
	 *
	 * @return array
	 */
	public static function groups_args() {
		$names = array(
			'type'     => 'array',
			'maxItems' => LSFH_Vendor_Groups::MAX_ITEMS,
			'items'    => array(
				'type'      => 'string',
				'maxLength' => 255,
			),
		);
		return self::report_args() + array(
			'groups' => array(
				'type'              => 'array',
				'required'          => true,
				'maxItems'          => LSFH_Vendor_Groups::MAX_GROUPS,
				'items'             => array(
					'type'                 => 'object',
					'additionalProperties' => false,
					'properties'           => array(
						'name'   => array(
							'type'      => 'string',
							'maxLength' => 100,
						),
						'payees' => $names,
						'pages'  => $names,
					),
				),
				'validate_callback' => 'rest_validate_request_arg',
				'sanitize_callback' => 'rest_sanitize_request_arg',
			),
		);
	}
}
