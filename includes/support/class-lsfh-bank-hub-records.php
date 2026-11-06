<?php
/**
 * The Hub's side of a bank tie-out: payouts, donations without a payout, and expenses, as matcher input.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Reads the Hub records that a bank line can be tied to.
 *
 * Three kinds, whatever their payment type: every payout is one record (ActBlue, Stripe and the others),
 * every donation that is not part of a payout is its own record (checks, cash, wires), and every
 * expense is its own record. Ids carry the kind: p12 (payout), d12 (donation), e12 (expense).
 * Amounts are signed from the bank's point of view: money in is positive, money out is negative.
 */
class LSFH_Bank_Hub_Records {

	/**
	 * Records not yet tied to a bank line.
	 *
	 * A payout reaches the bank within days, so only payouts dated on or after $from are looked at. A check or an
	 * expense can clear weeks later, so those are looked at from $early_from, which lets a bank line find a record
	 * that was written well before the bank file begins.
	 *
	 * @param string $from       Y-m-d, where payouts start.
	 * @param string $early_from Y-m-d, where donations and expenses start (on or before $from).
	 * @return array{records: array[], skipped: array[]} Records in matcher format; and records left out because they have no date.
	 */
	public static function open_since( $from, $early_from ) {
		return self::collect(
			self::payout_rows( array( 'from' => $from ) ),
			self::donation_rows( array( 'from' => $early_from ) ),
			self::expense_rows( array( 'from' => $early_from ) )
		);
	}

	/**
	 * Records by their ids, tied or not, for checking a match before it is saved.
	 *
	 * @param string[] $ids Ids such as p12, d7, e30.
	 * @return array[] Records in matcher format, keyed by id; an id with no record is missing from the result.
	 */
	public static function by_ids( array $ids ) {
		$wanted = array(
			'p' => array(),
			'd' => array(),
			'e' => array(),
		);
		foreach ( $ids as $id ) {
			$wanted[ $id[0] ][] = (int) substr( $id, 1 );
		}
		$found = self::collect(
			$wanted['p'] ? self::payout_rows( array( 'ids' => $wanted['p'] ) ) : array(),
			$wanted['d'] ? self::donation_rows( array( 'ids' => $wanted['d'] ) ) : array(),
			$wanted['e'] ? self::expense_rows( array( 'ids' => $wanted['e'] ) ) : array()
		);
		return array_column( $found['records'], null, 'id' );
	}

	/**
	 * Split a record id into its kind and row number.
	 *
	 * @param string $id Such as p12.
	 * @return array{0: string, 1: int} The link kind (payout, donation or expense) and the row id.
	 */
	public static function split_id( $id ) {
		$kinds = array(
			'p' => 'payout',
			'd' => 'donation',
			'e' => 'expense',
		);
		return array( $kinds[ $id[0] ], (int) substr( $id, 1 ) );
	}

	/**
	 * Does this look like a record id (p, d or e followed by digits)?
	 *
	 * @param mixed $id Value to test.
	 * @return bool
	 */
	public static function is_id( $id ) {
		return is_string( $id ) && 1 === preg_match( '/^[pde][1-9]\d{0,17}$/', $id );
	}

	/**
	 * Payouts: one record each, dated on the payout date, with the processor taken from its donations.
	 *
	 * @param array $scope Either from (Y-m-d: payouts not yet tied, on or after it) or ids (those payouts, tied or not).
	 * @return array[] Database rows.
	 */
	private static function payout_rows( array $scope ) {
		global $wpdb;
		list( $where, $values ) = self::scope_sql( $scope, 'payout', 'a.disbursement_date', 'a.id' );
		$sql                    = "SELECT a.id, COALESCE(NULLIF(a.date_received, '0000-00-00'), a.disbursement_date) AS record_date, (NULLIF(a.date_received, '0000-00-00') IS NOT NULL) AS typed, a.net_total AS amount, a.bank_reference AS reference, a.disbursement_id AS label,
				(SELECT MIN(d.source) FROM {$wpdb->prefix}lsfh_donations d WHERE d.disbursement_id = a.disbursement_id) AS processor
			FROM {$wpdb->prefix}lsfh_actblue_disbursements a WHERE $where";
		return (array) $wpdb->get_results( $wpdb->prepare( $sql, ...$values ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
	}

	/**
	 * Donations that are not part of a payout (checks, cash, wires): one record each. Dated on the
	 * Date Deposited when it is filled in, otherwise on the date of the contribution.
	 *
	 * @param array $scope Either from or ids, as for payout_rows().
	 * @return array[] Database rows.
	 */
	private static function donation_rows( array $scope ) {
		global $wpdb;
		list( $where, $values ) = self::scope_sql( $scope, 'donation', 'COALESCE(d.date_deposited, d.contribution_date)', 'd.id' );
		$sql                    = "SELECT d.id, COALESCE(NULLIF(d.date_deposited, '0000-00-00'), d.contribution_date) AS record_date, (NULLIF(d.date_deposited, '0000-00-00') IS NOT NULL) AS typed, d.gross_amount AS amount, d.check_number, TRIM(CONCAT_WS(' ', d.first_name, d.last_name)) AS label
			FROM {$wpdb->prefix}lsfh_donations d
			WHERE (d.disbursement_id IS NULL OR d.disbursement_id = '') AND d.gross_amount <> 0 AND $where";
		return (array) $wpdb->get_results( $wpdb->prepare( $sql, ...$values ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
	}

	/**
	 * Expenses that move money out of the bank. Processor fees (payment method "fee") are taken from a
	 * payout before it reaches the bank, so they never appear as a bank line and are left out.
	 *
	 * @param array $scope Either from or ids, as for payout_rows().
	 * @return array[] Database rows.
	 */
	private static function expense_rows( array $scope ) {
		global $wpdb;
		list( $where, $values ) = self::scope_sql( $scope, 'expense', 'e.expense_date', 'e.id' );
		$sql                    = "SELECT e.id, COALESCE(NULLIF(e.date_posted, '0000-00-00'), e.expense_date) AS record_date, (NULLIF(e.date_posted, '0000-00-00') IS NOT NULL) AS typed, -e.amount AS amount, e.check_number, e.payee AS label
			FROM {$wpdb->prefix}lsfh_expenditures e
			WHERE e.payment_method <> 'fee' AND $where";
		return (array) $wpdb->get_results( $wpdb->prepare( $sql, ...$values ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
	}

	/**
	 * The WHERE part and its values for a scope. The column names come from the code above, never from a request.
	 *
	 * @param array  $scope    Either from (open records on or after a date) or ids.
	 * @param string $kind     Link kind: payout, donation or expense.
	 * @param string $date_col Date column or expression.
	 * @param string $id_col   Id column.
	 * @return array{0: string, 1: array} SQL condition and its placeholder values.
	 */
	private static function scope_sql( array $scope, $kind, $date_col, $id_col ) {
		global $wpdb;
		if ( isset( $scope['ids'] ) ) {
			$marks = implode( ',', array_fill( 0, count( $scope['ids'] ), '%d' ) );
			return array( "$id_col IN ($marks)", $scope['ids'] );
		}
		$tied = "NOT EXISTS (SELECT 1 FROM {$wpdb->prefix}lsfh_bank_match_links k WHERE k.kind = '$kind' AND k.ref_id = $id_col)";
		return array( "$date_col >= %s AND $tied", array( $scope['from'] ) );
	}

	/**
	 * Turn database rows of the three kinds into matcher records.
	 *
	 * @param array[] $payouts   Payout rows.
	 * @param array[] $donations Donation rows.
	 * @param array[] $expenses  Expense rows.
	 * @return array{records: array[], skipped: array[]}
	 */
	private static function collect( array $payouts, array $donations, array $expenses ) {
		$records = array();
		$skipped = array();
		$groups  = array(
			array( 'p', 'payout', $payouts ),
			array( 'd', 'payout', $donations ),
			array( 'e', 'expense', $expenses ),
		);
		foreach ( $groups as list( $prefix, $kind, $rows ) ) {
			foreach ( $rows as $row ) {
				$id = $prefix . $row['id'];
				if ( empty( $row['record_date'] ) ) {
					$skipped[] = array(
						'id'     => $id,
						'reason' => 'no_date',
					);
					continue;
				}
				$typed     = (bool) $row['typed'];
				$records[] = array(
					'id'           => $id,
					'kind'         => $kind,
					'date'         => $row['record_date'],
					'cents'        => (int) round( (float) $row['amount'] * 100 ),
					'check_number' => (string) ( $row['check_number'] ?? '' ),
					'reference'    => (string) ( $row['reference'] ?? '' ),
					'processor'    => strtolower( (string) ( $row['processor'] ?? '' ) ),
					'label'        => (string) $row['label'],
					// The date was typed from the statement, so the matcher trusts it.
					'typed'        => $typed,
					// A check, cash or wire donation with no deposit date yet may be deposited any time after it is received.
					'late_ok'      => 'd' === $prefix && ! $typed,
				);
			}
		}
		return array(
			'records' => $records,
			'skipped' => $skipped,
		);
	}
}
