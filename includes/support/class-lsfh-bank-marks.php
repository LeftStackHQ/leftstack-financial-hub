<?php
/**
 * What confirming a bank match does to the Hub items it covers, and how undoing it reverses exactly that.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Marks Hub items as balanced when a bank match is confirmed, so nobody has to mark them again by hand.
 *
 * A payout is marked Reconciled (which balances its donations, through LSFH_Payout_Status); an expense or
 * a donation without a payout is marked Balanced. A blank date is filled from the bank: Date Received on a
 * payout, Posted date on an expense, Date Deposited on a donation. A date someone typed is never changed.
 * What was turned on is returned so it can be stored with the match: undoing the match then reverses only
 * that, and an item someone had already marked by hand stays marked.
 */
class LSFH_Bank_Marks {

	/**
	 * Mark one Hub item for a confirmed match.
	 *
	 * @param string $kind       payout, donation or expense.
	 * @param int    $row_id     The item's row id.
	 * @param string $bank_date  Y-m-d, the bank line's date (the latest, when several lines are matched).
	 * @param bool   $fill_dates Whether to fill a blank date from the bank.
	 * @return array{marked: string, marked_date: string|null} What was turned on, and the date written (if any).
	 */
	public static function apply( $kind, $row_id, $bank_date, $fill_dates ) {
		$table = self::table( $kind );
		$flag  = self::flag( $kind );
		$date  = self::date_column( $kind );
		$row   = self::row( $table, $row_id );
		if ( ! $row ) {
			return array(
				'marked'      => '',
				'marked_date' => null,
			);
		}
		$set    = array();
		$marked = array();
		if ( ! (int) $row[ $flag ] ) {
			$set[ $flag ] = 1;
			$marked[]     = $flag;
		}
		$fills = $fill_dates && self::date_is_blank( $row[ $date ] ) && self::may_post( $kind, $row );
		if ( $fills ) {
			$set[ $date ] = $bank_date;
			$marked[]     = 'date';
		}
		if ( $set ) {
			self::update( $table, $row_id, $set );
		}
		// A payout already Reconciled by hand still gets its donations (and fee) balanced: they may have been imported
		// after it was marked. Nothing extra is reported as marked, so undoing the match leaves them as they are.
		if ( 'payout' === $kind ) {
			LSFH_Payout_Status::sync_donations( $row['disbursement_id'], true );
		}
		return array(
			'marked'      => implode( ',', $marked ),
			'marked_date' => $fills ? $bank_date : null,
		);
	}

	/**
	 * Undo what a match turned on for one Hub item.
	 *
	 * @param string      $kind        payout, donation or expense.
	 * @param int         $row_id      The item's row id.
	 * @param string      $marked      What apply() returned as marked.
	 * @param string|null $marked_date What apply() returned as marked_date.
	 */
	public static function revert( $kind, $row_id, $marked, $marked_date ) {
		if ( '' === $marked ) {
			return;
		}
		$table = self::table( $kind );
		$flag  = self::flag( $kind );
		$date  = self::date_column( $kind );
		$row   = self::row( $table, $row_id );
		if ( ! $row ) {
			return;
		}
		$parts = explode( ',', $marked );
		$set   = array();
		if ( in_array( $flag, $parts, true ) ) {
			$set[ $flag ] = 0;
		}
		// The date is cleared only if it is still the one the match wrote: a date typed since stays.
		if ( in_array( 'date', $parts, true ) && $marked_date === $row[ $date ] ) {
			$set[ $date ] = null;
		}
		if ( $set ) {
			self::update( $table, $row_id, $set );
			if ( 'payout' === $kind && isset( $set['reconciled'] ) ) {
				LSFH_Payout_Status::sync_donations( $row['disbursement_id'], false );
			}
		}
	}

	/**
	 * The database table of a kind of Hub item.
	 *
	 * @param string $kind payout, donation or expense.
	 * @return string
	 */
	private static function table( $kind ) {
		global $wpdb;
		return $wpdb->prefix . array(
			'payout'   => 'lsfh_actblue_disbursements',
			'donation' => 'lsfh_donations',
			'expense'  => 'lsfh_expenditures',
		)[ $kind ];
	}

	/**
	 * The yes/no column a match turns on: Reconciled for a payout, Balanced for the others.
	 *
	 * @param string $kind payout, donation or expense.
	 * @return string
	 */
	private static function flag( $kind ) {
		return 'payout' === $kind ? 'reconciled' : 'balanced';
	}

	/**
	 * The date column the bank can fill.
	 *
	 * @param string $kind payout, donation or expense.
	 * @return string
	 */
	private static function date_column( $kind ) {
		return array(
			'payout'   => 'date_received',
			'donation' => 'date_deposited',
			'expense'  => 'date_posted',
		)[ $kind ];
	}

	/**
	 * Is a stored date empty?
	 *
	 * @param string|null $value Stored value.
	 * @return bool
	 */
	private static function date_is_blank( $value ) {
		return null === $value || '' === $value || '0000-00-00' === $value;
	}

	/**
	 * A payment dated in the future cannot have a Posted date yet, the same rule the expense form follows.
	 *
	 * @param string $kind payout, donation or expense.
	 * @param array  $row  The stored row.
	 * @return bool
	 */
	private static function may_post( $kind, array $row ) {
		return 'expense' !== $kind || empty( $row['expense_date'] ) || $row['expense_date'] <= current_time( 'Y-m-d' );
	}

	/**
	 * One stored row.
	 *
	 * @param string $table  Full table name.
	 * @param int    $row_id Row id.
	 * @return array|null
	 */
	private static function row( $table, $row_id ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", $row_id ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
	}

	/**
	 * Change columns of one stored row.
	 *
	 * @param string $table  Full table name.
	 * @param int    $row_id Row id.
	 * @param array  $set    Column => value; null clears a column.
	 */
	private static function update( $table, $row_id, array $set ) {
		global $wpdb;
		$set['updated_at'] = current_time( 'mysql' );
		$clear             = array_keys( array_filter( $set, 'is_null' ) );
		$assign            = array_diff_key( $set, array_flip( $clear ) );
		if ( $assign ) {
			$wpdb->update( $table, $assign, array( 'id' => $row_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		}
		foreach ( $clear as $column ) {
			$wpdb->query( $wpdb->prepare( "UPDATE {$table} SET {$column} = NULL WHERE id = %d", $row_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		}
	}
}
