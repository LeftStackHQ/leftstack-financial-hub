<?php
/**
 * Payout fee routes: what fixing the fees would do, fixing them, and keeping one of several fee expenses.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Payout fee routes. The controller receives and responds; the work is in LSFH_Payout_Fees, and what each
 * route accepts is declared in LSFH_Fee_Args.
 */
class LSFH_Fees_Controller extends LSFH_REST_Base {

	/**
	 * What fixing the fees would do, so the person can see it before agreeing.
	 *
	 * @return WP_REST_Response
	 */
	public static function plan() {
		$plan   = LSFH_Payout_Fees::plan();
		$change = array_filter( $plan, static fn( $item ) => in_array( $item['action'], array( 'link', 'create', 'update' ), true ) );
		return rest_ensure_response(
			array(
				'items'  => array_map( array( __CLASS__, 'item' ), $plan ),
				'counts' => LSFH_Payout_Fees::count_actions( array_column( $plan, 'action' ) ),
				'total'  => array_sum( array_column( $change, 'cents' ) ) / 100,
			)
		);
	}

	/**
	 * The processor name this campaign uses for each source's payouts, to pre-fill the import dialog.
	 *
	 * @return WP_REST_Response
	 */
	public static function processors() {
		return rest_ensure_response( LSFH_Payout_Processor::names() );
	}

	/**
	 * Fix the fee expenses of the payouts named, or of every payout that needs it.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function fix( WP_REST_Request $req ) {
		$ids  = $req['ids'];
		$plan = LSFH_Payout_Fees::plan();
		if ( $ids ) {
			$plan = array_filter( $plan, static fn( $item ) => in_array( (int) $item['payout_id'], $ids, true ) );
		}
		// Payouts with several fee expenses need a person to choose; they are never changed here.
		$plan = array_filter( $plan, static fn( $item ) => 'many' !== $item['action'] );
		return rest_ensure_response( LSFH_Payout_Fees::apply( array_values( $plan ) ) );
	}

	/**
	 * Keep one of a payout's fee expenses and remove the others.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function keep( WP_REST_Request $req ) {
		global $wpdb;
		$disbursement_id = $wpdb->get_var( $wpdb->prepare( "SELECT disbursement_id FROM {$wpdb->prefix}lsfh_actblue_disbursements WHERE id = %d", $req['id'] ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		if ( ! $disbursement_id ) {
			return new WP_Error( 'not_found', 'There is no such payout.', array( 'status' => 404 ) );
		}
		$overview = LSFH_Payout_Fees::overview( array( $disbursement_id ) );
		if ( ! in_array( (int) $req['expense_id'], $overview[ $disbursement_id ]['expense_ids'] ?? array(), true ) ) {
			return new WP_Error( 'not_found', 'That fee expense does not belong to this payout.', array( 'status' => 404 ) );
		}
		$removed = LSFH_Payout_Fees::keep_one( $disbursement_id, (int) $req['expense_id'] );
		// The kept expense may not be the right amount.
		LSFH_Payout_Fees::refresh( array( $disbursement_id ) );
		return rest_ensure_response( array( 'removed' => $removed ) );
	}

	/**
	 * One plan item as the screen shows it, in dollars.
	 *
	 * @param array $item A plan item.
	 * @return array
	 */
	private static function item( array $item ) {
		return array(
			'payout_id'       => (int) $item['payout_id'],
			'disbursement_id' => $item['disbursement_id'],
			'action'          => $item['action'],
			'expense_id'      => (int) $item['expense_id'],
			'payee_to'        => $item['payee_to'] ?? '',
			'amount'          => $item['cents'] / 100,
			'from_amount'     => $item['from_cents'] / 100,
		);
	}
}
