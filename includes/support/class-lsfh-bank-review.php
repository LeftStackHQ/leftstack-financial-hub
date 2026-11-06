<?php
/**
 * The review of an account: what the matcher suggests for the bank lines and Hub records not yet tied together.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Builds the review the tie-out screen shows: suggested matches, what needs a person, and what is still open.
 */
class LSFH_Bank_Review {

	/**
	 * How many days before the first open bank line the Hub side starts when no start date is given.
	 */
	const DAYS_BEFORE_FIRST_LINE = 7;

	/**
	 * How many more days back a check or an expense is looked at as a possible partner for a bank line. It is
	 * never listed as "not at the bank" that far back, because the bank file does not cover those weeks.
	 */
	const EXTRA_DAYS_FOR_CHECKS = 83;

	/**
	 * Run the matcher over an account's open bank lines and the Hub records from the same period.
	 *
	 * Only records from the start date on are looked at, so old records are never reported as open.
	 *
	 * @param array       $account Account from LSFH_Bank_Lines (id and format).
	 * @param string|null $from    Y-m-d start of the period; by default a week before the first line of the bank file.
	 * @return array from, matches, needs_you, todos (what to do about each leftover line), hub_open, skipped, and bank and hub (the details of every id used).
	 */
	public static function build( array $account, $from = null ) {
		// The bank file's period is every line stored for the account, matched or not: a Hub record is judged
		// against the whole file, and records dated before it are never reported as open.
		$range = LSFH_Bank_Lines::date_range( $account['id'] );
		if ( ! $range ) {
			return array(
				'from'      => $from,
				'matches'   => array(),
				'needs_you' => array(),
				'todos'     => array(),
				'hub_open'  => array(),
				'skipped'   => array(),
				'bank'      => array(),
				'hub'       => array(),
			);
		}
		$from  = $from ?? gmdate( 'Y-m-d', strtotime( $range['first'] . ' UTC' ) - self::DAYS_BEFORE_FIRST_LINE * DAY_IN_SECONDS );
		$lines = LSFH_Bank_Lines::open_lines( $account['id'], $from );
		$early = gmdate( 'Y-m-d', strtotime( $from . ' UTC' ) - self::EXTRA_DAYS_FOR_CHECKS * DAY_IN_SECONDS );
		$hub   = LSFH_Bank_Hub_Records::open_since( $from, $early );

		$bank = array();
		foreach ( $lines as $line ) {
			$line['id']          = 'b' . $line['id'];
			$bank[ $line['id'] ] = $line;
		}
		$format = array(
			'depositors' => $account['format']['depositors'] ?? array(),
			'file_from'  => max( $range['first'], $from ),
			'list_from'  => $from,
			'file_to'    => $range['last'],
		);
		$result = LSFH_Bank_Matcher::match( array_values( $bank ), $hub['records'], $format );

		return array(
			'from'      => $from,
			'matches'   => $result['matches'],
			'needs_you' => $result['needs_you'],
			'todos'     => LSFH_Bank_Todos::build( $result['needs_you'], $bank, array_column( $hub['records'], null, 'id' ) ),
			'hub_open'  => $result['hub_open'],
			'skipped'   => $hub['skipped'],
			'bank'      => array_map( array( __CLASS__, 'show_line' ), $bank ),
			'hub'       => array_map( array( __CLASS__, 'show_record' ), array_column( $hub['records'], null, 'id' ) ),
		);
	}

	/**
	 * A page of an account's confirmed matches with the details of every bank line and Hub record in them.
	 *
	 * @param int    $account_id Bank account id.
	 * @param int    $page       Page number, from 1.
	 * @param int    $per_page   Matches per page.
	 * @param string $direction  Only money in (in) or money out (out); empty for both.
	 * @return array data (matches), total, pages, and bank and hub (details by id).
	 */
	public static function confirmed( $account_id, $page, $per_page, $direction = '' ) {
		$matches = LSFH_Bank_Matches::page( $account_id, $page, $per_page, $direction );
		$bank    = array();
		$hub_ids = array();
		foreach ( $matches['data'] as $match ) {
			foreach ( $match['bank'] as $id ) {
				$bank[ $id ] = (int) substr( $id, 1 );
			}
			$hub_ids = array_merge( $hub_ids, $match['hub'] );
		}
		$lines = array();
		foreach ( LSFH_Bank_Lines::lines_by_id( $account_id, array_values( $bank ) ) as $line ) {
			$line['id']           = 'b' . $line['id'];
			$lines[ $line['id'] ] = self::show_line( $line );
		}
		return $matches + array(
			'pages' => max( 1, (int) ceil( $matches['total'] / $per_page ) ),
			'bank'  => $lines,
			'hub'   => array_map( array( __CLASS__, 'show_record' ), LSFH_Bank_Hub_Records::by_ids( $hub_ids ) ),
		);
	}

	/**
	 * A bank line as the screen shows it.
	 *
	 * @param array $line Line with cents.
	 * @return array
	 */
	private static function show_line( array $line ) {
		return array(
			'id'           => $line['id'],
			'date'         => $line['date'],
			'amount'       => $line['cents'] / 100,
			'description'  => $line['description'],
			'check_number' => $line['check_number'],
		);
	}

	/**
	 * A Hub record as the screen shows it.
	 *
	 * @param array $record Record with cents.
	 * @return array
	 */
	private static function show_record( array $record ) {
		return array(
			'id'           => $record['id'],
			'date'         => $record['date'],
			'amount'       => $record['cents'] / 100,
			'label'        => $record['label'],
			'check_number' => $record['check_number'],
			'typed'        => $record['typed'],
			'type'         => LSFH_Bank_Hub_Records::split_id( $record['id'] )[0],
		);
	}
}
