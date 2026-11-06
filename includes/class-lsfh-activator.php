<?php
/**
 * Database tables, roles and upgrades for the Financial Hub.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Creates and upgrades the Hub's tables and roles.
 */
class LSFH_Activator {

	/**
	 * Create the tables, default categories and roles when the plugin is activated.
	 */
	public static function activate() {
		self::create_tables();
		self::seed_defaults();
		self::setup_roles();
	}

	/**
	 * Runs on deactivation. Data is left in place; see uninstall.php.
	 */
	public static function deactivate() {
		// Leave data intact on deactivate; only remove on uninstall.
	}

	/**
	 * Bring this site's database up to date. Runs on every load, but does work only
	 * when the stored version is behind, so each site on a network upgrades itself
	 * the first time it is used after an update.
	 */
	public static function maybe_upgrade() {
		// Multisite: ensure the lsfh_manager role and manage_lsfh cap exist on EVERY
		// sub-site. register_activation_hook only fires on the activating site.
		// setup_roles() is O(1) after the first run: get_role() reads a cached option.
		self::setup_roles();

		$installed = get_option( 'lsfh_db_version', '0' );
		if ( ! version_compare( $installed, LSFH_DB_VERSION, '<' ) ) {
			return;
		}

		global $wpdb;
		self::create_tables();

		// A site the plugin has never run on (a new network sub-site, for example) never
		// went through activation, so it gets the default budget categories here.
		if ( '0' === $installed ) {
			self::seed_defaults();
		}

		// 1.9: drop the legacy original_disbursement_id column (replaced by refund_of_id).
		$col = $wpdb->get_results( "SHOW COLUMNS FROM {$wpdb->prefix}lsfh_donations LIKE 'original_disbursement_id'" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		if ( ! empty( $col ) ) {
			$wpdb->query( "ALTER TABLE {$wpdb->prefix}lsfh_donations DROP COLUMN original_disbursement_id" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.SchemaChange,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		}
		// 1.10: date_posted on expenditures is added by dbDelta() in create_tables().
		// 1.13: retire the 'oath' source (an org name, not a payment channel). Relabel
		// Stripe-processed rows (pi_/po_ IDs) to 'stripe'; any remaining 'oath' rows to 'manual'.
		$wpdb->query( "UPDATE {$wpdb->prefix}lsfh_donations SET source='stripe' WHERE source='oath' AND ( actblue_id LIKE 'pi\\_%' OR disbursement_id LIKE 'po\\_%' )" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$wpdb->query( "UPDATE {$wpdb->prefix}lsfh_donations SET source='manual' WHERE source='oath'" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		// 1.15: phases feature removed. Drop the table if it was created in 1.14.
		$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}lsfh_phases" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.SchemaChange,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		// 1.16: the stored ActBlue password no longer loads on every request.
		if ( function_exists( 'wp_set_option_autoload' ) ) {
			wp_set_option_autoload( 'lsfh_actblue_password', false );
		}

		// 1.19: a fee expense is linked to its payout (the new disbursement_id column is added by dbDelta()).
		// The fee expenses already named after their payout are linked now; older ones are linked on request.
		$wpdb->query( "UPDATE {$wpdb->prefix}lsfh_expenditures e INNER JOIN {$wpdb->prefix}lsfh_actblue_disbursements d ON d.disbursement_id = e.payee SET e.disbursement_id = d.disbursement_id WHERE e.payment_method = 'fee' AND e.disbursement_id IS NULL" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter

		// 1.23: the unused fee_total snapshot on payouts is dropped (the fees are read from the donations and the fee expenses).
		$col = $wpdb->get_results( "SHOW COLUMNS FROM {$wpdb->prefix}lsfh_actblue_disbursements LIKE 'fee_total'" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		if ( ! empty( $col ) ) {
			$wpdb->query( "ALTER TABLE {$wpdb->prefix}lsfh_actblue_disbursements DROP COLUMN fee_total" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.SchemaChange,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		}

		update_option( 'lsfh_db_version', LSFH_DB_VERSION );
	}

	// ── Roles & Capabilities ─────────────────────────────────────────────────

	/**
	 * Create the Financial Hub Manager role and make sure administrators have the manage_lsfh capability.
	 */
	public static function setup_roles() {
		// Create the Financial Hub Manager role if it doesn't exist yet.
		if ( ! get_role( 'lsfh_manager' ) ) {
			add_role(
				'lsfh_manager',
				'Financial Hub Manager',
				array(
					'read'        => true,
					'manage_lsfh' => true,
				)
			);
		}

		// Ensure administrator always has manage_lsfh (needed on multisite sub-sites).
		$admin = get_role( 'administrator' );
		if ( $admin && empty( $admin->capabilities['manage_lsfh'] ) ) {
			$admin->add_cap( 'manage_lsfh' );
		}
	}

	// ── Tables ───────────────────────────────────────────────────────────────

	/**
	 * Create or update the plugin's database tables.
	 */
	public static function create_tables() {
		global $wpdb;
		$charset = $wpdb->get_charset_collate();
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		// Donations.
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.SchemaChange
		dbDelta(
			"CREATE TABLE {$wpdb->prefix}lsfh_donations (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            source varchar(20) NOT NULL DEFAULT 'manual',
            actblue_id varchar(100) DEFAULT NULL,
            first_name varchar(100) NOT NULL DEFAULT '',
            last_name varchar(100) NOT NULL DEFAULT '',
            address varchar(255) DEFAULT NULL,
            city varchar(100) DEFAULT NULL,
            state varchar(2) DEFAULT NULL,
            zip varchar(10) DEFAULT NULL,
            zip_formatted varchar(10) DEFAULT NULL,
            occupation varchar(255) DEFAULT NULL,
            employer varchar(255) DEFAULT NULL,
            contribution_date date DEFAULT NULL,
            date_deposited date DEFAULT NULL,
            gross_amount decimal(10,2) NOT NULL DEFAULT 0.00,
            actblue_fee decimal(10,2) NOT NULL DEFAULT 0.00,
            net_amount decimal(10,2) NOT NULL DEFAULT 0.00,
            payment_type varchar(20) NOT NULL DEFAULT 'actblue',
            check_number varchar(50) DEFAULT NULL,
            recurring tinyint(1) NOT NULL DEFAULT 0,
            balanced tinyint(1) NOT NULL DEFAULT 0,
            event_id bigint(20) DEFAULT NULL,
            election_type varchar(20) NOT NULL DEFAULT 'primary',
            report_type varchar(20) NOT NULL DEFAULT 'itemized',
            reporting_status varchar(20) NOT NULL DEFAULT 'pending',
            disbursement_id varchar(100) DEFAULT NULL,
            refund_of_id bigint(20) DEFAULT NULL,
            disbursement_date date DEFAULT NULL,
            payment_date date DEFAULT NULL,
            fundraising_page varchar(255) DEFAULT NULL,
            reference_code varchar(255) DEFAULT NULL,
            phone varchar(20) DEFAULT NULL,
            email varchar(255) DEFAULT NULL,
            donor_type varchar(20) NOT NULL DEFAULT 'individual',
            org_type varchar(20) DEFAULT NULL,
            notes text DEFAULT NULL,
            filing_period_id bigint(20) DEFAULT NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY source (source),
            KEY contribution_date (contribution_date),
            KEY report_type (report_type),
            KEY reporting_status (reporting_status),
            KEY election_type (election_type),
            KEY actblue_id (actblue_id(20)),
            KEY disbursement_id (disbursement_id(20)),
            KEY refund_of_id (refund_of_id),
            KEY filing_period_id (filing_period_id)
        ) $charset;"
		);

		// Expenditures.
		dbDelta(
			"CREATE TABLE {$wpdb->prefix}lsfh_expenditures (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            expense_date date DEFAULT NULL,
            date_posted date DEFAULT NULL,
            payee varchar(255) NOT NULL DEFAULT '',
            address varchar(255) DEFAULT NULL,
            category_id bigint(20) DEFAULT NULL,
            description text DEFAULT NULL,
            amount decimal(10,2) NOT NULL DEFAULT 0.00,
            payment_method varchar(20) NOT NULL DEFAULT 'check',
            check_number varchar(50) DEFAULT NULL,
            receipt_attachment_id bigint(20) DEFAULT NULL,
            receipt_url varchar(500) DEFAULT NULL,
            balanced tinyint(1) NOT NULL DEFAULT 0,
            paid_by varchar(100) DEFAULT NULL,
            notes text DEFAULT NULL,
            filing_period_id bigint(20) DEFAULT NULL,
            disbursement_id varchar(100) DEFAULT NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY expense_date (expense_date),
            KEY category_id (category_id),
            KEY filing_period_id (filing_period_id),
            KEY disbursement_id (disbursement_id(50))
        ) $charset;"
		);

		// In-Kind donations.
		dbDelta(
			"CREATE TABLE {$wpdb->prefix}lsfh_inkind (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            donation_date date DEFAULT NULL,
            donor_name varchar(255) NOT NULL DEFAULT '',
            address varchar(255) DEFAULT NULL,
            occupation varchar(255) DEFAULT NULL,
            employer varchar(255) DEFAULT NULL,
            description text DEFAULT NULL,
            value decimal(10,2) NOT NULL DEFAULT 0.00,
            fec_report_date date DEFAULT NULL,
            notes text DEFAULT NULL,
            filing_period_id bigint(20) DEFAULT NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY donation_date (donation_date),
            KEY filing_period_id (filing_period_id)
        ) $charset;"
		);

		// Budget categories.
		dbDelta(
			"CREATE TABLE {$wpdb->prefix}lsfh_budget_categories (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            name varchar(100) NOT NULL,
            color varchar(7) DEFAULT NULL,
            parent_id bigint(20) DEFAULT NULL,
            sort_order int(11) NOT NULL DEFAULT 0,
            budget_amount decimal(10,2) NOT NULL DEFAULT 0.00,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset;"
		);

		// Filing periods.
		dbDelta(
			"CREATE TABLE {$wpdb->prefix}lsfh_filing_periods (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            name varchar(100) NOT NULL,
            start_date date NOT NULL,
            end_date date NOT NULL,
            beginning_balance decimal(10,2) NOT NULL DEFAULT 0.00,
            election_type varchar(20) DEFAULT 'primary',
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset;"
		);

		// ActBlue disbursements — one row per check/ACH ActBlue sends the campaign.
		dbDelta(
			"CREATE TABLE {$wpdb->prefix}lsfh_actblue_disbursements (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            disbursement_id varchar(100) NOT NULL,
            disbursement_date date DEFAULT NULL,
            donation_count int(11) NOT NULL DEFAULT 0,
            gross_total decimal(10,2) NOT NULL DEFAULT 0.00,
            net_total decimal(10,2) NOT NULL DEFAULT 0.00,
            date_received date DEFAULT NULL,
            bank_reference varchar(255) DEFAULT NULL,
            reconciled tinyint(1) NOT NULL DEFAULT 0,
            filed tinyint(1) NOT NULL DEFAULT 0,
            election_type varchar(20) NOT NULL DEFAULT '',
            filing_period_id bigint(20) DEFAULT NULL,
            notes text DEFAULT NULL,
            processor varchar(100) DEFAULT NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY disbursement_id (disbursement_id(50)),
            KEY reconciled (reconciled),
            KEY disbursement_date (disbursement_date)
        ) $charset;"
		);

		// phpcs:enable WordPress.DB.DirectDatabaseQuery.SchemaChange

		self::create_bank_tables( $charset );
		self::create_best_efforts_table( $charset );

		// Fee expenses are made automatically only for payouts that first appear after this moment; the payouts
		// already there are brought right on request, after the person has seen what would change.
		add_option( 'lsfh_payout_fees_since', current_time( 'mysql' ), '', false );

		update_option( 'lsfh_db_version', LSFH_DB_VERSION );
	}

	/**
	 * Create or update the bank tie-out tables: bank accounts with their saved format, the bank
	 * lines, and the confirmed matches with the items each one ties together.
	 *
	 * @param string $charset Character set and collation clause for this site.
	 */
	private static function create_bank_tables( $charset ) {
		global $wpdb;
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.SchemaChange
		dbDelta(
			"CREATE TABLE {$wpdb->prefix}lsfh_bank_accounts (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            label varchar(100) NOT NULL,
            format longtext DEFAULT NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY  (id)
        ) $charset;"
		);

		// One row per line of a bank file. The fingerprint is what keeps overlapping uploads from
		// adding a line twice. No account numbers are stored.
		dbDelta(
			"CREATE TABLE {$wpdb->prefix}lsfh_bank_lines (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            account_id bigint(20) NOT NULL,
            line_date date NOT NULL,
            amount decimal(10,2) NOT NULL,
            description varchar(255) NOT NULL DEFAULT '',
            check_number varchar(50) NOT NULL DEFAULT '',
            fingerprint char(40) NOT NULL,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            UNIQUE KEY account_fingerprint (account_id,fingerprint),
            KEY line_date (line_date)
        ) $charset;"
		);

		// A confirmed match: a group of bank lines tied to a group of Hub records.
		dbDelta(
			"CREATE TABLE {$wpdb->prefix}lsfh_bank_matches (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            account_id bigint(20) NOT NULL,
            tier varchar(10) NOT NULL DEFAULT 'manual',
            reason varchar(40) NOT NULL DEFAULT '',
            difference decimal(10,2) NOT NULL DEFAULT 0.00,
            note varchar(255) NOT NULL DEFAULT '',
            created_by bigint(20) NOT NULL DEFAULT 0,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            KEY account_id (account_id)
        ) $charset;"
		);

		// The items in a match. kind is bank, payout, expense or donation. The unique key on
		// (kind, ref_id) is what keeps one item from being in two matches. marked says what confirming
		// turned on for a Hub item (balanced or reconciled, and a blank date it filled in), so undoing the match
		// reverses exactly that and nothing the user had set by hand.
		dbDelta(
			"CREATE TABLE {$wpdb->prefix}lsfh_bank_match_links (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            match_id bigint(20) NOT NULL,
            kind varchar(10) NOT NULL,
            ref_id bigint(20) NOT NULL,
            amount decimal(10,2) NOT NULL,
            marked varchar(40) NOT NULL DEFAULT '',
            marked_date date DEFAULT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY item (kind,ref_id),
            KEY match_id (match_id)
        ) $charset;"
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.SchemaChange
	}

	/**
	 * Create or update the table of best-efforts records (donors asked for their occupation and employer).
	 *
	 * @param string $charset Character set and collation clause for this site.
	 */
	private static function create_best_efforts_table( $charset ) {
		global $wpdb;
		// One record per donor. donor_hash identifies the donor by name (see LSFH_Best_Efforts::hash()).
		dbDelta( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.SchemaChange
			"CREATE TABLE {$wpdb->prefix}lsfh_best_efforts (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            donor_hash char(40) NOT NULL,
            first_name varchar(100) NOT NULL DEFAULT '',
            last_name varchar(100) NOT NULL DEFAULT '',
            requested_on date NOT NULL,
            note varchar(255) NOT NULL DEFAULT '',
            created_by bigint(20) NOT NULL DEFAULT 0,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            UNIQUE KEY donor_hash (donor_hash)
        ) $charset;"
		);
	}

	/**
	 * Add the default budget categories when none exist.
	 */
	public static function seed_defaults() {
		// Seed default budget categories if none exist.
		global $wpdb;
		$count = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$wpdb->prefix}lsfh_budget_categories" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		if ( $count > 0 ) {
			return;
		}

		$defaults = array(
			'Advertising',
			'Campaign Materials',
			'Consulting',
			'Events',
			'Fundraising Fees',
			'Legal & Compliance',
			'Office & Admin',
			'Payroll',
			'Phone & Digital',
			'Polling',
			'Postage & Mailing',
			'Signage & Literature',
			'Travel & Transportation',
			'Website & Technology',
		);
		foreach ( $defaults as $i => $name ) {
			$wpdb->insert( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
				$wpdb->prefix . 'lsfh_budget_categories',
				array(
					'name'       => $name,
					'sort_order' => $i,
				),
				array( '%s', '%d' )
			);
		}
	}
}
