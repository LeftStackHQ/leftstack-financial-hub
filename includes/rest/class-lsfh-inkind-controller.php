<?php
/**
 * In-kind contribution routes: list, add, edit, delete, bulk delete.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * In-kind contribution routes: list, add, edit, delete, bulk delete.
 */
class LSFH_InKind_Controller extends LSFH_REST_Base {

	/**
	 * List in-kind contributions, with filters, sorting, paging and totals.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function list_inkind( WP_REST_Request $req ) {
		global $wpdb;
		$t        = $wpdb->prefix . 'lsfh_inkind';
		$per_page = self::per_page( $req, 50, 500 );
		$page     = max( 1, (int) ( $req->get_param( 'page' ) ?? 1 ) );
		$offset   = ( $page - 1 ) * $per_page;

		$wheres = array();
		$values = array();
		$df     = sanitize_text_field( $req->get_param( 'date_from' ) ?? '' );
		$dt     = sanitize_text_field( $req->get_param( 'date_to' ) ?? '' );
		$pid    = $req->get_param( 'filing_period_id' );
		$s      = sanitize_text_field( $req->get_param( 'search' ) ?? '' );
		if ( $df ) {
			$wheres[] = 'donation_date >= %s';
			$values[] = $df;}
		if ( $dt ) {
			$wheres[] = 'donation_date <= %s';
			$values[] = $dt;}
		if ( $pid ) {
			$wheres[] = 'filing_period_id = %d';
			$values[] = (int) $pid;}
		if ( $s ) {
			$like     = '%' . $wpdb->esc_like( $s ) . '%';
			$values[] = $like;
			$values[] = $like;
			$amount   = self::search_amount( $s );
			if ( null === $amount ) {
				$wheres[] = '(donor_name LIKE %s OR description LIKE %s)';
			} else {
				// A number also matches a gift of that value.
				$wheres[] = '(donor_name LIKE %s OR description LIKE %s OR ROUND(ABS(value),2) = %f)';
				$values[] = $amount;
			}
		}
		$where_sql = $wheres ? 'WHERE ' . implode( ' AND ', $wheres ) : '';

		$ik_allowed = array( 'donation_date', 'donor_name', 'value', 'fec_report_date' );
		$ik_ob      = in_array( $req->get_param( 'orderby' ), $ik_allowed, true ) ? $req->get_param( 'orderby' ) : 'donation_date';
		$ik_od      = strtoupper( $req->get_param( 'order' ) ?? 'DESC' ) === 'ASC' ? 'ASC' : 'DESC';

		// phpcs:disable WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber
		$total     = (int) $wpdb->get_var( self::prepared( "SELECT COUNT(*) FROM $t $where_sql", $values ) );
		$total_val = (float) $wpdb->get_var( self::prepared( "SELECT COALESCE(SUM(value),0) FROM $t $where_sql", $values ) );
		$values[]  = $per_page;
		$values[]  = $offset;
		$rows      = $wpdb->get_results( self::prepared( "SELECT * FROM $t $where_sql ORDER BY $ik_ob $ik_od, id DESC LIMIT %d OFFSET %d", $values ) );
		// phpcs:enable

		foreach ( $rows as $r ) {
			$r->id    = (int) $r->id;
			$r->value = (float) $r->value;}
		return rest_ensure_response(
			array(
				'total'       => $total,
				'total_value' => $total_val,
				'page'        => $page,
				'per_page'    => $per_page,
				'data'        => $rows,
			)
		);
	}

	/**
	 * Clean the fields of an in-kind contribution from a request body.
	 *
	 * @param array $p Request body.
	 * @return array Every field, with defaults for the ones not supplied.
	 */
	public static function sanitize_inkind( array $p ) {
		return array(
			'donation_date'    => sanitize_text_field( $p['donation_date'] ?? '' ) ?: null,
			'donor_name'       => sanitize_text_field( $p['donor_name'] ?? '' ),
			'address'          => sanitize_text_field( $p['address'] ?? '' ),
			'occupation'       => sanitize_text_field( $p['occupation'] ?? '' ),
			'employer'         => sanitize_text_field( $p['employer'] ?? '' ),
			'description'      => sanitize_textarea_field( $p['description'] ?? '' ),
			'value'            => (float) ( $p['value'] ?? 0 ),
			'fec_report_date'  => sanitize_text_field( $p['fec_report_date'] ?? '' ) ?: null,
			'notes'            => sanitize_textarea_field( $p['notes'] ?? '' ),
			'filing_period_id' => ! empty( $p['filing_period_id'] ) ? (int) $p['filing_period_id'] : null,
		);
	}

	/**
	 * Fetch one in-kind contribution.
	 *
	 * @param int $id In-kind contribution ID.
	 * @return object|null
	 */
	public static function get_inkind_row( $id ) {
		global $wpdb;
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}lsfh_inkind WHERE id=%d", $id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		if ( $row ) {
			$row->value = (float) $row->value;
		}
		return $row;
	}

	/**
	 * Add an in-kind contribution.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function create_inkind( WP_REST_Request $req ) {
		global $wpdb;
		$d               = self::sanitize_inkind( $req->get_json_params() ?? array() );
		$d['created_at'] = current_time( 'mysql' );
		$d['updated_at'] = current_time( 'mysql' );
		if ( ! $wpdb->insert( $wpdb->prefix . 'lsfh_inkind', $d ) ) { // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			return new WP_Error( 'db_error', 'Insert failed', array( 'status' => 500 ) );
		}
		return rest_ensure_response( self::get_inkind_row( $wpdb->insert_id ) );
	}

	/**
	 * Update the fields sent for an in-kind contribution.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function update_inkind( WP_REST_Request $req ) {
		global $wpdb;
		$id     = (int) $req->get_param( 'id' );
		$params = $req->get_json_params() ?? array();
		// Same present-fields guard as update_donation and update_expenditure: every field
		// defaults when absent, so a partial body would otherwise blank the donor name and
		// zero the value.
		$d = array();
		foreach ( self::sanitize_inkind( $params ) as $key => $value ) {
			if ( array_key_exists( $key, $params ) ) {
				$d[ $key ] = $value;
			}
		}
		if ( $d ) {
			$d['updated_at'] = current_time( 'mysql' );
			$wpdb->update( $wpdb->prefix . 'lsfh_inkind', $d, array( 'id' => $id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		}
		$row = self::get_inkind_row( $id );
		if ( ! $row ) {
			return new WP_Error( 'not_found', 'In-kind contribution not found.', array( 'status' => 404 ) );
		}
		return rest_ensure_response( $row );
	}

	/**
	 * Delete an in-kind contribution.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function delete_inkind( WP_REST_Request $req ) {
		global $wpdb;
		$id = (int) $req->get_param( 'id' );
		$wpdb->delete( $wpdb->prefix . 'lsfh_inkind', array( 'id' => $id ), array( '%d' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		return rest_ensure_response( array( 'deleted' => $id ) );
	}

	/**
	 * Delete several in-kind contributions.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function bulk_delete_inkind( WP_REST_Request $req ) {
		global $wpdb;
		$ids = array_values( array_filter( array_map( 'absint', (array) ( $req->get_json_params()['ids'] ?? array() ) ) ) );
		if ( ! $ids ) {
			return rest_ensure_response( array( 'deleted' => 0 ) );
		}
		$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$deleted = $wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->prefix}lsfh_inkind WHERE id IN ($placeholders)", ...$ids ) );
		return rest_ensure_response( array( 'deleted' => (int) $deleted ) );
	}
}
