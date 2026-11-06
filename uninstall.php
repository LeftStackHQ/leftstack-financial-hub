<?php
/**
 * Runs when the plugin is deleted from the Plugins screen.
 *
 * Campaign finance records are legal records, so deleting the plugin does NOT delete
 * them by default. It only removes the plugin's own scaffolding: the Financial Hub
 * Manager role, the manage_lsfh capability and each user's saved column preferences.
 *
 * To remove all data as well (tables and settings), add this line to wp-config.php
 * BEFORE deleting the plugin:
 *
 *     define( 'LSFH_REMOVE_DATA_ON_UNINSTALL', true );
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

/**
 * Removes the Hub's role, capability and per-user settings, and optionally its data.
 */
class LSFH_Uninstaller {

	/**
	 * Clean up the current site.
	 *
	 * @param bool $remove_data Also drop the tables and delete the settings.
	 */
	public static function run_site( $remove_data ) {
		global $wpdb;

		$admin = get_role( 'administrator' );
		if ( $admin ) {
			$admin->remove_cap( 'manage_lsfh' );
		}
		remove_role( 'lsfh_manager' );

		// Per-user settings: the saved column preferences and the legacy staff flag.
		delete_metadata( 'user', 0, 'lsfh_column_prefs', '', true );
		delete_metadata( 'user', 0, 'lsfh_manager', '', true );

		if ( ! $remove_data ) {
			return;
		}

		foreach ( array( 'donations', 'expenditures', 'inkind', 'budget_categories', 'filing_periods', 'actblue_disbursements', 'bank_accounts', 'bank_lines', 'bank_matches', 'bank_match_links', 'best_efforts' ) as $table ) {
			$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}lsfh_{$table}" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.SchemaChange,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		}
		// Through delete_option() so WordPress's option cache is cleared as well.
		$names = $wpdb->get_col( $wpdb->prepare( "SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s", $wpdb->esc_like( 'lsfh_' ) . '%' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		foreach ( $names as $name ) {
			delete_option( $name );
		}
	}

	/** Clean up this site, or every site when the plugin is deleted network-wide. */
	public static function run() {
		$remove_data = defined( 'LSFH_REMOVE_DATA_ON_UNINSTALL' ) && true === LSFH_REMOVE_DATA_ON_UNINSTALL;

		if ( ! is_multisite() ) {
			self::run_site( $remove_data );
			return;
		}
		foreach ( get_sites(
			array(
				'fields' => 'ids',
				'number' => 0,
			)
		) as $blog_id ) {
			switch_to_blog( $blog_id );
			self::run_site( $remove_data );
			restore_current_blog();
		}
	}
}

LSFH_Uninstaller::run();
