<?php
/**
 * Spend against money raised for each vendor group: reads the database and hands the rows to LSFH_Vendor_Rollup.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Money raised comes from the donations (a gift counts in the month of its contribution date), spend from the
 * expenditures other than processor fees (in the month of the expense date).
 */
class LSFH_Vendor_Report {

	/**
	 * The report for the saved groups.
	 *
	 * @param string $date_from First date to count (YYYY-MM-DD), blank for no start.
	 * @param string $date_to   Last date to count (YYYY-MM-DD), blank for no end.
	 * @return array groups (see LSFH_Vendor_Rollup::build), pages and payees seen.
	 */
	public static function run( $date_from = '', $date_to = '' ) {
		global $wpdb;
		$td = $wpdb->prefix . 'lsfh_donations';
		$te = $wpdb->prefix . 'lsfh_expenditures';
		$wd = self::between( 'contribution_date', $date_from, $date_to );
		$we = self::between( 'expense_date', $date_from, $date_to );
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$raised = (array) $wpdb->get_results(
			"SELECT DATE_FORMAT(contribution_date, '%Y-%m') AS month, COALESCE(fundraising_page, '') AS page,
			        COALESCE(reference_code, '') AS ref, MIN(contribution_date) AS first_date,
			        SUM(CASE WHEN gross_amount > 0 THEN 1 ELSE 0 END) AS gifts,
			        SUM(CASE WHEN gross_amount > 0 THEN gross_amount ELSE 0 END) AS raised,
			        SUM(CASE WHEN gross_amount < 0 THEN -gross_amount ELSE 0 END) AS refunds,
			        SUM(actblue_fee) AS fees
			 FROM $td
			 WHERE contribution_date IS NOT NULL $wd
			 GROUP BY month, page, ref",
			ARRAY_A
		);
		$spend  = (array) $wpdb->get_results(
			"SELECT DATE_FORMAT(expense_date, '%Y-%m') AS month, payee, SUM(amount) AS spent
			 FROM $te
			 WHERE expense_date IS NOT NULL AND payment_method <> 'fee' $we
			 GROUP BY month, payee",
			ARRAY_A
		);
		// phpcs:enable
		return LSFH_Vendor_Rollup::build( LSFH_Vendor_Groups::all(), $raised, $spend );
	}

	/**
	 * The SQL that limits a date column to a range, empty when no dates are given.
	 *
	 * @param string $column    The date column.
	 * @param string $date_from First date to count, or blank.
	 * @param string $date_to   Last date to count, or blank.
	 * @return string SQL starting with AND, or an empty string.
	 */
	private static function between( $column, $date_from, $date_to ) {
		global $wpdb;
		$sql = '';
		if ( '' !== $date_from ) {
			$sql .= $wpdb->prepare( " AND $column >= %s", $date_from ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		}
		if ( '' !== $date_to ) {
			$sql .= $wpdb->prepare( " AND $column <= %s", $date_to ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		}
		return $sql;
	}
}
