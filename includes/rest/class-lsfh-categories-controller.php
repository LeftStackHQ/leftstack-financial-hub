<?php
/**
 * Budget category routes: list, add, edit, delete.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Budget category routes: list, add, edit, delete.
 */
class LSFH_Categories_Controller extends LSFH_REST_Base {

	/**
	 * List the budget categories.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function list_categories( WP_REST_Request $req ) {
		global $wpdb;
		$rows = $wpdb->get_results( "SELECT * FROM {$wpdb->prefix}lsfh_budget_categories ORDER BY sort_order, name" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		foreach ( $rows as $r ) {
			$r->id            = (int) $r->id;
			$r->sort_order    = (int) $r->sort_order;
			$r->budget_amount = (float) $r->budget_amount;
		}
		return rest_ensure_response( $rows );
	}

	/**
	 * Add a budget category.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function create_category( WP_REST_Request $req ) {
		global $wpdb;
		$p    = $req->get_json_params() ?? array();
		$name = sanitize_text_field( $p['name'] ?? '' );
		if ( '' === $name ) {
			return new WP_Error( 'missing', 'A category needs a name.', array( 'status' => 400 ) );
		}
		$max   = (int) $wpdb->get_var( "SELECT MAX(sort_order) FROM {$wpdb->prefix}lsfh_budget_categories" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$color = sanitize_hex_color( $p['color'] ?? '' );
		$d     = array(
			'name'          => $name,
			'color'         => $color ?: null,
			'sort_order'    => $max + 1,
			'budget_amount' => max( 0.0, (float) ( $p['budget_amount'] ?? 0 ) ),
			'created_at'    => current_time( 'mysql' ),
		);
		$wpdb->insert( $wpdb->prefix . 'lsfh_budget_categories', $d ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		return rest_ensure_response(
			array(
				'id'            => $wpdb->insert_id,
				'name'          => $d['name'],
				'color'         => $d['color'],
				'sort_order'    => $d['sort_order'],
				'budget_amount' => $d['budget_amount'],
			)
		);
	}

	/**
	 * Update the fields sent for a budget category.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function update_category( WP_REST_Request $req ) {
		global $wpdb;
		$id = (int) $req->get_param( 'id' );
		$p  = $req->get_json_params() ?? array();
		$d  = array();
		// Only the fields that were sent are changed, so reordering or recoloring a
		// category cannot blank its name.
		if ( array_key_exists( 'name', $p ) ) {
			$name = sanitize_text_field( $p['name'] );
			if ( '' === $name ) {
				return new WP_Error( 'missing', 'A category needs a name.', array( 'status' => 400 ) );
			}
			$d['name'] = $name;
		}
		if ( isset( $p['sort_order'] ) ) {
			$d['sort_order'] = (int) $p['sort_order'];
		}
		if ( array_key_exists( 'color', $p ) ) {
			$d['color'] = sanitize_hex_color( $p['color'] ?? '' ) ?: null;
		}
		if ( array_key_exists( 'budget_amount', $p ) ) {
			$d['budget_amount'] = max( 0.0, (float) $p['budget_amount'] );
		}
		if ( ! $d ) {
			return new WP_Error( 'nothing', 'No fields to update.', array( 'status' => 400 ) );
		}
		$wpdb->update( $wpdb->prefix . 'lsfh_budget_categories', $d, array( 'id' => $id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		return rest_ensure_response( array( 'id' => $id ) + $d );
	}

	/**
	 * Delete a budget category. Its expenses become uncategorized.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function delete_category( WP_REST_Request $req ) {
		global $wpdb;
		$id = (int) $req->get_param( 'id' );
		// Expenses in this category become uncategorized, as the confirmation says. Without
		// this they kept a category ID that no longer exists and dropped out of the budget totals.
		$wpdb->update( $wpdb->prefix . 'lsfh_expenditures', array( 'category_id' => null ), array( 'category_id' => $id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->update( $wpdb->prefix . 'lsfh_budget_categories', array( 'parent_id' => null ), array( 'parent_id' => $id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->delete( $wpdb->prefix . 'lsfh_budget_categories', array( 'id' => $id ), array( '%d' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		return rest_ensure_response( array( 'deleted' => $id ) );
	}
}
