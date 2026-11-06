<?php
/**
 * Turns the bank lines the matcher could not place into a short list of things for a person to do.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Plain "to do" items for the bank lines a match run left over.
 *
 * The matcher says why each leftover line has no partner. A person needs to know what to do about it, and
 * several lines often share one answer: two deposits of the same amount with one record in the Hub means
 * "match one, add the other". This groups the lines that belong together and, where there are several
 * equally good pairings, suggests one (never confirmed without a click).
 *
 * Kinds: add (nothing in the Hub fits: add it), pick (as many records as lines, same amount: pair them),
 * more_in_bank (more bank lines than records: pair some, add the rest), more_in_hub (more records than
 * lines: pair what is there, the rest have not cleared), close (a record is nearly right, off by a small
 * amount), date (the amount matches but the dates are far apart), sum (several records add up to the line).
 */
class LSFH_Bank_Todos {

	/**
	 * Build the to-do list.
	 *
	 * @param array[] $needs_you The matcher's leftover bank lines: bank id, reason, candidates, difference.
	 * @param array   $bank      Bank lines by id (date and cents).
	 * @param array   $hub       Hub records by id (date and cents).
	 * @return array[] Each: kind, bank (ids), hub (ids), pairs (suggested [bank, hub] pairs), add (bank ids to add to the Hub),
	 *                 and cents, plus difference for close.
	 */
	public static function build( array $needs_you, array $bank, array $hub ) {
		$todos     = array();
		$ambiguous = array();
		foreach ( $needs_you as $row ) {
			switch ( $row['reason'] ) {
				case 'ambiguous':
					$ambiguous[ $row['bank'] ] = $row['candidates'];
					break;
				case 'no_candidate':
					$todos[] = self::item( 'add', array( $row['bank'] ), array(), $bank[ $row['bank'] ]['cents'], array( 'add' => array( $row['bank'] ) ) );
					break;
				case 'near_amount':
					$todos[] = self::item( 'close', array( $row['bank'] ), $row['candidates'], $bank[ $row['bank'] ]['cents'], array( 'difference' => $row['difference'] ) );
					break;
				case 'amount_match_outside_window':
					$todos[] = self::item( 'date', array( $row['bank'] ), $row['candidates'], $bank[ $row['bank'] ]['cents'] );
					break;
				default:
					$todos[] = self::item( 'sum', array( $row['bank'] ), $row['candidates'] ?? array(), $bank[ $row['bank'] ]['cents'] );
			}
		}
		foreach ( self::components( $ambiguous ) as $component ) {
			$todos[] = self::ambiguous_item( $component, $bank, $hub );
		}
		usort( $todos, static fn( $a, $b ) => strcmp( $bank[ $a['bank'][0] ]['date'] . $a['bank'][0], $bank[ $b['bank'][0] ]['date'] . $b['bank'][0] ) );
		return $todos;
	}

	/**
	 * One to-do item.
	 *
	 * @param string   $kind  Kind of item.
	 * @param string[] $bank  Bank line ids.
	 * @param string[] $hub   Hub record ids.
	 * @param int      $cents The bank line's amount.
	 * @param array    $extra Other fields (add, pairs, difference).
	 * @return array
	 */
	private static function item( $kind, array $bank, array $hub, $cents, array $extra = array() ) {
		return array_merge(
			array(
				'kind'  => $kind,
				'bank'  => array_values( $bank ),
				'hub'   => array_values( $hub ),
				'cents' => $cents,
				'pairs' => array(),
				'add'   => array(),
			),
			$extra
		);
	}

	/**
	 * Groups of bank lines and records that all fit each other: a bank line with the records it could be, joined
	 * to the other lines those records could be.
	 *
	 * @param array $candidates Bank line id => candidate record ids.
	 * @return array[] Each: bank (ids) and hub (ids).
	 */
	private static function components( array $candidates ) {
		$joined = array();
		foreach ( $candidates as $bank_id => $records ) {
			foreach ( $records as $record_id ) {
				$root            = self::root( $joined, 'b' . $bank_id );
				$other           = self::root( $joined, 'h' . $record_id );
				$joined[ $root ] = $other;
			}
		}
		$out = array();
		foreach ( $candidates as $bank_id => $records ) {
			$root                              = self::root( $joined, 'b' . $bank_id );
			$out[ $root ]['bank'][]            = $bank_id;
			$out[ $root ]['hub']               = array_values( array_unique( array_merge( $out[ $root ]['hub'] ?? array(), $records ) ) );
			$out[ $root ]['cands'][ $bank_id ] = $records;
		}
		return array_values( $out );
	}

	/**
	 * The representative of the group a node belongs to (the groups are joined as lines and records are linked).
	 *
	 * @param array  $joined Node => the node it is joined to; a node that is its own parent is a representative.
	 * @param string $node   A bank line (b12) or record (hd7) node.
	 * @return string
	 */
	private static function root( array &$joined, $node ) {
		if ( ! isset( $joined[ $node ] ) ) {
			$joined[ $node ] = $node;
		}
		while ( $joined[ $node ] !== $node ) {
			$node = $joined[ $node ];
		}
		return $node;
	}

	/**
	 * A to-do item for lines that all fit the same records, with a suggested pairing.
	 *
	 * @param array $component bank, hub and cands (bank id => candidate ids).
	 * @param array $bank      Bank lines by id.
	 * @param array $hub       Hub records by id.
	 * @return array
	 */
	private static function ambiguous_item( array $component, array $bank, array $hub ) {
		$pairs    = self::pairing( $component['cands'], $bank, $hub );
		$paired   = array_column( $pairs, 0 );
		$add      = array_values( array_diff( $component['bank'], $paired ) );
		$bank_ids = $component['bank'];
		usort( $bank_ids, static fn( $a, $b ) => strcmp( $bank[ $a ]['date'] . $a, $bank[ $b ]['date'] . $b ) );
		$hub_n = count( $component['hub'] );
		$kind  = 'pick';
		if ( count( $bank_ids ) > $hub_n ) {
			$kind = 'more_in_bank';
		} elseif ( count( $bank_ids ) < $hub_n ) {
			$kind = 'more_in_hub';
		}
		return self::item(
			$kind,
			$bank_ids,
			$component['hub'],
			$bank[ $bank_ids[0] ]['cents'],
			array(
				'pairs' => $pairs,
				'add'   => $add,
			)
		);
	}

	/**
	 * A one-to-one pairing of as many bank lines as possible with their candidate records, closest dates first.
	 * The most constrained lines are placed first and an earlier choice is changed when a later line needs it.
	 *
	 * @param array $cands Bank id => candidate record ids.
	 * @param array $bank  Bank lines by id.
	 * @param array $hub   Hub records by id.
	 * @return array[] Pairs of [ bank id, record id ], in bank date order.
	 */
	private static function pairing( array $cands, array $bank, array $hub ) {
		$order = array_keys( $cands );
		usort( $order, static fn( $a, $b ) => array( count( $cands[ $a ] ), $bank[ $a ]['date'], $a ) <=> array( count( $cands[ $b ] ), $bank[ $b ]['date'], $b ) );
		foreach ( $cands as $bank_id => &$records ) {
			usort( $records, static fn( $a, $b ) => array( abs( self::day( $hub[ $a ] ) - self::day( $bank[ $bank_id ] ) ), $a ) <=> array( abs( self::day( $hub[ $b ] ) - self::day( $bank[ $bank_id ] ) ), $b ) );
		}
		unset( $records );
		$owner = array();
		$place = static function ( $bank_id, array &$seen ) use ( &$place, &$owner, $cands ) {
			foreach ( $cands[ $bank_id ] as $record_id ) {
				if ( isset( $seen[ $record_id ] ) ) {
					continue;
				}
				$seen[ $record_id ] = true;
				if ( ! isset( $owner[ $record_id ] ) || $place( $owner[ $record_id ], $seen ) ) {
					$owner[ $record_id ] = $bank_id;
					return true;
				}
			}
			return false;
		};
		foreach ( $order as $bank_id ) {
			$seen = array();
			$place( $bank_id, $seen );
		}
		$pairs = array();
		foreach ( $owner as $record_id => $bank_id ) {
			$pairs[] = array( $bank_id, $record_id );
		}
		usort( $pairs, static fn( $a, $b ) => strcmp( $bank[ $a[0] ]['date'] . $a[0], $bank[ $b[0] ]['date'] . $b[0] ) );
		return $pairs;
	}

	/**
	 * Whole days since 1970-01-01 of a line's or record's date.
	 *
	 * @param array $item Bank line or Hub record.
	 * @return int
	 */
	private static function day( array $item ) {
		return LSFH_Bank_Match_Rules::day_number( $item['date'] );
	}
}
