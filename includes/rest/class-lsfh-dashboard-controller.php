<?php
/**
 * Dashboard routes: the dashboard figures, the budget view and the month list.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Dashboard routes: the dashboard figures, the budget view and the month list.
 */
class LSFH_Dashboard_Controller extends LSFH_REST_Base {

	/**
	 * Spending by budget category, for all time or one month, with the balance used for the Election Day projection.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function get_budget( WP_REST_Request $req ) {
		global $wpdb;
		$month = sanitize_text_field( $req->get_param( 'month' ) ?? '' ); // YYYY-MM or empty.

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter

		// Per-category spend — full cycle or single month.
		if ( $month && preg_match( '/^\d{4}-\d{2}$/', $month ) ) {
			$where = $wpdb->prepare( "WHERE DATE_FORMAT(e.expense_date, '%%Y-%%m') = %s", $month );
		} else {
			$where = '';
			$month = '';
		}

		$spent_rows = $wpdb->get_results(
			"SELECT e.category_id, COALESCE(SUM(e.amount), 0) AS spent
             FROM {$wpdb->prefix}lsfh_expenditures e
             $where
             GROUP BY e.category_id"
		);
		$spent_map  = array();
		foreach ( $spent_rows as $r ) {
			$spent_map[ (int) $r->category_id ] = (float) $r->spent;
		}

		// All categories with budget_amount.
		$categories  = $wpdb->get_results(
			"SELECT id, name, color, parent_id, sort_order, budget_amount
             FROM {$wpdb->prefix}lsfh_budget_categories
             ORDER BY sort_order, name"
		);
		$total_spent = 0.0;
		foreach ( $categories as $c ) {
			$c->id            = (int) $c->id;
			$c->sort_order    = (int) $c->sort_order;
			$c->budget_amount = (float) $c->budget_amount;
			$c->spent         = $spent_map[ $c->id ] ?? 0.0;
			$total_spent     += $c->spent;
		}

		// Balance (always all-time) for the Election Day projection. It counts scheduled
		// payments too, because they are money that will be gone by then.
		$scheduled = LSFH_Balance::scheduled_expenditures();
		$balance   = LSFH_Balance::current_balance() - $scheduled['total'];

		// phpcs:enable

		return rest_ensure_response(
			array(
				'month'         => $month,
				'categories'    => $categories,
				'total_spent'   => $total_spent,
				'balance'       => $balance,
				'election_date' => get_option( 'lsfh_election_date', '' ),
			)
		);
	}

	/**
	 * List the months that have donations, expenditures or in-kind contributions, for the date filter.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function get_months( WP_REST_Request $req ) {
		global $wpdb;
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$don = $wpdb->get_col( "SELECT DISTINCT DATE_FORMAT(contribution_date,'%Y-%m') AS m FROM {$wpdb->prefix}lsfh_donations   WHERE contribution_date IS NOT NULL AND contribution_date > '0000-00-00' ORDER BY m DESC" );
		$exp = $wpdb->get_col( "SELECT DISTINCT DATE_FORMAT(expense_date,      '%Y-%m') AS m FROM {$wpdb->prefix}lsfh_expenditures WHERE expense_date      IS NOT NULL AND expense_date      > '0000-00-00' ORDER BY m DESC" );
		$ink = $wpdb->get_col( "SELECT DISTINCT DATE_FORMAT(donation_date,     '%Y-%m') AS m FROM {$wpdb->prefix}lsfh_inkind       WHERE donation_date      IS NOT NULL AND donation_date      > '0000-00-00' ORDER BY m DESC" );
		// phpcs:enable
		return rest_ensure_response(
			array(
				'donations'    => array_values( array_filter( $don ) ),
				'expenditures' => array_values( array_filter( $exp ) ),
				'inkind'       => array_values( array_filter( $ink ) ),
			)
		);
	}

	/**
	 * Dashboard figures: balance, scheduled payments, totals, recent activity and contribution limits.
	 *
	 * Can be limited to a filing period or a date range.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function get_dashboard( WP_REST_Request $req ) {
		global $wpdb;
		$period_id = $req->get_param( 'filing_period_id' ) ? (int) $req->get_param( 'filing_period_id' ) : null;
		$date_from = sanitize_text_field( $req->get_param( 'date_from' ) ?? '' );
		$date_to   = sanitize_text_field( $req->get_param( 'date_to' ) ?? '' );

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$period_where   = $period_id ? $wpdb->prepare( 'AND filing_period_id = %d', $period_id ) : '';
		$don_date_where = '';
		$exp_date_where = '';
		$ink_date_where = '';
		if ( $date_from ) {
			$don_date_where .= $wpdb->prepare( ' AND contribution_date >= %s', $date_from );
			$exp_date_where .= $wpdb->prepare( ' AND expense_date >= %s', $date_from );
			$ink_date_where .= $wpdb->prepare( ' AND donation_date >= %s', $date_from );
		}
		if ( $date_to ) {
			$don_date_where .= $wpdb->prepare( ' AND contribution_date <= %s', $date_to );
			$exp_date_where .= $wpdb->prepare( ' AND expense_date <= %s', $date_to );
			$ink_date_where .= $wpdb->prepare( ' AND donation_date <= %s', $date_to );
		}

		$don = $wpdb->get_row(
			"SELECT
            SUM(gross_amount) AS total_gross,
            SUM(actblue_fee) AS total_fees,
            SUM(net_amount) AS total_net,
            SUM(CASE WHEN source='actblue' THEN gross_amount ELSE 0 END) AS actblue_total,
            SUM(CASE WHEN source IN('check','cash','manual') THEN gross_amount ELSE 0 END) AS manual_total,
            SUM(CASE WHEN election_type='primary' THEN gross_amount ELSE 0 END) AS primary_total,
            SUM(CASE WHEN election_type='general' THEN gross_amount ELSE 0 END) AS general_total,
            SUM(CASE WHEN report_type='itemized' THEN gross_amount ELSE 0 END) AS itemized_total,
            SUM(CASE WHEN report_type='unitemized' THEN gross_amount ELSE 0 END) AS unitemized_total,
            COUNT(CASE WHEN gross_amount >= 0 THEN 1 END) AS donation_count,
            SUM(CASE WHEN (reporting_status='pending' OR reporting_status IS NULL) THEN 1 ELSE 0 END) AS pending_count
            FROM {$wpdb->prefix}lsfh_donations WHERE 1=1 $period_where $don_date_where"
		);

		// Expenditures dated after today are scheduled, not spent yet: they stay out of the
		// balance and are reported separately below.
		$today = current_time( 'Y-m-d' );
		$exp   = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT SUM(amount) FROM {$wpdb->prefix}lsfh_expenditures WHERE expense_date <= %s $period_where $exp_date_where",
				$today
			)
		);
		// Scheduled is everything after today. It ignores the period and date filters,
		// because upcoming payments do not belong to a period.
		$sched = LSFH_Balance::scheduled_expenditures();

		$ink = $wpdb->get_var( "SELECT SUM(value) FROM {$wpdb->prefix}lsfh_inkind WHERE 1=1 $period_where $ink_date_where" );

		// Beginning balance from period, computed running balance (month filter), or global option.
		$beginning_balance = 0.0;
		if ( $period_id ) {
			$period_row = $wpdb->get_row(
				$wpdb->prepare(
					"SELECT beginning_balance, start_date FROM {$wpdb->prefix}lsfh_filing_periods WHERE id=%d",
					$period_id
				)
			);
			if ( $period_row ) {
				if ( 0.0 !== (float) $period_row->beginning_balance ) {
					// Treasurer explicitly stored a beginning balance for this period — use it.
					$beginning_balance = (float) $period_row->beginning_balance;
				} else {
					// Not explicitly set: compute the running balance up to the period start date,
					// the same way the month filter does, so the number is always correct even when
					// the per-period field is left at its default of 0.
					$beginning_balance = LSFH_Balance::opening_balance_before( $period_row->start_date );
				}
			}
		} elseif ( $date_from ) {
			// Month filter: the balance at the start of the selected month.
			$beginning_balance = LSFH_Balance::opening_balance_before( $date_from );
		} else {
			$beginning_balance = (float) get_option( 'lsfh_beginning_balance', 0 );
		}

		// Top donors — filtered totals + all-time per-election totals for limit math.
		$td2              = $wpdb->prefix . 'lsfh_donations';
		$fn_key           = LSFH_Donor_Key::first_sql();
		$ln_key           = LSFH_Donor_Key::last_sql();
		$org_type         = LSFH_Org_Types::latest_sql();
		$recent_donations = $wpdb->get_results(
			"SELECT
                agg.first_name, agg.last_name, agg.city, agg.state, agg.zip,
                agg.address, agg.occupation, agg.email, agg.phone, agg.donor_type, agg.org_type,
                agg.gift_count, agg.total_given, agg.total_fees, agg.last_gift,
                COALESCE(at.primary_total, 0) AS primary_total_all,
                COALESCE(at.general_total, 0) AS general_total_all,
                COALESCE(at.runoff_total,  0) AS runoff_total_all
             FROM (
                 SELECT
                     MIN(first_name) AS first_name, MIN(last_name) AS last_name,
                     MIN(donor_type) AS donor_type,
                     $org_type AS org_type,
                     COUNT(CASE WHEN gross_amount >= 0 THEN 1 END) AS gift_count,
                     SUM(gross_amount)  AS total_given,
                     SUM(actblue_fee)   AS total_fees,
                     MAX(contribution_date) AS last_gift,
                     $fn_key AS fn_key,
                     $ln_key AS ln_key,
                     -- pull contact/location fields from the most-recent donation for this donor
                     MAX(CASE WHEN city       <> '' AND city       IS NOT NULL THEN city       END) AS city,
                     MAX(CASE WHEN state      <> '' AND state      IS NOT NULL THEN state      END) AS state,
                     MAX(CASE WHEN zip_formatted <> '' AND zip_formatted IS NOT NULL THEN zip_formatted END) AS zip,
                     MAX(CASE WHEN address    <> '' AND address    IS NOT NULL THEN address    END) AS address,
                     MAX(CASE WHEN occupation <> '' AND occupation IS NOT NULL THEN occupation END) AS occupation,
                     MAX(CASE WHEN email      <> '' AND email      IS NOT NULL THEN email      END) AS email,
                     MAX(CASE WHEN phone      <> '' AND phone      IS NOT NULL THEN phone      END) AS phone
                 FROM $td2
                 WHERE 1=1 $period_where $don_date_where
                 GROUP BY fn_key, ln_key
                 ORDER BY total_given DESC
                 LIMIT 10
             ) agg
             LEFT JOIN (
                 SELECT
                     $fn_key AS fn_key,
                     $ln_key AS ln_key,
                     SUM(CASE WHEN election_type='primary' THEN gross_amount ELSE 0 END) AS primary_total,
                     SUM(CASE WHEN election_type='general' THEN gross_amount ELSE 0 END) AS general_total,
                     SUM(CASE WHEN election_type='runoff'  THEN gross_amount ELSE 0 END) AS runoff_total
                 FROM $td2
                 GROUP BY $fn_key, $ln_key
             ) at ON at.fn_key = agg.fn_key AND at.ln_key = agg.ln_key
             ORDER BY agg.total_given DESC"
		);

		// Recent expenditures (last 10).
		$recent_exp = $wpdb->get_results( "SELECT e.id,e.payee,e.amount,e.expense_date,e.payment_method,c.name AS category_name FROM {$wpdb->prefix}lsfh_expenditures e LEFT JOIN {$wpdb->prefix}lsfh_budget_categories c ON c.id=e.category_id ORDER BY e.expense_date DESC, e.id DESC LIMIT 10" );
		// phpcs:enable

		$total_raised = (float) ( $don->total_gross ?? 0 );
		$total_exp    = (float) ( $exp ?? 0 );
		$balance      = $beginning_balance + $total_raised - $total_exp;
		$sched_total  = $sched['total'];

		foreach ( $recent_donations as $r ) {
			$r->gift_count        = (int) $r->gift_count;
			$r->total_given       = (float) $r->total_given;
			$r->total_fees        = (float) $r->total_fees;
			$r->primary_total_all = (float) $r->primary_total_all;
			$r->general_total_all = (float) $r->general_total_all;
			$r->runoff_total_all  = (float) $r->runoff_total_all;
		}
		foreach ( $recent_exp as $r ) {
			$r->id     = (int) $r->id;
			$r->amount = (float) $r->amount;}

		return rest_ensure_response(
			array(
				'beginning_balance'       => $beginning_balance,
				'total_raised'            => $total_raised,
				'total_fees'              => (float) ( $don->total_fees ?? 0 ),
				'total_net'               => (float) ( $don->total_net ?? 0 ),
				'actblue_total'           => (float) ( $don->actblue_total ?? 0 ),
				'manual_total'            => (float) ( $don->manual_total ?? 0 ),
				'primary_total'           => (float) ( $don->primary_total ?? 0 ),
				'general_total'           => (float) ( $don->general_total ?? 0 ),
				'itemized_total'          => (float) ( $don->itemized_total ?? 0 ),
				'unitemized_total'        => (float) ( $don->unitemized_total ?? 0 ),
				'donation_count'          => (int) ( $don->donation_count ?? 0 ),
				'pending_count'           => (int) ( $don->pending_count ?? 0 ),
				'total_expenditures'      => $total_exp,
				'inkind_total'            => (float) ( $ink ?? 0 ),
				'balance'                 => $balance,
				'scheduled_total'         => $sched_total,
				'scheduled_count'         => $sched['count'],
				'balance_after_scheduled' => $balance - $sched_total,
				'campaign_goal'           => (float) get_option( 'lsfh_campaign_goal', 0 ),
				'recent_donations'        => $recent_donations,
				'recent_expenditures'     => $recent_exp,
				'limits'                  => LSFH_Donor_Limits::caps(),
			)
		);
	}
}
