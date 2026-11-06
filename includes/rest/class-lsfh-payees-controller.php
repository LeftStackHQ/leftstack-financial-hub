<?php
/**
 * Payee routes: the aggregated payee list and renaming a payee.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Payee routes: the aggregated payee list and renaming a payee.
 */
class LSFH_Payees_Controller extends LSFH_REST_Base {

	/**
	 * List payees with what has been paid to each.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function list_payees( WP_REST_Request $req ) {
		global $wpdb;
		$t = $wpdb->prefix . 'lsfh_expenditures';
		$c = $wpdb->prefix . 'lsfh_budget_categories';

		$search   = sanitize_text_field( $req->get_param( 'search' ) ?? '' );
		$per_page = self::per_page( $req, 100, 500 );
		$page     = max( 1, (int) ( $req->get_param( 'page' ) ?? 1 ) );
		$offset   = ( $page - 1 ) * $per_page;

		$allowed_sort = array( 'total_spent', 'payment_count', 'last_payment', 'payee_display' );
		$orderby      = in_array( $req->get_param( 'orderby' ), $allowed_sort, true )
					? $req->get_param( 'orderby' ) : 'total_spent';
		$order        = strtoupper( $req->get_param( 'order' ) ?? 'DESC' ) === 'ASC' ? 'ASC' : 'DESC';

		$wheres = array( "e.payee != ''" );
		$args   = array();

		if ( $search ) {
			$like     = '%' . $wpdb->esc_like( $search ) . '%';
			$wheres[] = 'e.payee LIKE %s';
			$args[]   = $like;
		}

		$where = 'WHERE ' . implode( ' AND ', $wheres );

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		// $t and $c are $wpdb->prefix . 'hardcoded_table' — not user input; table names cannot use prepare() placeholders.
		$count_sql = "SELECT COUNT(DISTINCT LOWER(TRIM(e.payee))) FROM $t e $where";
		$total     = empty( $args )
			? (int) $wpdb->get_var( $count_sql )
			: (int) $wpdb->get_var( $wpdb->prepare( $count_sql, ...$args ) );

		$sql = "SELECT
            MIN(e.payee)        AS payee_display,
            COUNT(*)            AS payment_count,
            SUM(e.amount)       AS total_spent,
            MAX(e.expense_date) AS last_payment,
            MIN(e.expense_date) AS first_payment,
            MIN(e.address)      AS address,
            GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR '\x01') AS categories
        FROM $t e
        LEFT JOIN $c c ON c.id = e.category_id
        $where
        GROUP BY LOWER(TRIM(e.payee))
        ORDER BY $orderby $order, payee_display ASC
        LIMIT %d OFFSET %d";

		$q_args = array_merge( $args, array( $per_page, $offset ) );
		$rows   = $wpdb->get_results( $wpdb->prepare( $sql, ...$q_args ) );
		// phpcs:enable

		foreach ( $rows as $r ) {
			$r->payment_count = (int) $r->payment_count;
			$r->total_spent   = (float) $r->total_spent;
			$r->categories    = $r->categories ? explode( "\x01", $r->categories ) : array();
		}

		return rest_ensure_response(
			array(
				'total'    => $total,
				'page'     => $page,
				'per_page' => $per_page,
				'data'     => $rows,
			)
		);
	}

	/**
	 * Rename a payee on every expenditure, matching the old name without regard to case.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function rename_payee( WP_REST_Request $req ) {
		global $wpdb;
		$old_name    = sanitize_text_field( $req->get_param( 'old_name' ) ?? '' );
		$new_name    = sanitize_text_field( $req->get_param( 'new_name' ) ?? '' );
		$new_address = sanitize_text_field( $req->get_param( 'new_address' ) ?? '' );

		if ( ! $old_name || ! $new_name ) {
			return new WP_Error( 'missing', 'old_name and new_name are required.', array( 'status' => 400 ) );
		}

		$t = $wpdb->prefix . 'lsfh_expenditures';
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$updated = $wpdb->query(
			$wpdb->prepare(
				"UPDATE $t SET payee = %s, address = %s WHERE LOWER(TRIM(payee)) = LOWER(TRIM(%s))",
				$new_name,
				$new_address,
				$old_name
			)
		);
		// phpcs:enable

		return rest_ensure_response( array( 'updated' => (int) $updated ) );
	}
}
