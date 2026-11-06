<?php
/**
 * The Financial Hub admin: menu, screens, dashboard widget and assets.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * The Financial Hub admin screens and the WordPress dashboard widget.
 */
class LSFH_Admin {

	/**
	 * Financial Hub Managers land on the Hub after signing in, not on the WordPress dashboard.
	 *
	 * @param string           $redirect_to Where WordPress is about to send the user.
	 * @param string           $request     The redirect the user asked for, if any.
	 * @param WP_User|WP_Error $user        The user signing in, or the error.
	 * @return string Where to send the user.
	 */
	public static function login_redirect( $redirect_to, $request, $user ) {
		if ( $user instanceof WP_User && in_array( 'lsfh_manager', (array) $user->roles, true ) ) {
			return admin_url( 'admin.php?page=lsfh-dashboard' );
		}
		return $redirect_to;
	}

	/** A Financial Hub Manager who is not a site administrator only sees the Hub in the menu. */
	public static function trim_manager_menu() {
		if ( ! current_user_can( 'manage_lsfh' ) || current_user_can( 'manage_options' ) ) {
			return;
		}
		foreach ( array( 'index.php', 'edit.php', 'upload.php', 'edit.php?post_type=page', 'edit-comments.php', 'themes.php', 'plugins.php', 'users.php', 'tools.php', 'options-general.php' ) as $slug ) {
			remove_menu_page( $slug );
		}
	}

	/**
	 * On our own pages, clear the WordPress footer branding. Third-party notices are hidden
	 * with CSS (loaded only on these pages), so core hooks still fire and security and
	 * update notices are not suppressed.
	 */
	public static function trim_footer() {
		$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only page check.
		if ( 0 !== strpos( $page, 'lsfh-' ) ) {
			return;
		}
		add_filter( 'admin_footer_text', '__return_empty_string', 999 );
		add_filter( 'update_footer', '__return_empty_string', 999 );
	}

	/**
	 * Can the current user open the Hub screens? Settings needs a site administrator.
	 *
	 * @param bool $settings Whether this is the Settings screen.
	 * @return bool
	 */
	private static function can_view( $settings = false ) {
		return $settings
			? current_user_can( 'manage_options' )
			: ( current_user_can( 'manage_lsfh' ) || current_user_can( 'manage_options' ) );
	}

	/**
	 * Register the Financial Hub menu and its screens.
	 */
	public static function add_menu() {
		$icon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+PGcgdHJhbnNmb3JtPSJtYXRyaXgoMC4wMTg3NTIxLDAsMCwwLjAxODcwMTUsMC4xNTUxNTUsMC4yMDk3NDMpIj48cGF0aCBmaWxsPSJibGFjayIgZD0iTTUyNSwxMDcuMDg4TDczLjM3MywzMzIuNzkyTDUyNSw1NTguNDk3TDk3Ni42MjcsMzMyLjc5Mkw1MjUsMTA3LjA4OFpNODQ3LjMzNiw0NTguODg2TDUyNSw2MTkuOTc2TDIwMi42NjQsNDU4Ljg4Nkw3My4zNzMsNTIzLjVMNTI1LDc0OS4yMDRMOTc2LjYyNyw1MjMuNUw4NDcuMzM2LDQ1OC44ODZaTTg0Ny4zMzYsNjQ5LjU5M0w1MjUsODEwLjY4M0wyMDIuNjY0LDY0OS41OTNMNzMuMzczLDcxNC4yMDhMNTI1LDkzOS45MTJMOTc2LjYyNyw3MTQuMjA4TDg0Ny4zMzYsNjQ5LjU5M1oiLz48L2c+PC9zdmc+';

		add_menu_page( 'LeftStack Financial Hub', 'Financial Hub', 'manage_lsfh', 'lsfh-dashboard', array( __CLASS__, 'page_dashboard' ), $icon, 31 );
		add_submenu_page( 'lsfh-dashboard', 'Dashboard', 'Dashboard', 'manage_lsfh', 'lsfh-dashboard', array( __CLASS__, 'page_dashboard' ) );
		add_submenu_page( 'lsfh-dashboard', 'Donations', 'Donations', 'manage_lsfh', 'lsfh-donations', array( __CLASS__, 'page_donations' ) );
		add_submenu_page( 'lsfh-dashboard', 'Expenditures', 'Expenditures', 'manage_lsfh', 'lsfh-expenditures', array( __CLASS__, 'page_expenditures' ) );
		add_submenu_page( 'lsfh-dashboard', 'In-Kind', 'In-Kind', 'manage_lsfh', 'lsfh-inkind', array( __CLASS__, 'page_inkind' ) );
		add_submenu_page( 'lsfh-dashboard', 'Bank', 'Bank', 'manage_lsfh', 'lsfh-bank', array( __CLASS__, 'page_bank' ) );
		add_submenu_page( 'lsfh-dashboard', 'Settings', 'Settings', 'manage_options', 'lsfh-settings', array( __CLASS__, 'page_settings' ) );
	}

	/* ══════ WP DASHBOARD WIDGET ════════════════════════════════ */

	/**
	 * Add the campaign snapshot widget to the WordPress dashboard.
	 */
	public static function register_dashboard_widget() {
		if ( ! self::can_view() ) {
			return;
		}
		wp_add_dashboard_widget(
			'lsfh_finance_snapshot',
			'Financial Hub: Campaign Snapshot',
			array( __CLASS__, 'dashboard_widget_content' )
		);
	}

	/**
	 * Print the campaign snapshot shown on the WordPress dashboard.
	 */
	public static function dashboard_widget_content() {
		global $wpdb;

		// Same figures as the Financial Hub dashboard: gross raised, and expenditures
		// through today (scheduled payments are not spent yet).
		$total_raised    = (float) $wpdb->get_var( "SELECT COALESCE(SUM(gross_amount),0) FROM {$wpdb->prefix}lsfh_donations" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$total_expenses  = LSFH_Balance::spent_through_today();
		$current_balance = LSFH_Balance::current_balance();

		$donations_url = admin_url( 'admin.php?page=lsfh-donations' );
		$hub_url       = admin_url( 'admin.php?page=lsfh-dashboard' );

		$fmt = fn( $n ) => '$' . number_format( abs( $n ), 0 ) . ( $n < 0 ? ' (deficit)' : '' );
		?>
		<div class="lsfh-dw-grid">
			<div class="lsfh-dw-card">
				<div class="lsfh-dw-val"><?php echo esc_html( $fmt( $total_raised ) ); ?></div>
				<div class="lsfh-dw-lbl">Total Raised</div>
			</div>
			<div class="lsfh-dw-card balance">
				<div class="lsfh-dw-val"><?php echo esc_html( $fmt( $current_balance ) ); ?></div>
				<div class="lsfh-dw-lbl">Current Balance</div>
			</div>
			<div class="lsfh-dw-card">
				<div class="lsfh-dw-val"><?php echo esc_html( $fmt( $total_expenses ) ); ?></div>
				<div class="lsfh-dw-lbl">Expenditures</div>
			</div>
		</div>
		<div class="lsfh-dw-footer">
			<a href="<?php echo esc_url( $donations_url ); ?>" class="button button-small">View Contributions</a>
			<a href="<?php echo esc_url( $hub_url ); ?>" style="color:var(--muted)">Open Financial Hub &rarr;</a>
		</div>
		<?php
	}

	/**
	 * Cache-busting version for a bundled asset.
	 *
	 * Normally LSFH_VERSION, so browsers refetch once per release. With
	 * WP_DEBUG on — i.e. local development — the file's mtime is used instead,
	 * because during development the version constant deliberately does not
	 * change, so every edit would otherwise be masked by a cached asset that
	 * still carries the previous release's URL.
	 *
	 * @param string $rel_path Path relative to the plugin directory.
	 * @return string Version string for wp_enqueue_*.
	 */
	private static function asset_ver( $rel_path ) {
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			$abs = LSFH_PLUGIN_DIR . $rel_path;
			if ( file_exists( $abs ) ) {
				return (string) filemtime( $abs );
			}
		}
		return LSFH_VERSION;
	}

	/**
	 * Load the Hub scripts and styles on its own screens, and only the styles on the WordPress dashboard.
	 *
	 * @param string $hook Current admin page hook.
	 */
	public static function enqueue_assets( $hook ) {
		$on_lsfh      = strpos( $hook, 'lsfh-' ) !== false;
		$on_dashboard = ( 'index.php' === $hook );          // WP Dashboard (widget lives here).
		if ( ! $on_lsfh && ! $on_dashboard ) {
			return;
		}
		if ( ! self::can_view() ) {
			return;
		}

		// Always load tokens + admin CSS so the widget inherits the design system.
		// On the WP dashboard we skip the JS bundle (not needed for the PHP widget).
		if ( $on_dashboard && ! $on_lsfh ) {
			wp_enqueue_style( 'lsfh-tokens', LSFH_PLUGIN_URL . 'assets/css/tokens.css', array(), self::asset_ver( 'assets/css/tokens.css' ) );
			wp_enqueue_style( 'lsfh-admin', LSFH_PLUGIN_URL . 'assets/css/admin.css', array( 'lsfh-tokens' ), self::asset_ver( 'assets/css/admin.css' ) );
			return;
		}

		wp_enqueue_style( 'lsfh-tokens', LSFH_PLUGIN_URL . 'assets/css/tokens.css', array(), self::asset_ver( 'assets/css/tokens.css' ) );
		wp_enqueue_style( 'lsfh-admin', LSFH_PLUGIN_URL . 'assets/css/admin.css', array( 'lsfh-tokens' ), self::asset_ver( 'assets/css/admin.css' ) );

		$asset_file = LSFH_PLUGIN_DIR . 'assets/js/admin.asset.php';
		$asset      = file_exists( $asset_file )
			? require $asset_file
			: array(
				'dependencies' => array(),
				'version'      => LSFH_VERSION,
			);

		wp_enqueue_script(
			'lsfh-admin',
			LSFH_PLUGIN_URL . 'assets/js/admin.js',
			$asset['dependencies'],
			self::asset_ver( 'assets/js/admin.js' ),
			true
		);
		wp_set_script_translations( 'lsfh-admin', 'leftstack-financial-hub' );

		$limits        = LSFH_Donor_Limits::caps();
		$election_date = get_option( 'lsfh_election_date', '' );
		$election_year = $election_date ? (int) gmdate( 'Y', strtotime( $election_date ) ) : (int) gmdate( 'Y' );

		wp_add_inline_script(
			'lsfh-admin',
			'var LSFH = ' . wp_json_encode(
				array(
					'restUrl'         => esc_url_raw( rest_url( 'leftstack-financial-hub/v1' ) ),
					'nonce'           => wp_create_nonce( 'wp_rest' ),
					'adminUrl'        => admin_url( 'admin.php' ),
					'logoUrl'         => LSFH_PLUGIN_URL . 'assets/images/leftstack-logo.svg',
					'version'         => LSFH_VERSION,
					'campaignGoal'    => (float) get_option( 'lsfh_campaign_goal', 0 ),
					'campaignName'    => get_option( 'lsfh_campaign_name', get_bloginfo( 'name' ) ),
					'primaryLimit'    => $limits['ind_primary'],
					'generalLimit'    => $limits['ind_general'],
					'runoffLimit'     => $limits['ind_runoff'],
					'noElections'     => LSFH_Period_Elections::hidden(),
					'noLimit'         => $limits['no_limit'],
					'nearLimitPct'    => (int) $limits['near_pct'],
					'orgPrimaryLimit' => $limits['org_primary'],
					'orgGeneralLimit' => $limits['org_general'],
					'orgRunoffLimit'  => $limits['org_runoff'],
					'orgNoLimit'      => $limits['org_no_limit'],
					'electionYear'    => $election_year,
					'filingState'     => get_option( 'lsfh_filing_state', '' ),
				)
			) . ';',
			'before'
		);
	}

	/* ══════ SHELL ═══════════════════════════════════════════════ */

	/**
	 * Print the opening markup of a Hub screen: header, add button and navigation.
	 *
	 * @param string $page_key Slug of the screen being drawn.
	 */
	private static function open( $page_key ) {
		$icon = LSFH_PLUGIN_URL . 'assets/images/leftstack-icon.svg';
		echo '<div class="wrap"><div id="lsfh-app">';
		// Header.
		echo '<div class="lsfh-header">';
		echo '<div class="lsfh-header-left">';
		echo '<img src="' . esc_url( $icon ) . '" alt="" class="lsfh-header-icon">';
		echo '<span class="lsfh-header-title">Financial Hub</span>';
		echo '</div>';
		echo '<div class="lsfh-header-right">';
		// Show Add Donation button on donations page, Add Expense on expenditures, etc.
		if ( 'lsfh-donations' === $page_key ) {
			echo '<button class="lsfh-header-btn" id="lsfh-header-add">&#43; Add Donation</button>';
		} elseif ( 'lsfh-expenditures' === $page_key ) {
			echo '<button class="lsfh-header-btn" id="lsfh-header-add">&#43; Add Expense</button>';
		} elseif ( 'lsfh-inkind' === $page_key ) {
			echo '<button class="lsfh-header-btn" id="lsfh-header-add">&#43; Add In-Kind</button>';
		}
		echo '</div></div>';
		// Sub-nav.
		$nav = array(
			'lsfh-dashboard'    => 'Dashboard',
			'lsfh-donations'    => 'Donations',
			'lsfh-expenditures' => 'Expenditures',
			'lsfh-inkind'       => 'In-Kind',
			'lsfh-bank'         => 'Bank',
			'lsfh-settings'     => 'Settings',
		);
		echo '<nav class="lsfh-nav">';
		foreach ( $nav as $slug => $label ) {
			$active = $slug === $page_key ? ' class="active"' : '';
			echo '<a href="' . esc_url( admin_url( 'admin.php?page=' . $slug ) ) . '"' . $active . '>' . esc_html( $label ) . '</a>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}
		echo '</nav>';
		echo '<div class="lsfh-body">';
	}

	/**
	 * Print the closing markup of a Hub screen.
	 */
	private static function close() {
		echo '</div>'; // lsfh-body.
		$logo = LSFH_PLUGIN_URL . 'assets/images/leftstack-logo.svg';
		echo '<div class="lsfh-footer">';
		echo '<img src="' . esc_url( $logo ) . '" alt="LeftStack">';
		echo '<span>LeftStack Financial Hub &mdash; <a href="https://leftstack.com" target="_blank" rel="noopener noreferrer">leftstack.com</a></span>';
		echo '</div>';
		echo '</div></div>'; // #lsfh-app + .wrap
	}

	/* ══════ PAGES ═══════════════════════════════════════════════ */

	/**
	 * Draw a Hub screen: the shell, plus the element the React app mounts into.
	 *
	 * @param string $page_key Slug of the screen.
	 * @param string $mount    Name used for the element the app mounts into.
	 * @param bool   $settings Whether this is the Settings screen, which needs a stricter capability.
	 */
	private static function render_page( $page_key, $mount, $settings = false ) {
		if ( ! self::can_view( $settings ) ) {
			return;
		}
		self::open( $page_key );
		echo '<div id="' . esc_attr( 'lsfh-mount-' . $mount ) . '"></div>';
		self::close();
	}

	/**
	 * Render the Dashboard screen.
	 */
	public static function page_dashboard() {
		self::render_page( 'lsfh-dashboard', 'dashboard' );
	}

	/**
	 * Render the Donations screen.
	 */
	public static function page_donations() {
		self::render_page( 'lsfh-donations', 'donations' );
	}

	/**
	 * Render the Expenditures screen.
	 */
	public static function page_expenditures() {
		self::render_page( 'lsfh-expenditures', 'expenditures' );
	}

	/**
	 * Render the In-Kind screen.
	 */
	public static function page_inkind() {
		self::render_page( 'lsfh-inkind', 'inkind' );
	}

	/**
	 * Render the Bank tie-out screen.
	 */
	public static function page_bank() {
		self::render_page( 'lsfh-bank', 'bank' );
	}

	/**
	 * Render the Settings screen.
	 */
	public static function page_settings() {
		self::render_page( 'lsfh-settings', 'settings', true );
	}
}
