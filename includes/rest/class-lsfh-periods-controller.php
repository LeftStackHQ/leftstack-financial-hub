<?php
/**
 * Filing period routes: list, add, edit, delete, and moving records into a period.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Filing period routes: list, add, edit, delete, and moving records into a period.
 */
class LSFH_Periods_Controller extends LSFH_REST_Base {

	/**
	 * List filing periods, each with its beginning balance.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function list_periods( WP_REST_Request $req ) {
		global $wpdb;
		$rows = $wpdb->get_results( "SELECT * FROM {$wpdb->prefix}lsfh_filing_periods ORDER BY start_date DESC" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		if ( empty( $rows ) ) {
			return rest_ensure_response( array() );
		}
		$global_bb = (float) get_option( 'lsfh_beginning_balance', 0 );
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		foreach ( $rows as $r ) {
			$r->id                = (int) $r->id;
			$r->beginning_balance = (float) $r->beginning_balance;
			if ( 0.0 !== $r->beginning_balance ) {
				$r->computed_beginning_balance = $r->beginning_balance;
			} elseif ( ! $r->start_date || '0000-00-00' === $r->start_date ) {
				$r->computed_beginning_balance = $global_bb;
			} else {
				$r->computed_beginning_balance = LSFH_Balance::opening_balance_before( $r->start_date );
			}
		}
		// phpcs:enable
		return rest_ensure_response( $rows );
	}

	/**
	 * Clean and check a filing period from a request body.
	 *
	 * @param array $p Request body.
	 * @return array|WP_Error The fields, or an error describing what is wrong.
	 */
	public static function sanitize_period( array $p ) {
		$d = array(
			'name'              => sanitize_text_field( $p['name'] ?? '' ),
			'start_date'        => sanitize_text_field( $p['start_date'] ?? '' ),
			'end_date'          => sanitize_text_field( $p['end_date'] ?? '' ),
			'beginning_balance' => (float) ( $p['beginning_balance'] ?? 0 ),
			'election_type'     => sanitize_text_field( $p['election_type'] ?? '' ),
		);
		if ( '' === $d['name'] ) {
			return new WP_Error( 'missing', 'A filing period needs a name.', array( 'status' => 400 ) );
		}
		if ( '' === $d['election_type'] && LSFH_Period_Elections::hidden() ) {
			$d['election_type'] = 'local';
		}
		if ( '' === $d['election_type'] ) {
			return new WP_Error( 'missing_election', 'Choose the election type of this period.', array( 'status' => 400 ) );
		}
		$d['election_type'] = strtolower( $d['election_type'] );
		if ( ! in_array( $d['election_type'], LSFH_Period_Elections::TYPES, true ) ) {
			return new WP_Error( 'invalid_election', 'Choose one of the listed election types.', array( 'status' => 400 ) );
		}
		foreach ( array( 'start_date', 'end_date' ) as $field ) {
			$parts = explode( '-', $d[ $field ] );
			if ( 3 !== count( $parts ) || ! ctype_digit( implode( '', $parts ) ) || ! checkdate( (int) $parts[1], (int) $parts[2], (int) $parts[0] ) ) {
				return new WP_Error( 'invalid_date', 'Use a valid start and end date (YYYY-MM-DD).', array( 'status' => 400 ) );
			}
		}
		if ( $d['end_date'] < $d['start_date'] ) {
			return new WP_Error( 'invalid_range', 'A filing period cannot end before it starts.', array( 'status' => 400 ) );
		}
		return $d;
	}

	/**
	 * Add a filing period.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function create_period( WP_REST_Request $req ) {
		global $wpdb;
		$d = self::sanitize_period( $req->get_json_params() ?? array() );
		if ( is_wp_error( $d ) ) {
			return $d;
		}
		$d['created_at'] = current_time( 'mysql' );
		if ( ! $wpdb->insert( $wpdb->prefix . 'lsfh_filing_periods', $d ) ) { // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			return new WP_Error( 'db_error', 'Insert failed', array( 'status' => 500 ) );
		}
		LSFH_Periods::flush();
		$row                    = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}lsfh_filing_periods WHERE id=%d", $wpdb->insert_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$row->beginning_balance = (float) $row->beginning_balance;
		return rest_ensure_response( $row );
	}

	/**
	 * Update a filing period.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function update_period( WP_REST_Request $req ) {
		global $wpdb;
		$id = (int) $req->get_param( 'id' );
		$d  = self::sanitize_period( $req->get_json_params() ?? array() );
		if ( is_wp_error( $d ) ) {
			return $d;
		}
		$wpdb->update( $wpdb->prefix . 'lsfh_filing_periods', $d, array( 'id' => $id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		LSFH_Periods::flush();
		return rest_ensure_response( array( 'id' => $id ) + $d );
	}

	/**
	 * Delete a filing period. A period that records are still filed under is refused with how many, unless force is set,
	 * in which case those records go back to no period (the ledger sync places them by their dates again).
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function delete_period( WP_REST_Request $req ) {
		global $wpdb;
		$id = (int) $req['id'];
		if ( ! self::get_period( $id ) ) {
			return new WP_Error( 'not_found', 'Filing period not found.', array( 'status' => 404 ) );
		}
		$usage = LSFH_Periods::usage( $id );
		if ( array_sum( $usage ) && ! $req['force'] ) {
			return new WP_Error(
				'period_in_use',
				'Records are still filed under this period.',
				array(
					'status' => 409,
					'usage'  => $usage,
				)
			);
		}
		$wpdb->query( 'START TRANSACTION' ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		LSFH_Periods::release( $id );
		$wpdb->delete( $wpdb->prefix . 'lsfh_filing_periods', array( 'id' => $id ), array( '%d' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query( 'COMMIT' ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		LSFH_Periods::flush();
		return rest_ensure_response(
			array(
				'deleted'  => $id,
				'released' => array_sum( $usage ),
			)
		);
	}

	/**
	 * SQL that picks the rows dated inside a period that are filed under some other period (or none).
	 *
	 * A row is left alone when a shorter period also covers its date, because that one is the more specific home.
	 *
	 * @param object $period The filing period row.
	 * @param string $col    The table's date column.
	 * @return string A WHERE condition, already prepared.
	 */
	public static function period_stray_where( $period, $col ) {
		global $wpdb;
		return LSFH_Periods::governed_where( $period, $col ) . $wpdb->prepare( ' AND (filing_period_id IS NULL OR filing_period_id <> %d)', $period->id );
	}

	/**
	 * Read one filing period, or null when it does not exist.
	 *
	 * @param int $id Period ID.
	 * @return object|null
	 */
	public static function get_period( $id ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}lsfh_filing_periods WHERE id = %d", $id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
	}

	/**
	 * Preview what "assign records by date" would move into a filing period.
	 *
	 * Creating or editing a period never moves existing records, because a record keeps the period
	 * it was given. This lists the ones dated inside the period that sit in a different one.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function period_records_preview( WP_REST_Request $req ) {
		global $wpdb;
		$period = self::get_period( (int) $req->get_param( 'id' ) );
		if ( ! $period ) {
			return new WP_Error( 'not_found', 'Filing period not found.', array( 'status' => 404 ) );
		}
		$names  = $wpdb->get_results( "SELECT id, name FROM {$wpdb->prefix}lsfh_filing_periods", OBJECT_K ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$from   = array();
		$totals = array_fill_keys( array_keys( LSFH_Periods::period_tables() ), 0 );
		foreach ( LSFH_Periods::period_tables() as $table => $col ) {
			$where = self::period_stray_where( $period, $col );
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
			$rows = $wpdb->get_results( "SELECT COALESCE(filing_period_id, 0) AS pid, COUNT(*) AS n FROM {$wpdb->prefix}lsfh_$table WHERE $where GROUP BY pid" );
			foreach ( $rows as $r ) {
				$pid = (int) $r->pid;
				if ( ! isset( $from[ $pid ] ) ) {
					$from[ $pid ] = array(
						'period_id' => $pid,
						'name'      => $pid && isset( $names[ $pid ] ) ? $names[ $pid ]->name : 'No period',
					) + array_fill_keys( array_keys( LSFH_Periods::period_tables() ), 0 );
				}
				$from[ $pid ][ $table ] = (int) $r->n;
				$totals[ $table ]      += (int) $r->n;
			}
		}
		return rest_ensure_response(
			array(
				'period' => array(
					'id'         => (int) $period->id,
					'name'       => $period->name,
					'start_date' => $period->start_date,
					'end_date'   => $period->end_date,
				),
				'from'   => array_values( $from ),
				'totals' => $totals,
				'total'  => array_sum( $totals ),
			)
		);
	}

	/**
	 * Move the records dated inside a filing period into it.
	 *
	 * Touches only the rows the preview lists. A deposit that holds a moved donation takes the
	 * period its donations now carry, so the Disbursements view stays in step.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function period_records_assign( WP_REST_Request $req ) {
		global $wpdb;
		$period = self::get_period( (int) $req->get_param( 'id' ) );
		if ( ! $period ) {
			return new WP_Error( 'not_found', 'Filing period not found.', array( 'status' => 404 ) );
		}
		$moved = array_fill_keys( array_keys( LSFH_Periods::period_tables() ), 0 );

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$wpdb->query( 'START TRANSACTION' );
		$deposits = array();
		foreach ( LSFH_Periods::period_tables() as $table => $col ) {
			$where = self::period_stray_where( $period, $col );
			$t     = $wpdb->prefix . 'lsfh_' . $table;
			if ( 'donations' === $table ) {
				$deposits = $wpdb->get_col( "SELECT DISTINCT disbursement_id FROM $t WHERE disbursement_id IS NOT NULL AND disbursement_id <> '' AND $where" );
				$sql      = $wpdb->prepare( "UPDATE $t SET filing_period_id = %d, updated_at = %s WHERE $where", $period->id, current_time( 'mysql' ) );
			} else {
				$sql = $wpdb->prepare( "UPDATE $t SET filing_period_id = %d WHERE $where", $period->id );
			}
			$result = $wpdb->query( $sql );
			if ( false === $result ) {
				$wpdb->query( 'ROLLBACK' );
				return new WP_Error( 'db_error', 'Could not move the records. Nothing was changed.', array( 'status' => 500 ) );
			}
			$moved[ $table ] = (int) $result;
		}
		foreach ( $deposits as $disbursement_id ) {
			$wpdb->query(
				$wpdb->prepare(
					"UPDATE {$wpdb->prefix}lsfh_actblue_disbursements SET filing_period_id = (
						SELECT MAX(filing_period_id) FROM {$wpdb->prefix}lsfh_donations WHERE disbursement_id = %s AND filing_period_id IS NOT NULL
					) WHERE disbursement_id = %s",
					$disbursement_id,
					$disbursement_id
				)
			);
		}
		$wpdb->query( 'COMMIT' );
		// phpcs:enable

		return rest_ensure_response(
			array(
				'moved' => $moved,
				'total' => array_sum( $moved ),
			)
		);
	}

	/**
	 * What setting the election of the donations inside a period to the period's election would change.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function period_election_preview( WP_REST_Request $req ) {
		$period = self::get_period( (int) $req['id'] );
		if ( ! $period ) {
			return new WP_Error( 'not_found', 'Filing period not found.', array( 'status' => 404 ) );
		}
		return rest_ensure_response(
			LSFH_Period_Elections::preview( $period ) + array(
				'period' => array(
					'id'         => (int) $period->id,
					'name'       => $period->name,
					'start_date' => $period->start_date,
					'end_date'   => $period->end_date,
				),
			)
		);
	}

	/**
	 * Set the election of the donations inside a period to the period's election.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function period_election_apply( WP_REST_Request $req ) {
		$period = self::get_period( (int) $req['id'] );
		if ( ! $period ) {
			return new WP_Error( 'not_found', 'Filing period not found.', array( 'status' => 404 ) );
		}
		$done = LSFH_Period_Elections::apply( $period );
		return is_wp_error( $done ) ? $done : rest_ensure_response( $done );
	}
}
