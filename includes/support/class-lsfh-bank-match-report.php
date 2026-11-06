<?php
/**
 * Explains what a bank match run left over.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Explains what a bank match run left over.
 *
 * After the matcher has paired what it can, this says why each leftover bank line and Hub record
 * could not be matched, so a person knows what to look at.
 */
class LSFH_Bank_Match_Report {

	/**
	 * The shared pairing rules.
	 *
	 * @var LSFH_Bank_Match_Rules
	 */
	private $rules;

	/**
	 * Bank lines not matched, by id.
	 *
	 * @var array
	 */
	private $bank;

	/**
	 * Hub records not matched, by id.
	 *
	 * @var array
	 */
	private $hub;

	/**
	 * Bank lines that more than one group of records added up to, with those records.
	 *
	 * @var array
	 */
	private $ambiguous_sums;

	/**
	 * Keep what the matcher left over.
	 *
	 * @param LSFH_Bank_Match_Rules $rules          The pairing rules.
	 * @param array                 $bank           Unmatched bank lines by id.
	 * @param array                 $hub            Unmatched Hub records by id.
	 * @param array                 $ambiguous_sums Bank line id => record ids that added up in more than one way.
	 */
	public function __construct( LSFH_Bank_Match_Rules $rules, array $bank, array $hub, array $ambiguous_sums ) {
		$this->rules          = $rules;
		$this->bank           = $bank;
		$this->hub            = $hub;
		$this->ambiguous_sums = $ambiguous_sums;
	}

	/**
	 * Both halves of the report.
	 *
	 * @return array needs_you and hub_open.
	 */
	public function build() {
		$needs_you = $this->needs_you();
		return array(
			'needs_you' => $needs_you,
			'hub_open'  => $this->hub_open( $needs_you ),
		);
	}

	/**
	 * Why each bank line left over could not be matched.
	 *
	 * @return array
	 */
	private function needs_you() {
		$out = array();
		foreach ( $this->bank as $line ) {
			$out[] = $this->explain_line( $line );
		}
		return $out;
	}

	/**
	 * Describe one bank line that was not matched.
	 *
	 * @param array $line Bank line.
	 * @return array bank, reason, and candidates and difference when they apply.
	 */
	private function explain_line( array $line ) {
		if ( isset( $this->ambiguous_sums[ $line['id'] ] ) ) {
			return array(
				'bank'       => $line['id'],
				'reason'     => 'ambiguous_sum',
				'candidates' => $this->ambiguous_sums[ $line['id'] ],
			);
		}
		$same = array();
		$near = array();
		$late = array();
		foreach ( $this->hub as $record ) {
			if ( ! $this->rules->could_pair( $line, $record, true ) ) {
				continue;
			}
			$in_window = $this->rules->could_pair( $line, $record );
			if ( $line['cents'] === $record['cents'] ) {
				if ( $in_window ) {
					$same[] = $record['id'];
				} else {
					$late[] = $record['id'];
				}
			} elseif ( $in_window && abs( $line['cents'] - $record['cents'] ) <= (int) $this->rules->setting( 'near_cents' ) ) {
				$near[ $record['id'] ] = abs( $line['cents'] - $record['cents'] );
			}
		}
		if ( $same ) {
			return array(
				'bank'       => $line['id'],
				'reason'     => 'ambiguous',
				'candidates' => $same,
			);
		}
		if ( $near ) {
			asort( $near );
			$best = (string) array_key_first( $near );
			return array(
				'bank'       => $line['id'],
				'reason'     => 'near_amount',
				'candidates' => array( $best ),
				'difference' => $line['cents'] - $this->hub[ $best ]['cents'],
			);
		}
		if ( $late ) {
			return array(
				'bank'       => $line['id'],
				'reason'     => 'amount_match_outside_window',
				'candidates' => $late,
			);
		}
		return array(
			'bank'   => $line['id'],
			'reason' => 'no_candidate',
		);
	}

	/**
	 * Say what became of each Hub record that was not matched. Records outside the bank file's dates are left out.
	 *
	 * @param array $needs_you What explain_line() returned for each leftover bank line.
	 * @return array List of id and reason.
	 */
	private function hub_open( array $needs_you ) {
		$in_review = array();
		foreach ( $needs_you as $row ) {
			foreach ( $row['candidates'] ?? array() as $id ) {
				$in_review[ (string) $id ] = true;
			}
		}
		$out = array();
		foreach ( $this->hub as $record ) {
			$reason = $this->open_reason( $record, isset( $in_review[ $record['id'] ] ) );
			if ( null === $reason ) {
				continue;
			}
			$row = array(
				'id'     => $record['id'],
				'reason' => $reason,
			);
			if ( 'typed_date_mismatch' === $reason ) {
				$row['bank'] = $this->same_amount_line( $record );
			}
			$out[] = $row;
		}
		return $out;
	}

	/**
	 * The reason a Hub record is still open, or null when the bank file's dates mean it cannot be judged.
	 *
	 * @param array $record    Hub record.
	 * @param bool  $in_review True when a leftover bank line lists it as a candidate.
	 * @return string|null
	 */
	private function open_reason( array $record, $in_review ) {
		// A date typed from the statement that no bank line of this amount fits is worth a look wherever it falls.
		if ( ! empty( $record['typed'] ) && null === $this->same_amount_line( $record, true ) && null !== $this->same_amount_line( $record ) ) {
			return 'typed_date_mismatch';
		}
		$from      = '' === $this->rules->setting( 'file_from' ) ? null : LSFH_Bank_Match_Rules::day_number( $this->rules->setting( 'file_from' ) );
		$to        = '' === $this->rules->setting( 'file_to' ) ? null : LSFH_Bank_Match_Rules::day_number( $this->rules->setting( 'file_to' ) );
		$list_from = '' === $this->rules->setting( 'list_from' ) ? null : LSFH_Bank_Match_Rules::day_number( $this->rules->setting( 'list_from' ) );
		if ( null !== $to && $record['day'] > $to ) {
			return null;
		}
		// A record that is older than the period being tied out is only a possible partner, never "not at the bank".
		if ( null !== $list_from && $record['day'] < $list_from && ! $in_review ) {
			return null;
		}
		if ( 'payout' === $record['kind'] && null !== $from && $record['day'] < $from ) {
			return null;
		}
		if ( $in_review ) {
			return 'in_review';
		}
		if ( 'payout' === $record['kind'] ) {
			return 'not_in_file';
		}
		return '' !== $record['check_number'] ? 'outstanding_check' : 'no_bank_line';
	}

	/**
	 * The unmatched bank line of this record's exact amount whose date is nearest, if any.
	 *
	 * @param array $record    Hub record.
	 * @param bool  $in_window True to count only lines whose date fits the record, false to ignore the date.
	 * @return string|null Bank line id.
	 */
	private function same_amount_line( array $record, $in_window = false ) {
		$best = null;
		$gap  = PHP_INT_MAX;
		foreach ( $this->bank as $line ) {
			if ( $line['cents'] === $record['cents'] && $this->rules->could_pair( $line, $record, ! $in_window ) && abs( $line['day'] - $record['day'] ) < $gap ) {
				$best = $line['id'];
				$gap  = abs( $line['day'] - $record['day'] );
			}
		}
		return $best;
	}
}
