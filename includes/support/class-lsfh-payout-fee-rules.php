<?php
/**
 * The rules for whether a payout's processing fees are logged correctly, and for finding older fee expenses.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Pure rules (no database, no WordPress) for the fee expense of a payout.
 *
 * A payout carries processing fees (the total of its donations' fees, less any fee credited back on a refund). The
 * campaign logs them as one fee expense per payout. These rules say what state that is in and which older fee
 * expenses, entered before they were linked to payouts, belong to which payout.
 */
class LSFH_Payout_Fee_Rules {

	/**
	 * What state a payout's fee expense is in.
	 *
	 * States: nothing (no fees and nothing logged, so nothing to show), none (fees but no fee expense), ok, short
	 * (one fee expense for less than the fees), over (one for more than the fees, or one when there are no fees)
	 * and many (more than one fee expense: a person decides which to keep).
	 *
	 * @param int   $expected_cents The payout's fees in whole cents.
	 * @param int[] $logged_cents   The amounts of the fee expenses linked to it, in whole cents.
	 * @return array{state: string, diff: int} The state, and the fees minus what is logged, in cents.
	 */
	public static function state( $expected_cents, array $logged_cents ) {
		$logged = array_sum( $logged_cents );
		$count  = count( $logged_cents );
		if ( 0 === $count ) {
			return array(
				'state' => $expected_cents > 0 ? 'none' : 'nothing',
				'diff'  => $expected_cents,
			);
		}
		$diff = $expected_cents - $logged;
		if ( $count > 1 ) {
			$state = 'many';
		} elseif ( 0 === $diff ) {
			$state = 'ok';
		} else {
			$state = $diff > 0 ? 'short' : 'over';
		}
		return array(
			'state' => $state,
			'diff'  => $diff,
		);
	}

	/**
	 * Pair older fee expenses with the payouts they are for.
	 *
	 * A pair counts only when it is certain: the fee expense and the payout have exactly the same amount and
	 * dates within a few days, and each is the other's only candidate.
	 *
	 * @param array[] $expenses Fee expenses not linked to a payout: id, cents, day.
	 * @param array[] $payouts  Payouts with fees and no fee expense yet: id, cents, day.
	 * @param int     $days     How far apart the dates may be.
	 * @return array<string, string> Expense id => payout id.
	 */
	public static function pair_legacy( array $expenses, array $payouts, $days = 3 ) {
		$by_expense = array();
		$by_payout  = array();
		foreach ( $expenses as $expense ) {
			foreach ( $payouts as $payout ) {
				if ( $expense['cents'] === $payout['cents'] && abs( $expense['day'] - $payout['day'] ) <= $days ) {
					$by_expense[ $expense['id'] ][] = $payout['id'];
					$by_payout[ $payout['id'] ][]   = $expense['id'];
				}
			}
		}
		$pairs = array();
		foreach ( $by_expense as $expense_id => $payout_ids ) {
			if ( 1 === count( $payout_ids ) && 1 === count( $by_payout[ $payout_ids[0] ] ) ) {
				$pairs[ (string) $expense_id ] = (string) $payout_ids[0];
			}
		}
		return $pairs;
	}
}
