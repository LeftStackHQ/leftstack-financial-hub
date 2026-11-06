<?php
/**
 * The rules for whether a bank line could be the same event as a Hub record.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * The rules for whether a bank line could be the same event as a Hub record.
 *
 * Pure and shared by the matcher (which pairs lines up) and the report (which explains what is left),
 * so both ask the same question in the same way.
 */
class LSFH_Bank_Match_Rules {

	/**
	 * The bank's saved format, with defaults filled in.
	 *
	 * @var array
	 */
	private $format;

	/**
	 * Keep the format.
	 *
	 * @param array $format The bank's saved format.
	 */
	public function __construct( array $format ) {
		$this->format = $format;
	}

	/**
	 * One setting from the format.
	 *
	 * @param string $name Setting name.
	 * @return mixed
	 */
	public function setting( $name ) {
		return $this->format[ $name ];
	}

	/**
	 * Whole days since 1970-01-01 for a Y-m-d date.
	 *
	 * @param string $date Y-m-d.
	 * @return int
	 */
	public static function day_number( $date ) {
		return (int) floor( strtotime( $date . ' 00:00:00 UTC' ) / 86400 );
	}

	/**
	 * Business days (Monday to Friday) after one day number, up to and including the other.
	 *
	 * Banks do not post deposits on weekends, so a payout made on a Friday and one made on a Monday
	 * both reach the bank the same number of business days later. Zero when the second day is not after the first.
	 *
	 * @param int $from Day number of the earlier day.
	 * @param int $to   Day number of the later day.
	 * @return int
	 */
	public static function business_days_between( $from, $to ) {
		$count = 0;
		for ( $day = $from + 1; $day <= $to; $day++ ) {
			// Day 0 (1970-01-01) was a Thursday; 6 is Saturday and 0 is Sunday in this numbering.
			$weekday = ( $day + 4 ) % 7;
			if ( 0 !== $weekday && 6 !== $weekday ) {
				++$count;
			}
		}
		return $count;
	}

	/**
	 * Could this bank line be the same event as this Hub record, leaving the amount aside?
	 *
	 * Same direction; a payout's deposit must name its processor; the dates must fit (see in_window()); a check number or
	 * reference that both sides give must agree.
	 *
	 * @param array $line          Bank line.
	 * @param array $record        Hub record.
	 * @param bool  $ignore_window True to skip the date test.
	 * @return bool
	 */
	public function could_pair( array $line, array $record, $ignore_window = false ) {
		if ( ( $line['cents'] < 0 ) !== ( $record['cents'] < 0 ) ) {
			return false;
		}
		if ( '' !== $line['check_number'] && '' !== $record['check_number'] && $line['check_number'] !== $record['check_number'] ) {
			return false;
		}
		if ( '' !== $line['reference'] && '' !== $record['reference'] && $line['reference'] !== $record['reference'] ) {
			return false;
		}
		if ( 'payout' === $record['kind'] && ! $this->names_processor( $line['description'], $record['processor'] ) ) {
			return false;
		}
		return $ignore_window || $this->in_window( $line, $record );
	}

	/**
	 * Is the bank line's date close enough to the record's date?
	 *
	 * A record whose date was typed from the bank statement (a payout's Date Received, an expense's Posted
	 * date, a donation's Date Deposited) is trusted: it pairs only with a bank line on that date, give or
	 * take a day (a few days for an expense, which a bank often posts after the purchase). Otherwise a payout
	 * must arrive within a few business days; an expense, or a donation with no deposit date yet (a check can
	 * be deposited weeks after it is received), may clear any time after its date.
	 *
	 * @param array $line   Bank line.
	 * @param array $record Hub record.
	 * @return bool
	 */
	private function in_window( array $line, array $record ) {
		$gap = $line['day'] - $record['day'];
		if ( ! empty( $record['typed'] ) ) {
			return abs( $gap ) <= ( 'expense' === $record['kind'] ? $this->format['typed_expense_days'] : $this->format['typed_days'] );
		}
		if ( 'expense' === $record['kind'] || ! empty( $record['late_ok'] ) ) {
			return $gap >= -$this->format['expense_days_before'];
		}
		return $gap >= -$this->format['deposit_days_before'] && self::business_days_between( $record['day'], $line['day'] ) <= $this->format['deposit_business_days'];
	}

	/**
	 * Does the bank description name the payout's processor? True when the format has no names for it.
	 *
	 * @param string $description Bank description.
	 * @param string $processor   Processor key from the Hub record.
	 * @return bool
	 */
	private function names_processor( $description, $processor ) {
		$names = $this->format['depositors'][ $processor ] ?? array();
		if ( '' === $processor || empty( $names ) ) {
			return true;
		}
		foreach ( $names as $name ) {
			if ( false !== stripos( $description, $name ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Do both sides give the key this pass is about, and does it agree?
	 *
	 * @param array       $line   Bank line.
	 * @param array       $record Hub record.
	 * @param string|null $key    'same_reference', 'same_check_number', or null.
	 * @return bool
	 */
	public function has_key( array $line, array $record, $key ) {
		if ( 'same_reference' === $key ) {
			return '' !== $line['reference'] && $line['reference'] === $record['reference'];
		}
		if ( 'same_check_number' === $key ) {
			return '' !== $line['check_number'] && $line['check_number'] === $record['check_number'];
		}
		return true;
	}
}
