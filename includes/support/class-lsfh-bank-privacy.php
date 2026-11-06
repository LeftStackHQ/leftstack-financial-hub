<?php
/**
 * Privacy tools for bank lines: suggested policy text, a personal data exporter and an eraser that explains why records are kept.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Privacy tools for bank lines.
 *
 * Bank statement descriptions can carry a person's name (a Zelle payment, a mobile deposit). WordPress's
 * Export and Erase Personal Data tools work from an email address, and bank lines have none, so a line is
 * linked to a person by their full name as the Hub knows it (their donor records and their user account).
 * Bank lines are campaign financial records (public records, kept for audits), so the eraser removes
 * nothing; it reports that the lines were retained and why.
 */
class LSFH_Bank_Privacy {

	const PER_PAGE = 100;

	/**
	 * Add the exporter to WordPress's Export Personal Data tool.
	 *
	 * @param array $exporters Registered exporters.
	 * @return array
	 */
	public static function register_exporter( $exporters ) {
		$exporters['lsfh-bank-lines'] = array(
			'exporter_friendly_name' => __( 'Financial Hub bank lines', 'leftstack-financial-hub' ),
			'callback'               => array( __CLASS__, 'export' ),
		);
		return $exporters;
	}

	/**
	 * Add the eraser to WordPress's Erase Personal Data tool.
	 *
	 * @param array $erasers Registered erasers.
	 * @return array
	 */
	public static function register_eraser( $erasers ) {
		$erasers['lsfh-bank-lines'] = array(
			'eraser_friendly_name' => __( 'Financial Hub bank lines', 'leftstack-financial-hub' ),
			'callback'             => array( __CLASS__, 'erase' ),
		);
		return $erasers;
	}

	/**
	 * Suggest text for the site's privacy policy page.
	 */
	public static function add_policy_text() {
		if ( ! function_exists( 'wp_add_privacy_policy_content' ) ) {
			return;
		}
		$text = '<h3>' . __( 'Bank statement lines', 'leftstack-financial-hub' ) . '</h3>'
			. '<p>' . __( 'When campaign staff upload a bank statement to tie it to the campaign\'s records, we keep each line\'s date, amount, description and check number. The description can include the name of a person or business that paid or was paid. We do not keep account numbers. Because these lines are part of the campaign\'s financial records, they are kept for as long as the law requires. If you ask us to erase them, we will tell you that they were kept for that reason.', 'leftstack-financial-hub' ) . '</p>';
		wp_add_privacy_policy_content( 'LeftStack Financial Hub', wp_kses_post( $text ) );
	}

	/**
	 * Personal data exporter: the bank lines whose description names this person.
	 *
	 * @param string $email_address The person's email address.
	 * @param int    $page          Page of results, from 1.
	 * @return array{data: array[], done: bool}
	 */
	public static function export( $email_address, $page = 1 ) {
		$items = array();
		foreach ( self::lines_naming( $email_address, $page ) as $line ) {
			$items[] = array(
				'group_id'          => 'lsfh-bank-lines',
				'group_label'       => __( 'Bank statement lines', 'leftstack-financial-hub' ),
				'group_description' => __( 'Lines of an uploaded bank statement that name you.', 'leftstack-financial-hub' ),
				'item_id'           => 'lsfh-bank-line-' . $line['id'],
				'data'              => array(
					array(
						'name'  => __( 'Date', 'leftstack-financial-hub' ),
						'value' => $line['line_date'],
					),
					array(
						'name'  => __( 'Amount', 'leftstack-financial-hub' ),
						'value' => $line['amount'],
					),
					array(
						'name'  => __( 'Description', 'leftstack-financial-hub' ),
						'value' => $line['description'],
					),
				),
			);
		}
		return array(
			'data' => $items,
			'done' => count( $items ) < self::PER_PAGE,
		);
	}

	/**
	 * Personal data eraser: bank lines are campaign financial records that must be kept for audits, so nothing
	 * is erased. WordPress's tool is told the data was retained, and why, so the person asking is not left guessing.
	 *
	 * @param string $email_address The person's email address.
	 * @param int    $page          Page of results, from 1.
	 * @return array{items_removed: bool, items_retained: bool, messages: string[], done: bool}
	 */
	public static function erase( $email_address, $page = 1 ) {
		$found = (bool) self::lines_naming( $email_address, 1 );
		return array(
			'items_removed'  => false,
			'items_retained' => $found,
			'messages'       => $found ? array( __( 'Bank statement lines were kept. They are part of the campaign\'s financial records, which must be kept for audits.', 'leftstack-financial-hub' ) ) : array(),
			'done'           => true,
		);
	}

	/**
	 * One page of the lines whose description contains this person's full name.
	 *
	 * @param string $email_address The person's email address.
	 * @param int    $page          Page of results, from 1.
	 * @return array[] Database rows: id, line_date, amount, description.
	 */
	private static function lines_naming( $email_address, $page ) {
		global $wpdb;
		$names = self::names_for( $email_address );
		if ( ! $names ) {
			return array();
		}
		$tests  = implode( ' OR ', array_fill( 0, count( $names ), 'description LIKE %s' ) );
		$values = array_map(
			static function ( $name ) use ( $wpdb ) {
				return '%' . $wpdb->esc_like( $name ) . '%';
			},
			$names
		);
		$sql    = "SELECT id, line_date, amount, description FROM {$wpdb->prefix}lsfh_bank_lines WHERE ($tests) ORDER BY id LIMIT %d OFFSET %d";
		return (array) $wpdb->get_results( $wpdb->prepare( $sql, ...array_merge( $values, array( self::PER_PAGE, ( max( 1, (int) $page ) - 1 ) * self::PER_PAGE ) ) ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
	}

	/**
	 * The full names the Hub knows for an email address: donor records and the user account.
	 *
	 * @param string $email_address The person's email address.
	 * @return string[] Full names (first and last), at least two words each.
	 */
	private static function names_for( $email_address ) {
		global $wpdb;
		$names = (array) $wpdb->get_col( $wpdb->prepare( "SELECT DISTINCT TRIM(CONCAT_WS(' ', first_name, last_name)) FROM {$wpdb->prefix}lsfh_donations WHERE email = %s AND first_name <> '' AND last_name <> ''", $email_address ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$user  = get_user_by( 'email', $email_address );
		if ( $user && $user->first_name && $user->last_name ) {
			$names[] = trim( $user->first_name . ' ' . $user->last_name );
		}
		return array_values( array_unique( array_filter( $names, static fn( $name ) => str_contains( $name, ' ' ) ) ) );
	}
}
