<?php
/**
 * Bank tie-out routes: accounts, uploading bank lines, the review, confirming and undoing matches.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Bank tie-out routes. The controller receives and responds; the work is in the LSFH_Bank_* support classes,
 * and what each route accepts is declared in LSFH_Bank_Args.
 */
class LSFH_Bank_Controller extends LSFH_REST_Base {

	/**
	 * List the bank accounts.
	 *
	 * @return WP_REST_Response
	 */
	public static function list_accounts() {
		return rest_ensure_response( LSFH_Bank_Lines::accounts() );
	}

	/**
	 * Add a bank account.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function create_account( WP_REST_Request $req ) {
		$id = LSFH_Bank_Lines::add_account( $req['label'], $req['format'] ?? LSFH_Bank_Format::sanitize( array() ) );
		return rest_ensure_response( LSFH_Bank_Lines::account( $id ) );
	}

	/**
	 * Change a bank account's label or format.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function update_account( WP_REST_Request $req ) {
		$account = self::account_or_error( $req );
		if ( is_wp_error( $account ) ) {
			return $account;
		}
		$fields = array_filter(
			array(
				'label'  => $req['label'],
				'format' => $req['format'],
			),
			static fn( $value ) => null !== $value
		);
		if ( ! $fields ) {
			return new WP_Error( 'nothing', 'No fields to update.', array( 'status' => 400 ) );
		}
		LSFH_Bank_Lines::update_account( $account['id'], $fields );
		return rest_ensure_response( LSFH_Bank_Lines::account( $account['id'] ) );
	}

	/**
	 * Add the lines of a bank file to an account.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function import_lines( WP_REST_Request $req ) {
		$account = self::account_or_error( $req );
		if ( is_wp_error( $account ) ) {
			return $account;
		}
		$lines  = $req['lines'];
		$dates  = array_column( $lines, 'date' );
		$cents  = array_column( $lines, 'cents' );
		$result = LSFH_Bank_Lines::add_lines( $account['id'], $lines );
		return rest_ensure_response(
			$result + array(
				'first_date' => min( $dates ),
				'last_date'  => max( $dates ),
				'money_in'   => array_sum( array_filter( $cents, static fn( $c ) => $c > 0 ) ) / 100,
				'money_out'  => array_sum( array_filter( $cents, static fn( $c ) => $c < 0 ) ) / 100,
			)
		);
	}

	/**
	 * What the matcher suggests for an account's open bank lines and Hub records.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function review( WP_REST_Request $req ) {
		$account = self::account_or_error( $req );
		if ( is_wp_error( $account ) ) {
			return $account;
		}
		return rest_ensure_response( LSFH_Bank_Review::build( $account, $req['from'] ) );
	}

	/**
	 * Confirm groups of bank lines and Hub records.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function confirm_matches( WP_REST_Request $req ) {
		$account = self::account_or_error( $req );
		if ( is_wp_error( $account ) ) {
			return $account;
		}
		$ids = LSFH_Bank_Matches::confirm( $account['id'], $req['matches'], get_current_user_id(), $req['fill_dates'] );
		return is_wp_error( $ids ) ? $ids : rest_ensure_response( array( 'ids' => $ids ) );
	}

	/**
	 * A page of an account's confirmed matches, with the details of the bank lines and Hub records in them.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function list_matches( WP_REST_Request $req ) {
		$account = self::account_or_error( $req );
		if ( is_wp_error( $account ) ) {
			return $account;
		}
		return rest_ensure_response( LSFH_Bank_Review::confirmed( $account['id'], $req['page'], $req['per_page'], (string) $req['direction'] ) );
	}

	/**
	 * Undo a confirmed match.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function delete_match( WP_REST_Request $req ) {
		if ( ! LSFH_Bank_Matches::remove( $req['id'] ) ) {
			return new WP_Error( 'not_found', 'There is no such match.', array( 'status' => 404 ) );
		}
		return rest_ensure_response( array( 'deleted' => $req['id'] ) );
	}

	/**
	 * The account named in the URL, or a 404.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	private static function account_or_error( WP_REST_Request $req ) {
		$account = LSFH_Bank_Lines::account( $req['id'] );
		return $account ?? new WP_Error( 'not_found', 'There is no such bank account.', array( 'status' => 404 ) );
	}
}
