<?php
/**
 * Donors the campaign asked for their occupation and employer, and who never answered.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * A state report wants the occupation and employer of an itemized individual donor. When a donor will not give them, the
 * campaign records that it asked (the date, and a note). One record covers every gift from that donor, so a monthly
 * donor is marked once. A donor is the name on the donation, see LSFH_Donor_Key.
 */
class LSFH_Best_Efforts {

	/**
	 * The records, keyed by donor.
	 *
	 * @return array<string, array{id: int, first_name: string, last_name: string, requested_on: string, note: string}>
	 *         Keyed by LSFH_Best_Efforts::hash() of the donor's name.
	 */
	public static function all() {
		global $wpdb;
		$rows = (array) $wpdb->get_results( "SELECT id, donor_hash, first_name, last_name, requested_on, note FROM {$wpdb->prefix}lsfh_best_efforts" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$out  = array();
		foreach ( $rows as $row ) {
			$out[ $row->donor_hash ] = array(
				'id'           => (int) $row->id,
				'first_name'   => (string) $row->first_name,
				'last_name'    => (string) $row->last_name,
				'requested_on' => (string) $row->requested_on,
				'note'         => (string) $row->note,
			);
		}
		return $out;
	}

	/**
	 * What identifies a donor in the table.
	 *
	 * @param string $first First name (an organization's whole name is kept in this field).
	 * @param string $last  Last name.
	 * @return string
	 */
	public static function hash( $first, $last ) {
		return sha1( implode( "\n", LSFH_Donor_Key::of( $first, $last ) ) );
	}

	/**
	 * Record that the campaign asked this donor, or change the date and note of the record already there.
	 *
	 * @param string $first        First name.
	 * @param string $last         Last name.
	 * @param string $requested_on The date it asked, Y-m-d.
	 * @param string $note         A short note.
	 * @return int|WP_Error The record id, or an error when there is no name.
	 */
	public static function save( $first, $last, $requested_on, $note ) {
		global $wpdb;
		$first = trim( (string) $first );
		$last  = trim( (string) $last );
		if ( '' === $first && '' === $last ) {
			return new WP_Error( 'missing_name', 'A best-efforts record needs the donor\'s name.', array( 'status' => 400 ) );
		}
		$table = $wpdb->prefix . 'lsfh_best_efforts';
		$hash  = self::hash( $first, $last );
		$data  = array(
			'first_name'   => $first,
			'last_name'    => $last,
			'requested_on' => $requested_on,
			'note'         => $note,
		);
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$id = (int) $wpdb->get_var( $wpdb->prepare( "SELECT id FROM $table WHERE donor_hash = %s", $hash ) );
		if ( $id ) {
			$wpdb->update( $table, $data, array( 'id' => $id ) );
			return $id;
		}
		$wpdb->insert(
			$table,
			$data + array(
				'donor_hash' => $hash,
				'created_by' => get_current_user_id(),
				'created_at' => current_time( 'mysql' ),
			)
		);
		// phpcs:enable
		return (int) $wpdb->insert_id;
	}

	/**
	 * Take a record away.
	 *
	 * @param int $id The record id.
	 * @return bool Whether a record was removed.
	 */
	public static function delete( $id ) {
		global $wpdb;
		return (bool) $wpdb->delete( $wpdb->prefix . 'lsfh_best_efforts', array( 'id' => (int) $id ), array( '%d' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
	}
}
