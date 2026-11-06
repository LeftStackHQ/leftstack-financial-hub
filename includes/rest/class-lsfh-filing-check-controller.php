<?php
/**
 * Routes for the check before a state report, and for recording best efforts.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * The pre-filing check: what is missing from the contributions a report would contain, the best-efforts records that
 * excuse a donor's missing occupation and employer, and the refunds that still have to be reported to a filed period.
 */
class LSFH_Filing_Check_Controller extends LSFH_REST_Base {

	/**
	 * What is missing, donor by donor, for the contributions a state report would contain.
	 *
	 * @param WP_REST_Request $req Request; filing_period_id (or date_from and date_to) picks the report, page and per_page
	 *                             page through the donors.
	 * @return WP_REST_Response
	 */
	public static function check( WP_REST_Request $req ) {
		$result   = LSFH_Filing_Check::run( $req );
		$per_page = self::per_page( $req, 25, 100 );
		$total    = count( $result['donors'] );
		$pages    = max( 1, (int) ceil( $total / $per_page ) );
		$page     = min( max( 1, (int) ( $req->get_param( 'page' ) ?? 1 ) ), $pages );
		$rows     = 0;
		foreach ( $result['donors'] as $donor ) {
			$rows += $donor['gifts'];
		}
		return rest_ensure_response(
			array(
				'checked'      => $result['checked'],
				'problem_rows' => $rows,
				'total'        => $total,
				'page'         => $page,
				'pages'        => $pages,
				'donors'       => array_slice( $result['donors'], ( $page - 1 ) * $per_page, $per_page ),
				'covered'      => $result['covered'],
			)
		);
	}

	/**
	 * Compare the contributions of a filing period with the rows of the list the state shows for it.
	 *
	 * @param WP_REST_Request $req Request: filing_period_id, and rows (each: name, first_name, date, amount, zip) read from
	 *                             the state's file by the screen.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function compare( WP_REST_Request $req ) {
		if ( ! (int) $req->get_param( 'filing_period_id' ) ) {
			return new WP_Error( 'missing_period', 'Choose a filing period.', array( 'status' => 400 ) );
		}
		return rest_ensure_response( LSFH_State_Compare::run( $req, (array) $req->get_param( 'rows' ) ) );
	}

	/**
	 * Refunds of donations in a period that was already filed, which still have to be reported to the state.
	 *
	 * @return WP_REST_Response
	 */
	public static function amendments() {
		return rest_ensure_response( LSFH_Amendments::pending() );
	}

	/**
	 * Record that the campaign asked a donor for their occupation and employer.
	 *
	 * @param WP_REST_Request $req Request: first_name, last_name, and optionally requested_on (Y-m-d, today if left out) and note.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function save_best_efforts( WP_REST_Request $req ) {
		$on = (string) $req->get_param( 'requested_on' );
		$id = LSFH_Best_Efforts::save(
			(string) $req->get_param( 'first_name' ),
			(string) $req->get_param( 'last_name' ),
			'' !== $on ? $on : current_time( 'Y-m-d' ),
			(string) $req->get_param( 'note' )
		);
		return is_wp_error( $id ) ? $id : rest_ensure_response( array( 'id' => $id ) );
	}

	/**
	 * Take a best-efforts record away, so the donor's occupation and employer count as missing again.
	 *
	 * @param WP_REST_Request $req Request: id.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function delete_best_efforts( WP_REST_Request $req ) {
		if ( ! LSFH_Best_Efforts::delete( (int) $req->get_param( 'id' ) ) ) {
			return new WP_Error( 'not_found', 'That best-efforts record was not found.', array( 'status' => 404 ) );
		}
		return rest_ensure_response( array( 'deleted' => (int) $req->get_param( 'id' ) ) );
	}

	/**
	 * What the best-efforts route accepts.
	 *
	 * @return array
	 */
	public static function best_efforts_args() {
		return array(
			'first_name'   => array(
				'type'              => 'string',
				'maxLength'         => 100,
				'validate_callback' => 'rest_validate_request_arg',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'last_name'    => array(
				'type'              => 'string',
				'maxLength'         => 100,
				'validate_callback' => 'rest_validate_request_arg',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'requested_on' => array(
				'type'              => 'string',
				'pattern'           => '^\d{4}-\d{2}-\d{2}$',
				'validate_callback' => array( 'LSFH_Bank_Args', 'validate_date' ),
			),
		) + self::text_arg( 'note', 255 );
	}

	/**
	 * The declared arguments of the comparison: a filing period and the state's rows.
	 *
	 * @return array
	 */
	public static function compare_args() {
		return self::id_arg( 'filing_period_id' ) + array(
			'rows' => array(
				'type'              => 'array',
				'required'          => true,
				'maxItems'          => LSFH_State_Compare::MAX_STATE_ROWS,
				'items'             => array(
					'type'                 => 'object',
					'additionalProperties' => false,
					'properties'           => array(
						'name'       => array(
							'type'      => 'string',
							'maxLength' => 200,
						),
						'first_name' => array(
							'type'      => 'string',
							'maxLength' => 200,
						),
						'date'       => array(
							'type'    => 'string',
							'pattern' => '^\d{4}-\d{2}-\d{2}$',
						),
						'amount'     => array( 'type' => 'number' ),
						'zip'        => array(
							'type'      => 'string',
							'maxLength' => 20,
						),
					),
				),
				'validate_callback' => 'rest_validate_request_arg',
				'sanitize_callback' => 'rest_sanitize_request_arg',
			),
		);
	}
}
