<?php
/**
 * The REST router: the route table for the Financial Hub screens, and the response filters
 * and permission checks that apply to every route.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers every Hub route and points each at its controller class.
 */
class LSFH_REST_Router {

	const NS = 'leftstack-financial-hub/v1';

	/**
	 * Register the REST routes and the response filters.
	 */
	public static function register_routes() {
		// No-cache headers for every response in our namespace — prevents LiteSpeed,
		// Redis, and other host-level caches from serving stale data.
		add_filter( 'rest_post_dispatch', array( __CLASS__, 'no_cache_headers' ), 10, 3 );

		// CSV export: bypass WP's JSON-encoding and serve the raw CSV body directly.
		add_filter( 'rest_pre_serve_request', array( __CLASS__, 'serve_csv_export' ), 10, 4 );

		$manage  = array( __CLASS__, 'can_manage' );  // Hub managers and site administrators.
		$options = array( __CLASS__, 'can_options' ); // Site administrators only.

		// [ path, HTTP method, handler, permission, arguments ]. Every route has a permission check. The
		// arguments (declared types, checks and cleaning) are optional; the bank tie-out routes use them.
		$routes = array(
			// Donations.
			array( '/donations', 'GET', array( 'LSFH_Donations_Controller', 'list_donations' ), $manage ),
			array( '/donations', 'POST', array( 'LSFH_Donations_Controller', 'create_donation' ), $manage ),
			array( '/donations/(?P<id>\d+)', 'GET', array( 'LSFH_Donations_Controller', 'get_donation' ), $manage ),
			array( '/donations/(?P<id>\d+)', 'PUT', array( 'LSFH_Donations_Controller', 'update_donation' ), $manage ),
			array( '/donations/(?P<id>\d+)', 'DELETE', array( 'LSFH_Donations_Controller', 'delete_donation' ), $manage ),
			array( '/donations/(?P<id>\d+)/split', 'POST', array( 'LSFH_Donations_Controller', 'split_donation' ), $manage ),
			array( '/donations/bulk', 'POST', array( 'LSFH_Donations_Controller', 'bulk_donations' ), $manage ),
			array( '/donations/allocate-unitemized', 'POST', array( 'LSFH_Donations_Controller', 'allocate_unitemized' ), $manage ),

			// Donation fundraising pages (distinct values for filter dropdown).
			array( '/donations/fundraising-pages', 'GET', array( 'LSFH_Donations_Controller', 'list_fundraising_pages' ), $manage ),

			// The check before a state report, and the best-efforts records that excuse a donor's missing occupation and employer.
			array( '/filing-check', 'GET', array( 'LSFH_Filing_Check_Controller', 'check' ), $manage ),
			array( '/filing-check/compare', 'POST', array( 'LSFH_Filing_Check_Controller', 'compare' ), $manage, LSFH_Filing_Check_Controller::compare_args() ),
			array( '/filing-check/amendments', 'GET', array( 'LSFH_Filing_Check_Controller', 'amendments' ), $manage ),
			array( '/filing-check/best-efforts', 'POST', array( 'LSFH_Filing_Check_Controller', 'save_best_efforts' ), $manage, LSFH_Filing_Check_Controller::best_efforts_args() ),
			array( '/filing-check/best-efforts/(?P<id>\\d+)', 'DELETE', array( 'LSFH_Filing_Check_Controller', 'delete_best_efforts' ), $manage, LSFH_REST_Base::id_arg() ),

			// Donors (aggregated).
			array( '/donors', 'GET', array( 'LSFH_Donors_Controller', 'list_donors' ), $manage ),

			// Vendors: spend against money raised, by group of payees and fundraising pages.
			array( '/vendors/report', 'GET', array( 'LSFH_Vendors_Controller', 'report' ), $manage, LSFH_Vendors_Controller::report_args() ),
			array( '/vendors/groups', 'POST', array( 'LSFH_Vendors_Controller', 'save_groups' ), $manage, LSFH_Vendors_Controller::groups_args() ),

			// Payees (aggregated expenditure view).
			array( '/payees', 'GET', array( 'LSFH_Payees_Controller', 'list_payees' ), $manage ),
			array( '/payees/rename', 'POST', array( 'LSFH_Payees_Controller', 'rename_payee' ), $manage ),

			// Expenditures.
			array( '/expenditures', 'GET', array( 'LSFH_Expenditures_Controller', 'list_expenditures' ), $manage ),
			array( '/expenditures', 'POST', array( 'LSFH_Expenditures_Controller', 'create_expenditure' ), $manage ),
			array( '/expenditures/(?P<id>\d+)', 'PUT', array( 'LSFH_Expenditures_Controller', 'update_expenditure' ), $manage ),
			array( '/expenditures/(?P<id>\d+)', 'DELETE', array( 'LSFH_Expenditures_Controller', 'delete_expenditure' ), $manage ),
			array( '/expenditures/by-check', 'GET', array( 'LSFH_Expenditures_Controller', 'expenses_by_check' ), $manage, LSFH_Expenditures_Controller::by_check_args() ),
			array( '/expenditures/bulk-delete', 'POST', array( 'LSFH_Expenditures_Controller', 'bulk_delete_expenditures' ), $manage ),
			array( '/expenditures/bulk-update', 'POST', array( 'LSFH_Expenditures_Controller', 'bulk_update_expenditures' ), $manage ),

			// In-Kind.
			array( '/inkind', 'GET', array( 'LSFH_InKind_Controller', 'list_inkind' ), $manage ),
			array( '/inkind', 'POST', array( 'LSFH_InKind_Controller', 'create_inkind' ), $manage ),
			array( '/inkind/(?P<id>\d+)', 'PUT', array( 'LSFH_InKind_Controller', 'update_inkind' ), $manage ),
			array( '/inkind/(?P<id>\d+)', 'DELETE', array( 'LSFH_InKind_Controller', 'delete_inkind' ), $manage ),
			array( '/inkind/bulk-delete', 'POST', array( 'LSFH_InKind_Controller', 'bulk_delete_inkind' ), $manage ),
			array( '/import/inkind', 'POST', array( 'LSFH_Import_Controller', 'import_inkind' ), $manage ),

			// Budget categories.
			array( '/categories', 'GET', array( 'LSFH_Categories_Controller', 'list_categories' ), $manage ),
			array( '/categories', 'POST', array( 'LSFH_Categories_Controller', 'create_category' ), $manage ),
			array( '/categories/(?P<id>\d+)', 'PUT', array( 'LSFH_Categories_Controller', 'update_category' ), $manage ),
			array( '/categories/(?P<id>\d+)', 'DELETE', array( 'LSFH_Categories_Controller', 'delete_category' ), $manage ),

			// Filing periods.
			array( '/filing-periods', 'GET', array( 'LSFH_Periods_Controller', 'list_periods' ), $manage ),
			array( '/filing-periods', 'POST', array( 'LSFH_Periods_Controller', 'create_period' ), $manage ),
			array( '/filing-periods/(?P<id>\d+)', 'PUT', array( 'LSFH_Periods_Controller', 'update_period' ), $manage ),
			array( '/filing-periods/(?P<id>\d+)', 'DELETE', array( 'LSFH_Periods_Controller', 'delete_period' ), $manage, LSFH_REST_Base::id_arg() + LSFH_REST_Base::flag_arg( 'force' ) ),
			array( '/filing-periods/(?P<id>\d+)/records', 'GET', array( 'LSFH_Periods_Controller', 'period_records_preview' ), $manage ),
			array( '/filing-periods/(?P<id>\d+)/records', 'POST', array( 'LSFH_Periods_Controller', 'period_records_assign' ), $manage ),
			array( '/filing-periods/(?P<id>\d+)/election', 'GET', array( 'LSFH_Periods_Controller', 'period_election_preview' ), $manage, LSFH_REST_Base::id_arg() ),
			array( '/filing-periods/(?P<id>\d+)/election', 'POST', array( 'LSFH_Periods_Controller', 'period_election_apply' ), $manage, LSFH_REST_Base::id_arg() ),

			// Dashboard summary.
			array( '/dashboard', 'GET', array( 'LSFH_Dashboard_Controller', 'get_dashboard' ), $manage ),
			array( '/budget', 'GET', array( 'LSFH_Dashboard_Controller', 'get_budget' ), $manage ),
			array( '/months', 'GET', array( 'LSFH_Dashboard_Controller', 'get_months' ), $manage ),

			// Settings.
			array( '/settings', 'GET', array( 'LSFH_Settings_Controller', 'get_settings' ), $options ),
			array( '/settings', 'POST', array( 'LSFH_Settings_Controller', 'save_settings' ), $options ),

			// Staff.
			array( '/staff', 'GET', array( 'LSFH_Settings_Controller', 'list_staff' ), $options ),
			array( '/staff/(?P<id>\d+)/grant', 'POST', array( 'LSFH_Settings_Controller', 'grant_staff' ), $options ),
			array( '/staff/(?P<id>\d+)/revoke', 'POST', array( 'LSFH_Settings_Controller', 'revoke_staff' ), $options ),
			array( '/users/search', 'GET', array( 'LSFH_Settings_Controller', 'search_users' ), $options ),

			// ActBlue.
			array( '/actblue/test', 'POST', array( 'LSFH_ActBlue_Controller', 'actblue_test' ), $options ),
			array( '/actblue/sync', 'POST', array( 'LSFH_ActBlue_Controller', 'actblue_sync' ), $manage ),

			// Receipt upload.
			array( '/upload/receipt', 'POST', array( 'LSFH_Expenditures_Controller', 'upload_receipt' ), $manage ),

			// ActBlue disbursements.
			array( '/disbursements', 'GET', array( 'LSFH_Disbursements_Controller', 'list_disbursements' ), $manage ),
			array( '/disbursements/(?P<id>\d+)', 'PUT', array( 'LSFH_Disbursements_Controller', 'update_disbursement' ), $manage, LSFH_REST_Base::id_arg() + LSFH_REST_Base::text_arg( 'processor', 100 ) ),
			array( '/disbursements/(?P<id>\d+)', 'DELETE', array( 'LSFH_Disbursements_Controller', 'delete_disbursement' ), $manage ),
			array( '/disbursements/progress', 'GET', array( 'LSFH_Disbursements_Controller', 'progress' ), $manage, LSFH_REST_Base::id_arg( 'filing_period_id' ) ),
			array( '/disbursements/sync', 'POST', array( 'LSFH_Disbursements_Controller', 'sync_disbursements' ), $manage ),

			// Payout fees as expenditures.
			array( '/disbursements/processors', 'GET', array( 'LSFH_Fees_Controller', 'processors' ), $manage ),
			array( '/disbursements/fees/plan', 'GET', array( 'LSFH_Fees_Controller', 'plan' ), $manage ),
			array( '/disbursements/fees/fix', 'POST', array( 'LSFH_Fees_Controller', 'fix' ), $manage, LSFH_Fee_Args::payout_ids() ),
			array( '/disbursements/(?P<id>\\d+)/fees/keep', 'POST', array( 'LSFH_Fees_Controller', 'keep' ), $manage, LSFH_REST_Base::id_arg() + LSFH_REST_Base::id_arg( 'expense_id' ) ),

			// CSV Import.
			array( '/import/donations', 'POST', array( 'LSFH_Import_Controller', 'import_donations' ), $manage, LSFH_REST_Base::text_arg( 'processor', 100 ) ),
			array( '/import/expenditures', 'POST', array( 'LSFH_Import_Controller', 'import_expenditures' ), $manage ),

			// Exports.
			array( '/export/tn-contributions', 'GET', array( 'LSFH_Export_Controller', 'export_tn_contributions' ), $manage ),
			array( '/export/donations', 'GET', array( 'LSFH_Export_Controller', 'export_donations' ), $manage ),
			array( '/export/expenditures', 'GET', array( 'LSFH_Export_Controller', 'export_expenditures' ), $manage ),
			array( '/export/inkind', 'GET', array( 'LSFH_Export_Controller', 'export_inkind' ), $manage ),

			// Bank tie-out.
			array( '/bank/accounts', 'GET', array( 'LSFH_Bank_Controller', 'list_accounts' ), $manage ),
			array( '/bank/accounts', 'POST', array( 'LSFH_Bank_Controller', 'create_account' ), $manage, LSFH_Bank_Args::label( true ) + LSFH_Bank_Args::format() ),
			array( '/bank/accounts/(?P<id>\\d+)', 'PUT', array( 'LSFH_Bank_Controller', 'update_account' ), $manage, LSFH_Bank_Args::account_id() + LSFH_Bank_Args::label( false ) + LSFH_Bank_Args::format() ),
			array( '/bank/accounts/(?P<id>\\d+)/lines', 'POST', array( 'LSFH_Bank_Controller', 'import_lines' ), $manage, LSFH_Bank_Args::account_id() + LSFH_Bank_Args::lines() ),
			array( '/bank/accounts/(?P<id>\\d+)/review', 'GET', array( 'LSFH_Bank_Controller', 'review' ), $manage, LSFH_Bank_Args::account_id() + LSFH_Bank_Args::from() ),
			array( '/bank/accounts/(?P<id>\\d+)/matches', 'GET', array( 'LSFH_Bank_Controller', 'list_matches' ), $manage, LSFH_Bank_Args::account_id() + LSFH_Bank_Args::paging() + LSFH_Bank_Args::direction() ),
			array( '/bank/accounts/(?P<id>\\d+)/matches', 'POST', array( 'LSFH_Bank_Controller', 'confirm_matches' ), $manage, LSFH_Bank_Args::account_id() + LSFH_Bank_Args::groups() + LSFH_Bank_Args::fill_dates() ),
			array( '/bank/matches/(?P<id>\\d+)', 'DELETE', array( 'LSFH_Bank_Controller', 'delete_match' ), $manage, LSFH_Bank_Args::account_id() ),

			// Per-user table column preferences (which columns each user hides).
			array( '/prefs/columns', 'GET', array( 'LSFH_Settings_Controller', 'get_column_prefs' ), $manage ),
			array( '/prefs/columns', 'POST', array( 'LSFH_Settings_Controller', 'save_column_prefs' ), $manage ),
		);

		foreach ( $routes as $route ) {
			register_rest_route(
				self::NS,
				$route[0],
				array(
					'methods'             => $route[1],
					'callback'            => is_array( $route[2] ) ? $route[2] : array( __CLASS__, $route[2] ),
					'permission_callback' => $route[3],
					'args'                => $route[4] ?? array(),
				)
			);
		}
	}


	// ── No-cache header filter ────────────────────────────────────────────────

	/**
	 * Stop hosts and proxies from caching this plugin's responses.
	 *
	 * @param mixed           $result Response result, returned unchanged.
	 * @param WP_REST_Server  $server Server.
	 * @param WP_REST_Request $request Request.
	 * @return mixed
	 */
	public static function no_cache_headers( $result, $server, $request ) {
		if ( strpos( $request->get_route(), '/' . self::NS ) !== false ) {
			$server->send_header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
			$server->send_header( 'Pragma', 'no-cache' );
			$server->send_header( 'Expires', 'Thu, 01 Jan 1970 00:00:00 GMT' );
		}
		return $result;
	}

	// ── CSV export: serve raw bytes, bypassing WP's JSON wrapper ─────────────
	// Without this, WP_REST_Response wraps the CSV string in JSON quotes and
	// the downloaded file contains a JSON-encoded string instead of real CSV.

	/**
	 * Send export downloads as raw file bytes instead of wrapping them in JSON.
	 *
	 * @param bool             $served Whether the request has already been served.
	 * @param WP_HTTP_Response $result Result to send.
	 * @param WP_REST_Request  $request Request.
	 * @param WP_REST_Server   $server Server.
	 * @return bool
	 */
	public static function serve_csv_export( $served, $result, $request, $server ) {
		$route = $request->get_route();
		if ( strpos( $route, '/' . self::NS . '/export/' ) === false ) {
			return $served;
		}
		// Only bypass WP's JSON wrapper for raw file downloads (string body).
		// Preflight/JSON responses are arrays — let WP handle those normally.
		$data = $result->get_data();
		if ( ! is_string( $data ) ) {
			return $served;
		}
		// Send status line manually since we're bypassing the REST server's output.
		$server->send_header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
		foreach ( $result->get_headers() as $key => $value ) {
			$server->send_header( $key, $value );
		}
		echo $data; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		return true; // signals WP not to do any further output.
	}

	// ── Permission callbacks ─────────────────────────────────────────────────

	/**
	 * Whether the current user may use the Hub's data endpoints.
	 *
	 * @return bool
	 */
	public static function can_manage() {
		return current_user_can( 'manage_lsfh' ) || current_user_can( 'manage_options' );
	}

	/**
	 * Whether the current user may change settings and staff.
	 *
	 * @return bool
	 */
	public static function can_options() {
		return current_user_can( 'manage_options' );
	}
}
