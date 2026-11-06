<?php
/**
 * Donor route: the aggregated donor list with contribution limits.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Donor route: the aggregated donor list with contribution limits.
 */
class LSFH_Donors_Controller extends LSFH_REST_Base {

	/**
	 * List donors with their totals per election and how close they are to the contribution limits.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function list_donors( WP_REST_Request $req ) {
		global $wpdb;
		$t        = $wpdb->prefix . 'lsfh_donations';
		$search   = sanitize_text_field( $req->get_param( 'search' ) ?? '' );
		$filter   = sanitize_key( $req->get_param( 'filter' ) ?? '' ); // One of maxed, repeat, or empty.
		$d_state  = strtoupper( sanitize_text_field( $req->get_param( 'state' ) ?? '' ) );
		$d_city   = sanitize_text_field( $req->get_param( 'city' ) ?? '' );
		$d_zip    = sanitize_text_field( $req->get_param( 'zip' ) ?? '' );
		$fpage    = sanitize_text_field( $req->get_param( 'fundraising_page' ) ?? '' );
		$per_page = self::per_page( $req, 100, 500 );
		$page     = max( 1, (int) ( $req->get_param( 'page' ) ?? 1 ) );
		$offset   = ( $page - 1 ) * $per_page;

		$wheres = array();
		$args   = array();

		if ( $search ) {
			$like     = '%' . $wpdb->esc_like( $search ) . '%';
			$wheres[] = '(d.first_name LIKE %s OR d.last_name LIKE %s OR CONCAT(d.first_name," ",d.last_name) LIKE %s)';
			$args     = array_merge( $args, array( $like, $like, $like ) );
		}
		if ( $d_state ) {
			$wheres[] = 'd.state = %s';
			$args[]   = $d_state;
		}
		if ( $d_city ) {
			$wheres[] = 'd.city LIKE %s';
			$args[]   = '%' . $wpdb->esc_like( $d_city ) . '%';
		}
		if ( $d_zip ) {
			$zl       = '%' . $wpdb->esc_like( $d_zip ) . '%';
			$wheres[] = '(d.zip LIKE %s OR d.zip_formatted LIKE %s)';
			$args     = array_merge( $args, array( $zl, $zl ) );
		}
		if ( $fpage ) {
			$wheres[] = 'd.fundraising_page = %s';
			$args[]   = $fpage;
		}
		$where = $wheres ? 'WHERE ' . implode( ' AND ', $wheres ) : '';

		// Contribution limits — individual, then organization / PAC.
		$caps         = LSFH_Donor_Limits::caps();
		$pl           = $caps['ind_primary'];
		$gl           = $caps['ind_general'];
		$near_pct     = $caps['near_pct'] / 100;
		$no_limit     = $caps['no_limit'];
		$np           = $pl * $near_pct;
		$ng           = $gl * $near_pct;
		$org_pl       = $caps['org_primary'];
		$org_gl       = $caps['org_general'];
		$org_no_limit = $caps['org_no_limit'];
		$org_np       = $org_pl * $near_pct;
		$org_ng       = $org_gl * $near_pct;

		// Inner aggregate — no correlated subqueries.
		// MAX(id) identifies the most-recent row per donor; we JOIN on it once via primary key.
		$fn_key       = LSFH_Donor_Key::first_sql( 'd.' );
		$ln_key       = LSFH_Donor_Key::last_sql( 'd.' );
		$inner_having = 'repeat' === $filter ? 'HAVING COUNT(CASE WHEN d.gross_amount >= 0 THEN 1 END) >= 2' : '';
		$inner_sql    = "SELECT
    $fn_key AS fn_key,
    $ln_key AS ln_key,
    MIN(d.first_name)         AS first_name,
    MIN(d.last_name)          AS last_name,
    COUNT(CASE WHEN d.gross_amount >= 0 THEN 1 END) AS gift_count,
    SUM(d.gross_amount)       AS total_given,
    SUM(CASE WHEN d.election_type='primary' THEN d.gross_amount ELSE 0 END) AS primary_total,
    SUM(CASE WHEN d.election_type='general' THEN d.gross_amount ELSE 0 END) AS general_total,
    SUM(CASE WHEN d.election_type='runoff'  THEN d.gross_amount ELSE 0 END) AS runoff_total,
    MIN(d.contribution_date)  AS first_gift,
    MAX(d.contribution_date)  AS last_gift,
    MIN(d.address)            AS address,
    MIN(d.city)               AS city,
    MIN(d.state)              AS state,
    MIN(d.zip_formatted)      AS zip,
    MIN(d.occupation)         AS occupation,
    MIN(d.employer)           AS employer,
    " . LSFH_Org_Types::latest_sql( 'd.' ) . " AS org_type,
    MAX(d.id)                 AS latest_id
FROM {$t} d
$where
GROUP BY fn_key, ln_key
$inner_having";

		// limit_status references agg columns + latest.donor_type from the JOIN.
		if ( $no_limit ) {
			$limit_status_expr = '0';
		} else {
			$ind_expr          = "CASE WHEN agg.primary_total >= $pl OR agg.general_total >= $gl THEN 2
                              WHEN agg.primary_total >= $np OR agg.general_total >= $ng THEN 1
                              ELSE 0 END";
			$org_expr          = $org_no_limit ? '0' :
						"CASE WHEN agg.primary_total >= $org_pl OR agg.general_total >= $org_gl THEN 2
                              WHEN agg.primary_total >= $org_np OR agg.general_total >= $org_ng THEN 1
                              ELSE 0 END";
			$exempt            = LSFH_Org_Types::exempt_sql( 'agg.' );
			$limit_status_expr = "CASE WHEN latest.donor_type = 'organization' THEN (CASE WHEN $exempt THEN 0 ELSE $org_expr END) ELSE $ind_expr END";
		}

		// 'maxed' filter: needs donor_type from the JOIN so applied as outer WHERE
		$outer_wheres = array();
		// Organisations vs individuals. Applied out here, not in the inner
		// aggregate, because donor_type belongs to the donor's most recent
		// contribution (latest), not to the grouped totals — same reason the
		// 'maxed' filter below lives here. No user value reaches the SQL: the
		// parameter only picks between two fixed clauses. A NULL donor_type
		// counts as an individual, matching how those rows already export.
		$contributor = strtoupper( sanitize_text_field( $req->get_param( 'contributor_type' ) ?? '' ) );
		if ( 'O' === $contributor ) {
			$outer_wheres[] = "latest.donor_type = 'organization'";
		} elseif ( 'I' === $contributor ) {
			$outer_wheres[] = "( latest.donor_type IS NULL OR latest.donor_type <> 'organization' )";
		}
		if ( 'maxed' === $filter && ! $no_limit ) {
			$org_limit_check = $org_no_limit ? '0' : '(NOT COALESCE(' . LSFH_Org_Types::exempt_sql( 'agg.' ) . ", 0) AND (agg.primary_total >= $org_pl OR agg.general_total >= $org_gl))";
			$outer_wheres[]  = "(CASE
                WHEN latest.donor_type = 'organization' THEN $org_limit_check
                ELSE (agg.primary_total >= $pl OR agg.general_total >= $gl)
            END) = 1";
		}
		$outer_where = $outer_wheres ? 'WHERE ' . implode( ' AND ', $outer_wheres ) : '';

		// Sort — map logical names to their aliased columns in the outer query.
		$sort_col = array(
			'total_given'   => 'agg.total_given',
			'gift_count'    => 'agg.gift_count',
			'last_name'     => 'agg.last_name',
			'first_name'    => 'agg.first_name',
			'last_gift'     => 'agg.last_gift',
			'primary_total' => 'agg.primary_total',
			'general_total' => 'agg.general_total',
			'city'          => 'agg.city',
			'state'         => 'agg.state',
			'limit_status'  => 'limit_status',
		);
		$ob       = in_array( $req->get_param( 'orderby' ), array_keys( $sort_col ), true ) ? $req->get_param( 'orderby' ) : 'total_given';
		$od       = strtoupper( $req->get_param( 'order' ) ?? 'DESC' ) === 'ASC' ? 'ASC' : 'DESC';
		$ob_col   = $sort_col[ $ob ];

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare
		$count_sql = "SELECT COUNT(*) FROM ($inner_sql) agg
JOIN {$t} latest ON latest.id = agg.latest_id
$outer_where";
		$total     = (int) ( empty( $args ) ? $wpdb->get_var( $count_sql ) : $wpdb->get_var( $wpdb->prepare( $count_sql, ...$args ) ) );

		$data_args = array_merge( $args, array( $per_page, $offset ) );
		$sql       = "SELECT
    agg.first_name, agg.last_name,
    agg.gift_count, agg.total_given,
    agg.primary_total, agg.general_total, agg.runoff_total,
    agg.first_gift, agg.last_gift,
    agg.address, agg.city, agg.state, agg.zip,
    agg.occupation, agg.employer,
    latest.donor_type,
    agg.org_type,
    latest.email,
    latest.phone,
    latest.recurring AS has_recurring,
    $limit_status_expr AS limit_status
FROM ($inner_sql) agg
JOIN {$t} latest ON latest.id = agg.latest_id
$outer_where
ORDER BY $ob_col $od, agg.last_name ASC, agg.first_name ASC, agg.latest_id DESC
LIMIT %d OFFSET %d";

		$rows = empty( $args )
			? $wpdb->get_results( $wpdb->prepare( $sql, $per_page, $offset ) )
			: $wpdb->get_results( $wpdb->prepare( $sql, ...$data_args ) );
		// phpcs:enable

		foreach ( $rows as $r ) {
			$r->gift_count    = (int) $r->gift_count;
			$r->total_given   = (float) $r->total_given;
			$r->primary_total = (float) $r->primary_total;
			$r->general_total = (float) $r->general_total;
			$r->runoff_total  = (float) $r->runoff_total;
			$r->has_recurring = (bool) $r->has_recurring;
			$r->limit_status  = (int) $r->limit_status;
			$r->donor_type    = $r->donor_type ?? 'individual';
		}
		return rest_ensure_response(
			array(
				'total'    => $total,
				'pages'    => (int) ceil( $total / $per_page ),
				'page'     => $page,
				'per_page' => $per_page,
				'data'     => $rows,
			)
		);
	}
}
