<?php
/**
 * Matches bank statement lines to payouts and expenses.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Matches bank statement lines to payouts and expenses.
 *
 * A pure class: it reads the lines and records it is given and returns an answer. It never reads
 * the database, never calls WordPress and never confirms anything; a person does that.
 *
 * Input, all amounts in whole cents (money in is positive, money out is negative):
 * - bank line:  id, date (Y-m-d), cents, description, check_number, reference (empty string when the bank gives none)
 * - hub record: id, kind ('payout' = money in that reaches the bank a few business days after its date:
 *               a processor payout or a check, cash or wire donation; 'expense' = money out), date (Y-m-d),
 *               cents, check_number, reference, processor (lowercase key or ''), and optionally typed (true when the
 *               date was typed from the bank statement, so it is trusted) and late_ok (true for a donation with no
 *               deposit date: it may be deposited any time after its date)
 * - format:     what this bank's saved layout says (see DEFAULTS); depositors maps a processor key to the
 *               text its deposits carry in the bank description.
 *
 * It works in passes, strictest first, and a record used by one pass is not offered to the next:
 * 1. reference and amount; 2. check number and amount; 3. Hub expenses that share a check number and
 * add up to one bank line (a group); 4. exact amount on the date typed from the statement (records whose
 * date was typed are paired first); 5. exact amount inside the date window; 6. small groups that add up
 * (a group). A one-to-one match is 'clear' and is only reported when it is the single possible partner on
 * both sides. Anything involving a sum is a 'group' and is always reviewed by a person.
 *
 * Output: matches, needs_you (bank lines left over, with why) and hub_open (Hub records left over, with why).
 */
class LSFH_Bank_Matcher {

	/**
	 * Settings used when the bank's saved format does not give one.
	 *
	 * @var array
	 */
	const DEFAULTS = array(
		'depositors'            => array(),
		'deposit_days_before'   => 1,
		'deposit_business_days' => 5,
		'expense_days_before'   => 3,
		'typed_days'            => 1,
		'typed_expense_days'    => 3,
		'max_group_size'        => 4,
		'max_candidates'        => 24,
		'near_cents'            => 1000,
		'file_from'             => '',
		'list_from'             => '',
		'file_to'               => '',
	);

	/**
	 * The bank's saved format.
	 *
	 * @var array
	 */
	private $format;

	/**
	 * The rules for whether a bank line could be the same event as a Hub record.
	 *
	 * @var LSFH_Bank_Match_Rules
	 */
	private $rules;

	/**
	 * Bank lines by id, in date then id order.
	 *
	 * @var array
	 */
	private $bank = array();

	/**
	 * Hub records by id, in date then id order.
	 *
	 * @var array
	 */
	private $hub = array();

	/**
	 * Ids already matched.
	 *
	 * @var array
	 */
	private $used = array(
		'bank' => array(),
		'hub'  => array(),
	);

	/**
	 * Matches found so far.
	 *
	 * @var array
	 */
	private $matches = array();

	/**
	 * Bank lines that had more than one group of records adding up to them, with those records.
	 *
	 * @var array
	 */
	private $ambiguous_sums = array();

	/**
	 * Match bank lines to Hub records.
	 *
	 * @param array $bank_lines  Bank lines.
	 * @param array $hub_records Hub records not yet matched. Kind 'payout' is money in (a processor payout, or a check, cash or wire donation) and 'expense' is money out.
	 * @param array $format      The bank's saved format.
	 * @return array matches, needs_you and hub_open.
	 */
	public static function match( array $bank_lines, array $hub_records, array $format = array() ) {
		$matcher = new self( $bank_lines, $hub_records, $format );
		return $matcher->run();
	}

	/**
	 * Index and order the input.
	 *
	 * @param array $bank_lines  Bank lines.
	 * @param array $hub_records Hub records.
	 * @param array $format      The bank's saved format.
	 */
	private function __construct( array $bank_lines, array $hub_records, array $format ) {
		$this->format = array_merge( self::DEFAULTS, $format );
		$this->rules  = new LSFH_Bank_Match_Rules( $this->format );
		foreach ( $bank_lines as $line ) {
			$line['id']                = (string) $line['id'];
			$line['cents']             = (int) $line['cents'];
			$line['day']               = LSFH_Bank_Match_Rules::day_number( $line['date'] );
			$line['check_number']      = (string) ( $line['check_number'] ?? '' );
			$line['reference']         = (string) ( $line['reference'] ?? '' );
			$line['description']       = (string) ( $line['description'] ?? '' );
			$this->bank[ $line['id'] ] = $line;
		}
		foreach ( $hub_records as $record ) {
			$record['id']               = (string) $record['id'];
			$record['cents']            = (int) $record['cents'];
			$record['day']              = LSFH_Bank_Match_Rules::day_number( $record['date'] );
			$record['check_number']     = (string) ( $record['check_number'] ?? '' );
			$record['reference']        = (string) ( $record['reference'] ?? '' );
			$record['processor']        = (string) ( $record['processor'] ?? '' );
			$this->hub[ $record['id'] ] = $record;
		}
		uasort( $this->bank, array( __CLASS__, 'compare_by_day' ) );
		uasort( $this->hub, array( __CLASS__, 'compare_by_day' ) );
	}

	/**
	 * Run every pass, then describe what is left.
	 *
	 * @return array
	 */
	private function run() {
		$this->pair_pass( 'reference_and_amount', 'same_reference' );
		$this->pair_pass( 'check_number_and_amount', 'same_check_number' );
		$this->check_group_pass();
		$this->pair_pass( 'typed_date_and_amount', null, true );
		$this->pair_pass( null, null );
		$this->sum_pass();
		$report = new LSFH_Bank_Match_Report( $this->rules, $this->open( 'bank' ), $this->open( 'hub' ), $this->ambiguous_sums );
		return array_merge( array( 'matches' => $this->matches ), $report->build() );
	}


	/**
	 * Order by date, then id, so the answer never depends on the order lines arrive in.
	 *
	 * @param array $a One line or record.
	 * @param array $b Another.
	 * @return int
	 */
	private static function compare_by_day( $a, $b ) {
		if ( $a['day'] !== $b['day'] ) {
			return $a['day'] <=> $b['day'];
		}
		return strcmp( $a['id'], $b['id'] );
	}



	/**
	 * Ids of bank lines or Hub records not matched yet, in order.
	 *
	 * @param string $side 'bank' or 'hub'.
	 * @return array Id => line or record.
	 */
	private function open( $side ) {
		$all = 'bank' === $side ? $this->bank : $this->hub;
		return array_diff_key( $all, $this->used[ $side ] );
	}

	/**
	 * Record a match and take its lines and records out of play.
	 *
	 * @param string $tier   'clear' or 'group'.
	 * @param array  $bank   Bank line ids.
	 * @param array  $hub    Hub record ids.
	 * @param string $reason Why they were matched.
	 * @return void
	 */
	private function accept( $tier, array $bank, array $hub, $reason ) {
		$cents = 0;
		foreach ( $bank as $id ) {
			$cents                    += $this->bank[ $id ]['cents'];
			$this->used['bank'][ $id ] = true;
		}
		foreach ( $hub as $id ) {
			$this->used['hub'][ $id ] = true;
		}
		$this->matches[] = array(
			'tier'       => $tier,
			'bank'       => array_values( $bank ),
			'hub'        => array_values( $hub ),
			'cents'      => $cents,
			'difference' => 0,
			'reason'     => $reason,
		);
	}

	/**
	 * One-to-one pass on the exact amount. A pair counts only when each is the other's single candidate.
	 *
	 * @param string|null $reason Reason code, or null to choose by kind (payout or expense).
	 * @param string|null $key    'same_reference', 'same_check_number', or null for no extra key.
	 * @param bool        $typed_only True to look only at Hub records whose date was typed from the statement, so a bank line is
	 *                    paired with the record dated on it before untyped records are considered.
	 * @return void
	 */
	private function pair_pass( $reason, $key, $typed_only = false ) {
		$by_bank = array();
		$by_hub  = array();
		foreach ( $this->open( 'bank' ) as $line ) {
			foreach ( $this->open( 'hub' ) as $record ) {
				if ( $typed_only && empty( $record['typed'] ) ) {
					continue;
				}
				if ( $line['cents'] !== $record['cents'] || ! $this->rules->could_pair( $line, $record ) || ! $this->rules->has_key( $line, $record, $key ) ) {
					continue;
				}
				$by_bank[ $line['id'] ][]  = $record['id'];
				$by_hub[ $record['id'] ][] = $line['id'];
			}
		}
		foreach ( $by_bank as $bank_id => $hub_ids ) {
			if ( 1 !== count( $hub_ids ) || 1 !== count( $by_hub[ $hub_ids[0] ] ) ) {
				continue;
			}
			$code = $reason;
			if ( null === $code ) {
				$code = 'payout' === $this->hub[ $hub_ids[0] ]['kind'] ? 'processor_amount_date' : 'only_candidate_amount';
			}
			$this->accept( 'clear', array( $bank_id ), $hub_ids, $code );
		}
	}


	/**
	 * Hub expenses that share a check number and add up to one bank line.
	 *
	 * @return void
	 */
	private function check_group_pass() {
		$groups = array();
		foreach ( $this->open( 'hub' ) as $record ) {
			if ( 'expense' === $record['kind'] && '' !== $record['check_number'] ) {
				$groups[ $record['check_number'] ][] = $record['id'];
			}
		}
		$wanted = array();
		foreach ( $groups as $number => $ids ) {
			if ( count( $ids ) < 2 ) {
				continue;
			}
			$total = array_sum( array_map( array( $this, 'record_cents' ), $ids ) );
			foreach ( $this->open( 'bank' ) as $line ) {
				if ( $line['cents'] === $total && $this->could_pair_all( $line, $ids ) ) {
					$wanted[ $number ][] = $line['id'];
				}
			}
		}
		$claims = array();
		foreach ( $wanted as $number => $line_ids ) {
			foreach ( $line_ids as $line_id ) {
				$claims[ $line_id ][] = $number;
			}
		}
		foreach ( $wanted as $number => $line_ids ) {
			if ( 1 === count( $line_ids ) && 1 === count( $claims[ $line_ids[0] ] ) ) {
				$this->accept( 'group', $line_ids, $groups[ $number ], 'shared_check_number_sum' );
			}
		}
	}

	/**
	 * Cents of one Hub record.
	 *
	 * @param string $id Hub record id.
	 * @return int
	 */
	private function record_cents( $id ) {
		return $this->hub[ $id ]['cents'];
	}

	/**
	 * Could this bank line pair with every one of these Hub records?
	 *
	 * @param array $line Bank line.
	 * @param array $ids  Hub record ids.
	 * @return bool
	 */
	private function could_pair_all( array $line, array $ids ) {
		foreach ( $ids as $id ) {
			if ( ! $this->rules->could_pair( $line, $this->hub[ $id ] ) ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Small groups that add up: several Hub records for one bank line, then several bank lines for one record.
	 * A group is only reported when it is the one group that fits.
	 *
	 * @return void
	 */
	private function sum_pass() {
		$has_partner = $this->items_with_same_amount_partner();
		foreach ( $this->open( 'bank' ) as $line ) {
			if ( isset( $this->used['bank'][ $line['id'] ] ) || isset( $has_partner['bank'][ $line['id'] ] ) ) {
				continue;
			}
			$pool = array();
			foreach ( $this->open( 'hub' ) as $record ) {
				if ( ! isset( $has_partner['hub'][ $record['id'] ] ) && $this->rules->could_pair( $line, $record ) ) {
					$pool[ $record['id'] ] = $record;
				}
			}
			$found = $this->groups_for( $line, $pool );
			if ( 1 === count( $found ) ) {
				$this->accept( 'group', array( $line['id'] ), $found[0], 'sum_search_hub' );
			} elseif ( count( $found ) > 1 ) {
				$this->ambiguous_sums[ $line['id'] ] = array_values( array_unique( array_merge( ...$found ) ) );
			}
		}
		foreach ( $this->open( 'hub' ) as $record ) {
			if ( isset( $this->used['hub'][ $record['id'] ] ) || isset( $has_partner['hub'][ $record['id'] ] ) ) {
				continue;
			}
			$pool = array();
			foreach ( $this->open( 'bank' ) as $line ) {
				if ( ! isset( $has_partner['bank'][ $line['id'] ] ) && $this->rules->could_pair( $line, $record ) ) {
					$pool[ $line['id'] ] = $line;
				}
			}
			$found = $this->groups_for( $record, $pool );
			if ( 1 === count( $found ) ) {
				$this->accept( 'group', $found[0], array( $record['id'] ), 'sum_search_bank' );
			}
		}
	}

	/**
	 * Bank lines and Hub records that still have a counterpart of exactly their own amount.
	 *
	 * Those are the ones a person should pair one to one (picking among them when there are several), so
	 * they are kept out of sums: several unrelated items that happen to add up to an amount must not be
	 * allowed to take an item away from a real exact partner.
	 *
	 * @return array bank and hub, each an id => true map.
	 */
	private function items_with_same_amount_partner() {
		$out = array(
			'bank' => array(),
			'hub'  => array(),
		);
		foreach ( $this->open( 'bank' ) as $line ) {
			foreach ( $this->open( 'hub' ) as $record ) {
				if ( $line['cents'] === $record['cents'] && $this->rules->could_pair( $line, $record ) ) {
					$out['bank'][ $line['id'] ]  = true;
					$out['hub'][ $record['id'] ] = true;
				}
			}
		}
		return $out;
	}

	/**
	 * Groups of two or more from a pool whose amounts add up to the target's amount.
	 * The pool is cut to the nearest candidates by date so the search stays small.
	 *
	 * @param array $target A bank line or Hub record.
	 * @param array $pool   Candidates of the other kind, by id.
	 * @return array[] Groups of ids (at most two are looked for).
	 */
	private function groups_for( array $target, array $pool ) {
		if ( count( $pool ) < 2 ) {
			return array();
		}
		$ids = array_keys( $pool );
		usort(
			$ids,
			function ( $a, $b ) use ( $pool, $target ) {
				$gap = abs( $pool[ $a ]['day'] - $target['day'] ) <=> abs( $pool[ $b ]['day'] - $target['day'] );
				return 0 !== $gap ? $gap : strcmp( $a, $b );
			}
		);
		$values = array();
		foreach ( array_slice( $ids, 0, (int) $this->format['max_candidates'] ) as $id ) {
			$values[ $id ] = abs( $pool[ $id ]['cents'] );
		}
		return LSFH_Bank_Subset_Search::find( $values, abs( $target['cents'] ), (int) $this->format['max_group_size'], 2 );
	}
}
