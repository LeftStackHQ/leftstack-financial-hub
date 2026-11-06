<?php
/**
 * Balance rules: what the campaign has, raised, spent and has scheduled to spend.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Balance rules: what the campaign has, raised, spent and has scheduled to spend.
 *
 * One definition of "cash on hand", shared by the dashboard, the budget view, the period list
 * and the WordPress dashboard widget. It uses GROSS contributions: processor fees are logged as
 * expenditures (one per payout), so starting from net contributions as well would subtract every
 * fee twice.
 */
class LSFH_Balance {

	/**
	 * Cash balance at the start of $date: starting funds, plus gross contributions,
	 * minus expenditures, all dated before it.
	 *
	 * @param string $date YYYY-MM-DD.
	 * @return float
	 */
	public static function opening_balance_before( $date ) {
		global $wpdb;
		$start  = (float) get_option( 'lsfh_beginning_balance', 0 );
		$raised = (float) $wpdb->get_var( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prepare(
				"SELECT COALESCE(SUM(gross_amount),0) FROM {$wpdb->prefix}lsfh_donations WHERE contribution_date < %s",
				$date
			)
		);
		$spent  = (float) $wpdb->get_var( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prepare(
				"SELECT COALESCE(SUM(amount),0) FROM {$wpdb->prefix}lsfh_expenditures WHERE expense_date < %s",
				$date
			)
		);
		return $start + $raised - $spent;
	}

	/**
	 * Cash on hand today: starting funds, plus all gross contributions, minus
	 * expenditures dated today or earlier. Payments dated after today are scheduled
	 * and are reported separately by scheduled_expenditures().
	 *
	 * @return float
	 */
	public static function current_balance() {
		global $wpdb;
		$start  = (float) get_option( 'lsfh_beginning_balance', 0 );
		$raised = (float) $wpdb->get_var( "SELECT COALESCE(SUM(gross_amount),0) FROM {$wpdb->prefix}lsfh_donations" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		return $start + $raised - self::spent_through_today();
	}

	/**
	 * Total of expenditures dated today or earlier (site time).
	 *
	 * @return float
	 */
	public static function spent_through_today() {
		global $wpdb;
		return (float) $wpdb->get_var( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prepare(
				"SELECT COALESCE(SUM(amount),0) FROM {$wpdb->prefix}lsfh_expenditures WHERE expense_date <= %s",
				current_time( 'Y-m-d' )
			)
		);
	}

	/**
	 * Expenditures dated after today (site time): the total and how many there are.
	 *
	 * @return array{total: float, count: int}
	 */
	public static function scheduled_expenditures() {
		global $wpdb;
		$row = $wpdb->get_row( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prepare(
				"SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS cnt FROM {$wpdb->prefix}lsfh_expenditures WHERE expense_date > %s",
				current_time( 'Y-m-d' )
			)
		);
		return array(
			'total' => (float) ( $row->total ?? 0 ),
			'count' => (int) ( $row->cnt ?? 0 ),
		);
	}
}
