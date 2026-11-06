<?php
/**
 * Phone and email of a donation that is already saved: filling them in without ever replacing one.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Phone and email were added to the ActBlue import after the first data was brought in, so older donations have
 * them blank. When a sync or a CSV import meets a donation that is already saved, it fills these two in only where
 * the stored value is blank and the file has one. A value that is there, typed by hand or imported earlier, is never
 * replaced, and a blank in the file never clears one.
 */
class LSFH_Donor_Contact {

	/**
	 * A phone number as it is stored: formatted, and cut to the column's length.
	 *
	 * @param string $raw The value from the file.
	 * @return string
	 */
	public static function clean_phone( $raw ) {
		return substr( LSFH_Csv::fmt_phone( sanitize_text_field( (string) $raw ) ), 0, 20 );
	}

	/**
	 * An email address as it is stored.
	 *
	 * @param string $raw The value from the file.
	 * @return string
	 */
	public static function clean_email( $raw ) {
		return sanitize_email( (string) $raw );
	}

	/**
	 * Which of phone and email the file can fill in: the ones that are blank in the database and given in the file.
	 *
	 * @param string $stored_phone The phone saved on the donation.
	 * @param string $stored_email The email saved on the donation.
	 * @param string $phone        The phone in the file, already cleaned.
	 * @param string $email        The email in the file, already cleaned.
	 * @return array<string, string> Column => the value to save (empty when nothing is to be filled).
	 */
	public static function blanks_to_fill( $stored_phone, $stored_email, $phone, $email ) {
		$fill = array();
		if ( '' === trim( (string) $stored_phone ) && '' !== $phone ) {
			$fill['phone'] = $phone;
		}
		if ( '' === trim( (string) $stored_email ) && '' !== $email ) {
			$fill['email'] = $email;
		}
		return $fill;
	}

	/**
	 * Fill the blank phone and email of a saved donation from a file's values.
	 *
	 * @param int    $id           The donation's id.
	 * @param string $stored_phone The phone saved on it.
	 * @param string $stored_email The email saved on it.
	 * @param string $phone        The phone in the file, already cleaned.
	 * @param string $email        The email in the file, already cleaned.
	 * @return array{phone: int, email: int} 1 for each of the two that was filled in.
	 */
	public static function fill( $id, $stored_phone, $stored_email, $phone, $email ) {
		$fill = self::blanks_to_fill( $stored_phone, $stored_email, $phone, $email );
		if ( $fill ) {
			global $wpdb;
			$fill['updated_at'] = current_time( 'mysql' );
			$wpdb->update( $wpdb->prefix . 'lsfh_donations', $fill, array( 'id' => (int) $id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		}
		return array(
			'phone' => isset( $fill['phone'] ) ? 1 : 0,
			'email' => isset( $fill['email'] ) ? 1 : 0,
		);
	}
}
