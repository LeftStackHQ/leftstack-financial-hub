<?php
/**
 * Finds small groups of amounts that add up to a target.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Finds small groups of amounts that add up to a target.
 *
 * Used by the bank matcher when one bank line is covered by several Hub records, or the reverse.
 * Amounts are whole cents (positive integers) so the sums are exact. The search is bounded on
 * purpose: the caller hands in a short list and a largest group size, never a whole ledger.
 */
class LSFH_Bank_Subset_Search {

	/**
	 * Find groups of two or more amounts that add up to the target.
	 *
	 * @param array $values   Map of key => positive integer cents. Keys identify the amounts in the result.
	 * @param int   $target   Positive integer cents the group must add up to.
	 * @param int   $max_size Largest group size to try (at least 2).
	 * @param int   $limit    Stop after this many groups have been found.
	 * @return array[] List of groups; each group is a sorted list of keys. Empty when none add up.
	 */
	public static function find( array $values, $target, $max_size, $limit = 2 ) {
		arsort( $values, SORT_NUMERIC );
		$keys    = array_keys( $values );
		$amounts = array_values( $values );
		$count   = count( $keys );

		// Largest amount still reachable from each position, so a branch that cannot reach the target is dropped.
		$suffix = array_fill( 0, $count + 1, 0 );
		for ( $i = $count - 1; $i >= 0; $i-- ) {
			$suffix[ $i ] = $suffix[ $i + 1 ] + $amounts[ $i ];
		}

		$found = array();
		self::walk( $keys, $amounts, $suffix, 0, (int) $target, (int) $max_size, array(), (int) $limit, $found );
		return $found;
	}

	/**
	 * Depth-first walk over the amounts, largest first.
	 *
	 * @param array $keys    Keys, in the same order as $amounts.
	 * @param array $amounts Amounts, largest first.
	 * @param array $suffix  Sum of the amounts from each position to the end.
	 * @param int   $from    Position to continue from.
	 * @param int   $left    Cents still to add up.
	 * @param int   $room    How many more amounts may be added.
	 * @param array $chosen  Keys chosen so far.
	 * @param int   $limit   Stop after this many groups.
	 * @param array $found   Groups found so far (by reference).
	 * @return void
	 */
	private static function walk( array $keys, array $amounts, array $suffix, $from, $left, $room, array $chosen, $limit, array &$found ) {
		if ( 0 === $left ) {
			if ( count( $chosen ) >= 2 ) {
				sort( $chosen, SORT_STRING );
				$found[] = $chosen;
			}
			return;
		}
		if ( $room <= 0 || $left < 0 || $suffix[ $from ] < $left ) {
			return;
		}
		$count = count( $keys );
		for ( $i = $from; $i < $count; $i++ ) {
			if ( count( $found ) >= $limit ) {
				return;
			}
			if ( $amounts[ $i ] > $left ) {
				continue;
			}
			$next   = $chosen;
			$next[] = $keys[ $i ];
			self::walk( $keys, $amounts, $suffix, $i + 1, $left - $amounts[ $i ], $room - 1, $next, $limit, $found );
		}
	}
}
