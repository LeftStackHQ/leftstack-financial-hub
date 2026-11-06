<?php
/**
 * Privacy tools for donor records: suggested policy text, a personal data exporter and an eraser that explains why records are kept.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Privacy tools for donor records.
 *
 * WordPress's Export and Erase Personal Data tools (Tools menu) work from an email address, and a donation
 * carries one, so the records are found by it. Who may use the tools is decided by WordPress, not by the Hub:
 * both screens, and the requests behind them, need the export_others_personal_data and
 * erase_others_personal_data capabilities, which only administrators have (on a network, super admins). The
 * Hub's own manager role does not get them, so a person who can work in the Hub still cannot pull a donor's
 * records out through this door. The callbacks below are reached only through those screens.
 *
 * Contributions are campaign financial records, kept for audits and for the reports filed with the state, so
 * the eraser removes nothing; it reports that the records were retained and why. Staff notes stay out of the
 * export, because they are the campaign's working notes and not what the donor gave.
 */
class LSFH_Donor_Privacy {

	const PER_PAGE = 100;

	/**
	 * Add the exporter to WordPress's Export Personal Data tool.
	 *
	 * @param array $exporters Registered exporters.
	 * @return array
	 */
	public static function register_exporter( $exporters ) {
		$exporters['lsfh-donations'] = array(
			'exporter_friendly_name' => __( 'Financial Hub donor records', 'leftstack-financial-hub' ),
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
		$erasers['lsfh-donations'] = array(
			'eraser_friendly_name' => __( 'Financial Hub donor records', 'leftstack-financial-hub' ),
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
		$text = '<h3>' . __( 'Contributions', 'leftstack-financial-hub' ) . '</h3>'
			. '<p>' . __( 'When someone contributes to the campaign, we keep the contribution\'s date, amount and payment method, and the contributor\'s name, address, occupation, employer, phone number and email address, as the campaign finance rules require. Card and bank details are never kept here. Because these records are part of the campaign\'s financial records, they are kept for as long as the law requires and are reported to the state as the law requires. If you ask us to erase them, we will tell you that they were kept for that reason.', 'leftstack-financial-hub' ) . '</p>';
		wp_add_privacy_policy_content( 'LeftStack Financial Hub', wp_kses_post( $text ) );
	}

	/**
	 * Personal data exporter: the contributions recorded under this email address.
	 *
	 * @param string $email_address The person's email address.
	 * @param int    $page          Page of results, from 1.
	 * @return array{data: array[], done: bool}
	 */
	public static function export( $email_address, $page = 1 ) {
		$items = array();
		foreach ( self::records_for( $email_address, $page ) as $row ) {
			$items[] = array(
				'group_id'          => 'lsfh-donations',
				'group_label'       => __( 'Contributions', 'leftstack-financial-hub' ),
				'group_description' => __( 'Contributions recorded under your email address.', 'leftstack-financial-hub' ),
				'item_id'           => 'lsfh-donation-' . $row['id'],
				'data'              => self::fields( $row ),
			);
		}
		return array(
			'data' => $items,
			'done' => count( $items ) < self::PER_PAGE,
		);
	}

	/**
	 * Personal data eraser: contributions are campaign financial records that must be kept, so nothing is erased.
	 * WordPress's tool is told the data was retained, and why, so the person asking is not left guessing.
	 *
	 * @param string $email_address The person's email address.
	 * @param int    $page          Page of results, from 1.
	 * @return array{items_removed: bool, items_retained: bool, messages: string[], done: bool}
	 */
	public static function erase( $email_address, $page = 1 ) {
		$found = (bool) self::records_for( $email_address, 1 );
		return array(
			'items_removed'  => false,
			'items_retained' => $found,
			'messages'       => $found ? array( __( 'Contribution records were kept. They are part of the campaign\'s financial records, which must be kept for audits and reported as the law requires.', 'leftstack-financial-hub' ) ) : array(),
			'done'           => true,
		);
	}

	/**
	 * The label and value pairs of one contribution, leaving out empty fields.
	 *
	 * @param array $row A donation row.
	 * @return array[] Each: name, value.
	 */
	private static function fields( $row ) {
		$labels = array(
			'contribution_date' => __( 'Date', 'leftstack-financial-hub' ),
			'gross_amount'      => __( 'Amount', 'leftstack-financial-hub' ),
			'payment_type'      => __( 'Payment method', 'leftstack-financial-hub' ),
			'first_name'        => __( 'First name', 'leftstack-financial-hub' ),
			'last_name'         => __( 'Last name', 'leftstack-financial-hub' ),
			'address'           => __( 'Address', 'leftstack-financial-hub' ),
			'city'              => __( 'City', 'leftstack-financial-hub' ),
			'state'             => __( 'State', 'leftstack-financial-hub' ),
			'zip'               => __( 'ZIP', 'leftstack-financial-hub' ),
			'occupation'        => __( 'Occupation', 'leftstack-financial-hub' ),
			'employer'          => __( 'Employer', 'leftstack-financial-hub' ),
			'phone'             => __( 'Phone', 'leftstack-financial-hub' ),
			'email'             => __( 'Email', 'leftstack-financial-hub' ),
		);
		$data   = array();
		foreach ( $labels as $column => $label ) {
			if ( isset( $row[ $column ] ) && '' !== (string) $row[ $column ] ) {
				$data[] = array(
					'name'  => $label,
					'value' => $row[ $column ],
				);
			}
		}
		return $data;
	}

	/**
	 * One page of the contributions recorded under an email address.
	 *
	 * @param string $email_address The person's email address.
	 * @param int    $page          Page of results, from 1.
	 * @return array[] Database rows.
	 */
	private static function records_for( $email_address, $page ) {
		global $wpdb;
		if ( '' === trim( (string) $email_address ) ) {
			return array();
		}
		$columns = 'id, contribution_date, gross_amount, payment_type, first_name, last_name, address, city, state, zip, occupation, employer, phone, email';
		$sql     = "SELECT $columns FROM {$wpdb->prefix}lsfh_donations WHERE email = %s ORDER BY id LIMIT %d OFFSET %d";
		return (array) $wpdb->get_results( $wpdb->prepare( $sql, $email_address, self::PER_PAGE, ( max( 1, (int) $page ) - 1 ) * self::PER_PAGE ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
	}
}
