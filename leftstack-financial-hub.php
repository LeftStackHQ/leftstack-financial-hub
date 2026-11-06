<?php
/**
 * Plugin Name:       LeftStack Financial Hub
 * Plugin URI:        https://leftstack.com/financial-hub
 * Description:       Campaign finance tracking for Democratic campaigns — donations, expenditures, in-kind contributions, ActBlue integration, and Tennessee state report export.
 * Version:           1.19.0
 * Requires at least: 6.0
 * Requires PHP:      8.0
 * Author:            LeftStack
 * Author URI:        https://leftstack.com
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       leftstack-financial-hub
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

// ── Constants ────────────────────────────────────────────────────────────────
if ( ! defined( 'LSFH_VERSION' ) ) {
	define( 'LSFH_VERSION', '1.19.0' );
}
if ( ! defined( 'LSFH_DB_VERSION' ) ) {
	define( 'LSFH_DB_VERSION', '1.23' );
}
if ( ! defined( 'LSFH_PLUGIN_FILE' ) ) {
	define( 'LSFH_PLUGIN_FILE', __FILE__ );
}
if ( ! defined( 'LSFH_PLUGIN_DIR' ) ) {
	define( 'LSFH_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
}
if ( ! defined( 'LSFH_PLUGIN_URL' ) ) {
	define( 'LSFH_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
}

// ── Includes ─────────────────────────────────────────────────────────────────
require_once LSFH_PLUGIN_DIR . 'includes/class-lsfh-activator.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-balance.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-periods.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-donor-key.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-org-types.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-donor-limits.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-donor-contact.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-fundraising-pages.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-vendor-groups.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-vendor-rollup.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-vendor-report.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-best-efforts.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-filing-check.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-state-compare.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-amendments.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-csv.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-payout-status.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-payout-fee-rules.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-payout-processor.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-payout-fees.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-payout-totals.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-period-elections.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-bank-subset-search.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-bank-match-rules.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-bank-match-report.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-bank-matcher.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-bank-format.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-bank-lines.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-bank-hub-records.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-bank-marks.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-bank-matches.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-bank-status.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-bank-todos.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-bank-review.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-bank-privacy.php';
require_once LSFH_PLUGIN_DIR . 'includes/support/class-lsfh-donor-privacy.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-rest-base.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-periods-controller.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-categories-controller.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-inkind-controller.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-payees-controller.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-vendors-controller.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-expenditures-controller.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-settings-controller.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-dashboard-controller.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-disbursements-controller.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-donors-controller.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-donations-controller.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-import-controller.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-export-controller.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-filing-check-controller.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-actblue-controller.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-bank-args.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-bank-controller.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-fee-args.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-fees-controller.php';
require_once LSFH_PLUGIN_DIR . 'includes/rest/class-lsfh-rest-router.php';
require_once LSFH_PLUGIN_DIR . 'admin/class-lsfh-admin.php';

// ── Activation / deactivation ────────────────────────────────────────────────
register_activation_hook( __FILE__, array( 'LSFH_Activator', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'LSFH_Activator', 'deactivate' ) );

// ── Hooks ────────────────────────────────────────────────────────────────────
add_action( 'plugins_loaded', array( 'LSFH_Activator', 'maybe_upgrade' ) );
add_action( 'rest_api_init', array( 'LSFH_REST_Router', 'register_routes' ) );
add_filter( 'wp_privacy_personal_data_exporters', array( 'LSFH_Bank_Privacy', 'register_exporter' ) );
add_filter( 'wp_privacy_personal_data_erasers', array( 'LSFH_Bank_Privacy', 'register_eraser' ) );
add_action( 'admin_init', array( 'LSFH_Bank_Privacy', 'add_policy_text' ) );
add_filter( 'wp_privacy_personal_data_exporters', array( 'LSFH_Donor_Privacy', 'register_exporter' ) );
add_filter( 'wp_privacy_personal_data_erasers', array( 'LSFH_Donor_Privacy', 'register_eraser' ) );
add_action( 'admin_init', array( 'LSFH_Donor_Privacy', 'add_policy_text' ) );
add_action( 'admin_menu', array( 'LSFH_Admin', 'add_menu' ) );
add_action( 'admin_menu', array( 'LSFH_Admin', 'trim_manager_menu' ), 999 );
add_action( 'admin_enqueue_scripts', array( 'LSFH_Admin', 'enqueue_assets' ) );
add_action( 'wp_dashboard_setup', array( 'LSFH_Admin', 'register_dashboard_widget' ) );
add_action( 'admin_init', array( 'LSFH_Admin', 'trim_footer' ) );
add_filter( 'login_redirect', array( 'LSFH_Admin', 'login_redirect' ), 10, 3 );
