<?php
/**
 * Settings routes: campaign settings, staff access, user search and per-user column preferences.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Settings routes: campaign settings, staff access, user search and per-user column preferences.
 *
 * Column preferences are stored as one JSON blob in user meta, keyed by table id, holding the
 * columns that user has HIDDEN. Storing hidden rather than visible means a column added in a
 * later release shows up for everyone by default instead of being invisible to existing users.
 */
class LSFH_Settings_Controller extends LSFH_REST_Base {

	private const COL_PREFS_META = 'lsfh_column_prefs';

	/**
	 * Read a user's saved column preferences.
	 *
	 * @param int $user_id User ID.
	 * @return array Hidden columns, keyed by table.
	 */
	public static function read_col_prefs( $user_id ) {
		$raw = get_user_meta( $user_id, self::COL_PREFS_META, true );
		$val = is_string( $raw ) ? json_decode( $raw, true ) : $raw;
		return is_array( $val ) ? $val : array();
	}

	/**
	 * Return the current user's hidden columns, by table.
	 *
	 * @return WP_REST_Response
	 */
	public static function get_column_prefs() {
		return rest_ensure_response( self::read_col_prefs( get_current_user_id() ) );
	}

	/**
	 * Save which columns the current user hides in one table.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function save_column_prefs( WP_REST_Request $req ) {
		$table = sanitize_key( (string) $req->get_param( 'table' ) );
		if ( '' === $table ) {
			return new WP_Error( 'bad_request', 'Missing table.', array( 'status' => 400 ) );
		}
		$hidden = $req->get_param( 'hidden' );
		if ( ! is_array( $hidden ) ) {
			$hidden = array();
		}
		$hidden = array_values( array_unique( array_filter( array_map( 'sanitize_key', $hidden ) ) ) );

		$user_id       = get_current_user_id();
		$all           = self::read_col_prefs( $user_id );
		$all[ $table ] = $hidden;
		update_user_meta( $user_id, self::COL_PREFS_META, wp_json_encode( $all ) );

		return rest_ensure_response(
			array(
				'saved'  => true,
				'table'  => $table,
				'hidden' => $hidden,
			)
		);
	}

	/**
	 * Return the settings. The ActBlue password is masked.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function get_settings( WP_REST_Request $req ) {
		return rest_ensure_response(
			array(
				'campaign_name'        => get_option( 'lsfh_campaign_name', '' ),
				'campaign_goal'        => (float) get_option( 'lsfh_campaign_goal', 0 ),
				'beginning_balance'    => (float) get_option( 'lsfh_beginning_balance', 0 ),
				'limit_primary'        => (float) get_option( 'lsfh_limit_primary', 3300 ),
				'limit_general'        => (float) get_option( 'lsfh_limit_general', 3300 ),
				'limit_runoff'         => (float) get_option( 'lsfh_limit_runoff', 3300 ),
				'no_limit'             => (bool) get_option( 'lsfh_no_limit', false ),
				'near_limit_pct'       => (int) get_option( 'lsfh_near_limit_pct', 80 ),
				'org_limit_primary'    => (float) get_option( 'lsfh_org_limit_primary', 5000 ),
				'org_limit_general'    => (float) get_option( 'lsfh_org_limit_general', 5000 ),
				'org_limit_runoff'     => (float) get_option( 'lsfh_org_limit_runoff', 5000 ),
				'org_no_limit'         => (bool) get_option( 'lsfh_org_no_limit', false ),
				'no_elections'         => LSFH_Period_Elections::hidden(),
				'unitemized_threshold' => (float) get_option( 'lsfh_unitemized_threshold', 100 ),
				'filing_state'         => get_option( 'lsfh_filing_state', '' ),
				'actblue_username'     => get_option( 'lsfh_actblue_username', '' ),
				'actblue_password'     => get_option( 'lsfh_actblue_password', '' ) ? '••••••••' : '',
				'actblue_committee_id' => get_option( 'lsfh_actblue_committee_id', '' ),
				'election_date'        => get_option( 'lsfh_election_date', '' ),
			)
		);
	}

	/**
	 * Save the settings that were sent.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function save_settings( WP_REST_Request $req ) {
		$p   = $req->get_json_params() ?? array();
		$map = array(
			'campaign_name'        => 'sanitize_text_field',
			'campaign_goal'        => 'floatval',
			'beginning_balance'    => 'floatval',
			'limit_primary'        => 'floatval',
			'limit_general'        => 'floatval',
			'limit_runoff'         => 'floatval',
			'no_limit'             => 'boolval',
			'near_limit_pct'       => 'intval',
			'org_limit_primary'    => 'floatval',
			'org_limit_general'    => 'floatval',
			'org_limit_runoff'     => 'floatval',
			'org_no_limit'         => 'boolval',
			'no_elections'         => 'boolval',
			'unitemized_threshold' => 'floatval',
			'filing_state'         => 'sanitize_text_field',
			'actblue_username'     => 'sanitize_text_field',
			'actblue_committee_id' => 'sanitize_text_field',
			'election_date'        => 'sanitize_text_field',
		);
		foreach ( $map as $key => $fn ) {
			if ( isset( $p[ $key ] ) ) {
				update_option( 'lsfh_' . $key, $fn( $p[ $key ] ) );
			}
		}
		// Password: only update if not masked.
		if ( isset( $p['actblue_password'] ) && '••••••••' !== $p['actblue_password'] ) {
			self::save_secret( 'lsfh_actblue_password', $p['actblue_password'] );
		}
		return self::get_settings( $req );
	}

	/**
	 * Store a credential. It is kept exactly as typed (sanitize_text_field() strips tags
	 * and percent sequences, which silently changes a password that contains them) and
	 * is not autoloaded, so it is read only when an ActBlue request needs it instead of
	 * being loaded into memory on every page of the site.
	 *
	 * @param string $option Option name.
	 * @param mixed  $value  Secret value.
	 */
	public static function save_secret( $option, $value ) {
		update_option( $option, substr( trim( (string) $value ), 0, 255 ), false );
	}

	/**
	 * List the users who have been given access to the Hub.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function list_staff( WP_REST_Request $req ) {
		// Query by role so the WP Users screen correctly shows "Financial Hub Manager".
		// Also pick up legacy users who have the meta flag but not the role yet.
		$by_role = get_users( array( 'role' => 'lsfh_manager' ) );
		// A meta query on a handful of staff accounts; it is not a hot path.
		// phpcs:disable WordPress.DB.SlowDBQuery.slow_db_query_meta_key,WordPress.DB.SlowDBQuery.slow_db_query_meta_value
		$by_meta = get_users(
			array(
				'meta_key'   => 'lsfh_manager',
				'meta_value' => '1',
			)
		);
		// phpcs:enable WordPress.DB.SlowDBQuery.slow_db_query_meta_key,WordPress.DB.SlowDBQuery.slow_db_query_meta_value
		$all = array_unique( array_merge( $by_role, $by_meta ), SORT_REGULAR );
		return rest_ensure_response(
			array_values(
				array_map(
					fn( $u ) => array(
						'id'    => $u->ID,
						'name'  => $u->display_name,
						'email' => $u->user_email,
						'login' => $u->user_login,
					),
					$all
				)
			)
		);
	}

	/**
	 * Give a user access to the Hub.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function grant_staff( WP_REST_Request $req ) {
		$u = get_user_by( 'id', (int) $req->get_param( 'id' ) );
		// On a network, only someone who already belongs to this site can be made staff;
		// otherwise any account on the network could be added by guessing its ID.
		if ( ! $u || ( is_multisite() && ! is_user_member_of_blog( $u->ID ) ) ) {
			return new WP_Error( 'not_found', 'User not found', array( 'status' => 404 ) );
		}
		$u->add_role( 'lsfh_manager' );
		$u->add_cap( 'manage_lsfh' );
		update_user_meta( $u->ID, 'lsfh_manager', '1' );
		return rest_ensure_response(
			array(
				'granted' => true,
				'user_id' => $u->ID,
			)
		);
	}

	/**
	 * Remove a user's access to the Hub.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function revoke_staff( WP_REST_Request $req ) {
		$u = get_user_by( 'id', (int) $req->get_param( 'id' ) );
		if ( ! $u ) {
			return new WP_Error( 'not_found', 'User not found', array( 'status' => 404 ) );
		}
		$u->remove_role( 'lsfh_manager' );
		$u->remove_cap( 'manage_lsfh' );
		delete_user_meta( $u->ID, 'lsfh_manager' );
		return rest_ensure_response(
			array(
				'revoked' => true,
				'user_id' => $u->ID,
			)
		);
	}

	/**
	 * Search this site's users by login, email or name, to add as staff.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function search_users( WP_REST_Request $req ) {
		$q     = sanitize_text_field( $req->get_param( 'q' ) ?? '' );
		$users = get_users(
			array(
				'search'         => "*{$q}*",
				'search_columns' => array( 'user_login', 'user_email', 'display_name' ),
				'number'         => 20,
			)
		);
		return rest_ensure_response(
			array_map(
				fn( $u )=>array(
					'id'    => $u->ID,
					'name'  => $u->display_name,
					'email' => $u->user_email,
					'login' => $u->user_login,
				),
				$users
			)
		);
	}
}
