<?php
/**
 * Filing period lookups: which period (and election) a date belongs to. Where periods overlap, the shorter one wins.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Filing period lookups: which period (and election) a date belongs to. Where periods overlap, the shorter one wins.
 * Also which records are filed under a period, and putting them back to none when a period is deleted.
 */
class LSFH_Periods {

	/**
	 * Filing periods, loaded once per request, the most specific first.
	 *
	 * @var array<int,object>|null
	 */
	private static $period_cache = null;

	/**
	 * Forget the periods loaded so far. Called whenever a period is added, changed or deleted, so a lookup later in the
	 * same request sees the change.
	 */
	public static function flush() {
		self::$period_cache = null;
	}

	/**
	 * SQL ORDER BY that puts the most specific period first: the shortest, then the latest start, then the newest. Every
	 * lookup of "which period covers this date" uses it, so they cannot disagree.
	 *
	 * @param string $alias The alias of the filing periods table in the query (a fixed name, never user input).
	 * @return string The ORDER BY expressions, without the keyword.
	 */
	private static function most_specific_order( $alias ) {
		return "DATEDIFF($alias.end_date, $alias.start_date) ASC, $alias.start_date DESC, $alias.id DESC";
	}

	/**
	 * The most specific period that covers a date.
	 *
	 * @param string $date Date, YYYY-MM-DD (a time part is ignored).
	 * @return object|null The period (id, start_date, end_date, election_type), or null when none covers the date.
	 */
	private static function covering( $date ) {
		global $wpdb;
		$date = substr( (string) $date, 0, 10 );
		if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) ) {
			return null;
		}
		if ( null === self::$period_cache ) {
			$order = self::most_specific_order( 'fp' );
			// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
			self::$period_cache = $wpdb->get_results( "SELECT fp.id, fp.start_date, fp.end_date, fp.election_type FROM {$wpdb->prefix}lsfh_filing_periods fp ORDER BY $order" );
			// phpcs:enable
		}
		foreach ( self::$period_cache as $fp ) {
			if ( $date >= $fp->start_date && $date <= $fp->end_date ) {
				return $fp;
			}
		}
		return null;
	}

	/**
	 * The election a contribution belongs to, taken from the filing period whose date range
	 * contains its contribution date.
	 *
	 * Returns '' when no period covers the date, or when the period's election is a custom name
	 * rather than primary, general, runoff or special. Callers report those rows instead of
	 * guessing: a silent default is how a whole payout ends up with the wrong election on a
	 * state filing. A site that has elections turned off always gets 'local'.
	 *
	 * @param string $date Contribution date, YYYY-MM-DD (a time part is ignored).
	 * @return string The election, or an empty string.
	 */
	public static function period_election_for_date( $date ) {
		if ( LSFH_Period_Elections::hidden() ) {
			return 'local';
		}
		$fp = self::covering( $date );
		if ( ! $fp ) {
			return '';
		}
		$e = strtolower( (string) $fp->election_type );
		return in_array( $e, LSFH_Period_Elections::TYPES, true ) ? $e : '';
	}

	/**
	 * The tables a filing period applies to, and the date column that decides which period a row belongs in.
	 *
	 * @return array<string,string> Table suffix => date column.
	 */
	public static function period_tables() {
		return array(
			'donations'    => 'contribution_date',
			'expenditures' => 'expense_date',
			'inkind'       => 'donation_date',
		);
	}

	/**
	 * How many records are filed under a period, by kind (donations, expenditures, in-kind and deposits).
	 *
	 * @param int $period_id The filing period.
	 * @return array<string,int> Table suffix => count.
	 */
	public static function usage( $period_id ) {
		global $wpdb;
		$counts = array();
		foreach ( self::filed_tables() as $table ) {
			// $table comes from a fixed list, so it is not user input; the id is bound.
			$counts[ $table ] = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->prefix}lsfh_$table WHERE filing_period_id = %d", $period_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		}
		return $counts;
	}

	/**
	 * Put every record filed under a period back to no period, so deleting the period leaves none pointing at it. The
	 * ledger sync gives a record with no period the one its date falls in.
	 *
	 * @param int $period_id The filing period.
	 */
	public static function release( $period_id ) {
		global $wpdb;
		foreach ( self::filed_tables() as $table ) {
			// $table comes from a fixed list, so it is not user input; the id is bound.
			$wpdb->query( $wpdb->prepare( "UPDATE {$wpdb->prefix}lsfh_$table SET filing_period_id = NULL WHERE filing_period_id = %d", $period_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		}
	}

	/**
	 * Every table whose rows can be filed under a period: the dated records and the deposits.
	 *
	 * @return string[] Table suffixes.
	 */
	private static function filed_tables() {
		return array_merge( array_keys( self::period_tables() ), array( 'actblue_disbursements' ) );
	}

	/**
	 * SQL that picks the rows dated inside a period and governed by it: no shorter period also covers the date, because
	 * the shorter one is the more specific home.
	 *
	 * @param object $period The filing period row.
	 * @param string $col    The table's date column (a name from LSFH_Periods::period_tables(), never user input).
	 * @return string A WHERE condition, already prepared.
	 */
	public static function governed_where( $period, $col ) {
		global $wpdb;
		$fp = $wpdb->prefix . 'lsfh_filing_periods';
		// $col is a column name from a fixed list and $fp is a table name, so neither is user input; every value is bound.
		// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		return $wpdb->prepare(
			"$col BETWEEN %s AND %s
			 AND NOT EXISTS (
				SELECT 1 FROM $fp other
				WHERE other.id <> %d
				  AND $col BETWEEN other.start_date AND other.end_date
				  AND DATEDIFF(other.end_date, other.start_date) < DATEDIFF(%s, %s)
			 )",
			$period->start_date,
			$period->end_date,
			$period->id,
			$period->end_date,
			$period->start_date
		);
		// phpcs:enable
	}

	/**
	 * Return the filing period ID whose date range contains a date.
	 *
	 * Used to give new records a period from their date. When periods overlap (for example a
	 * Pre-General report inside Q4), the shorter one wins, as it is the more specific.
	 *
	 * @param string $date Date, YYYY-MM-DD.
	 * @return int|null Period ID, or null when no period covers the date.
	 */
	public static function period_for_date( string $date ): ?int {
		$fp = self::covering( $date );
		return $fp ? (int) $fp->id : null;
	}

	/**
	 * Give every dated record that has no filing period the one its date falls in (the most specific, as everywhere).
	 * Only records with no period are touched: a period that is there was decided by a person or by a payout, and a date
	 * only gives a starting guess for rows nobody has decided about yet.
	 */
	public static function fill_missing() {
		global $wpdb;
		$fp    = $wpdb->prefix . 'lsfh_filing_periods';
		$order = self::most_specific_order( 'f2' );
		foreach ( self::period_tables() as $table => $col ) {
			// $table and $col come from the fixed list in period_tables(), so neither is user input.
			$touch = 'donations' === $table ? $wpdb->prepare( ', t.updated_at = %s', current_time( 'mysql' ) ) : '';
			// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
			$wpdb->query(
				"UPDATE {$wpdb->prefix}lsfh_$table t
				 INNER JOIN $fp fp ON t.$col BETWEEN fp.start_date AND fp.end_date
				 AND fp.id = (SELECT f2.id FROM $fp f2 WHERE t.$col BETWEEN f2.start_date AND f2.end_date ORDER BY $order LIMIT 1)
				 SET t.filing_period_id = fp.id$touch
				 WHERE t.filing_period_id IS NULL"
			);
			// phpcs:enable
		}
	}
}
