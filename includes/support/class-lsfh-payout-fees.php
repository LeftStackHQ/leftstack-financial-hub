<?php
/**
 * Keeps each payout's processing-fee expense in step with the fees the payout carries.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * The fee expense of a payout: find it, link it, create it, and keep its amount right.
 *
 * A payout carries processing fees (the total of its donations' fees, less any fee credited back on a refund). The
 * campaign logs them as one expense (payment method "fee") per payout. Each fee expense is linked to its payout
 * through its disbursement_id, so the payee can stay the processor's name ("ActBlue") and the Payees view totals
 * all of a processor's fees together. The rules for what state a fee is in live in LSFH_Payout_Fee_Rules.
 */
class LSFH_Payout_Fees {

	/**
	 * Which payout, if any, has this disbursement id.
	 *
	 * @param string $payee A payee name, which may be a payout's disbursement id.
	 * @return string|null The disbursement id, or null when no payout has that id.
	 */
	public static function payout_for_payee( $payee ) {
		global $wpdb;
		if ( '' === (string) $payee ) {
			return null;
		}
		$found = $wpdb->get_var( $wpdb->prepare( "SELECT disbursement_id FROM {$wpdb->prefix}lsfh_actblue_disbursements WHERE disbursement_id = %s", $payee ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		return null === $found ? null : (string) $found;
	}

	/**
	 * The payouts that these donations are in, to refresh their fee expenses after the donations change.
	 *
	 * @param int[] $donation_ids Donation ids.
	 * @return string[] Disbursement ids.
	 */
	public static function payouts_of_donations( array $donation_ids ) {
		global $wpdb;
		$donation_ids = array_values( array_filter( array_map( 'absint', $donation_ids ) ) );
		if ( ! $donation_ids ) {
			return array();
		}
		$marks = implode( ',', array_fill( 0, count( $donation_ids ), '%d' ) );
		return array_map( 'strval', (array) $wpdb->get_col( $wpdb->prepare( "SELECT DISTINCT disbursement_id FROM {$wpdb->prefix}lsfh_donations WHERE disbursement_id IS NOT NULL AND disbursement_id <> '' AND id IN ($marks)", ...$donation_ids ) ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,PluginCheck.Security.DirectDB.UnescapedDBParameter
	}

	/**
	 * Each payout's fee state, for a list of payouts.
	 *
	 * @param string[] $disbursement_ids Disbursement ids.
	 * @return array<string, array> Disbursement id => expected (dollars), logged (dollars), expense_ids, state, diff (dollars).
	 */
	public static function overview( array $disbursement_ids ) {
		$out    = array();
		$linked = self::linked_for( $disbursement_ids );
		foreach ( self::payouts( $disbursement_ids ) as $payout ) {
			$rows   = $linked[ $payout['disbursement_id'] ] ?? array();
			$result = LSFH_Payout_Fee_Rules::state( $payout['expected_cents'], array_column( $rows, 'cents' ) );

			$out[ $payout['disbursement_id'] ] = array(
				'expected'    => $payout['expected_cents'] / 100,
				'logged'      => array_sum( array_column( $rows, 'cents' ) ) / 100,
				'expense_ids' => array_column( $rows, 'id' ),
				'state'       => $result['state'],
				'diff'        => $result['diff'] / 100,
			);
		}
		return $out;
	}

	/**
	 * What fixing the fees would do, without doing it.
	 *
	 * For each payout whose fee expense is missing or wrong: link an older fee expense that is certainly its own,
	 * create the missing one, or change the amount of its only fee expense. A fee expense whose amount is right but whose
	 * payee is still the payout's id (the old fee button named it that way) is renamed to the processor's name, and one
	 * that is right in both but not Balanced while its payout is Reconciled is marked Balanced. A payout
	 * with more than one fee expense, or with an older expense that might be its own but is not certain, is listed to be
	 * looked at.
	 *
	 * @return array[] Each: disbursement_id, payout_id, action (link, create, update, rename, balance, many or review), expense_id,
	 *                 cents (what the fee expense should be), from_cents (what it is now), payee_to (rename only).
	 */
	public static function plan() {
		$payouts = self::payouts( null );
		$linked  = self::linked_for( array_column( $payouts, 'disbursement_id' ) );
		$needing = array();
		$states  = array();
		foreach ( $payouts as $payout ) {
			$rows                                 = $linked[ $payout['disbursement_id'] ] ?? array();
			$states[ $payout['disbursement_id'] ] = LSFH_Payout_Fee_Rules::state( $payout['expected_cents'], array_column( $rows, 'cents' ) )['state'];
			if ( 'none' === $states[ $payout['disbursement_id'] ] && $payout['disbursement_date'] ) {
				$needing[] = array(
					'id'    => $payout['disbursement_id'],
					'cents' => $payout['expected_cents'],
					'day'   => (int) floor( strtotime( $payout['disbursement_date'] . ' UTC' ) / DAY_IN_SECONDS ),
				);
			}
		}
		$older  = self::unlinked_fee_expenses();
		$pairs  = LSFH_Payout_Fee_Rules::pair_legacy( $older, $needing );
		$payees = LSFH_Payout_Processor::names();
		$plan   = array();
		foreach ( $payouts as $payout ) {
			$id     = $payout['disbursement_id'];
			$rows   = $linked[ $id ] ?? array();
			$base   = array(
				'disbursement_id' => $id,
				'payout_id'       => $payout['id'],
				'created_at'      => $payout['created_at'],
				'reconciled'      => $payout['reconciled'],
				'cents'           => $payout['expected_cents'],
				'from_cents'      => (int) array_sum( array_column( $rows, 'cents' ) ),
			);
			$action = self::action_for( $states[ $id ], $payout, $rows, $pairs, $older, $payees );
			if ( null !== $action ) {
				$plan[] = array_merge( $base, $action['fields'], array( 'action' => $action['name'] ) )
					+ array( 'expense_id' => 0 );
			}
		}
		return $plan;
	}

	/**
	 * How many payouts are planned for each action.
	 *
	 * @param string[] $actions Planned actions (link, create, update, rename, balance, many, review); any number of each.
	 * @return int[] The count of each action, 0 when none.
	 */
	public static function count_actions( array $actions ) {
		$counted = array_count_values( $actions );
		return array(
			'link'    => $counted['link'] ?? 0,
			'create'  => $counted['create'] ?? 0,
			'update'  => $counted['update'] ?? 0,
			'rename'  => $counted['rename'] ?? 0,
			'balance' => $counted['balance'] ?? 0,
			'many'    => $counted['many'] ?? 0,
			'review'  => $counted['review'] ?? 0,
		);
	}

	/**
	 * Do what a plan says, except the items that only need a look.
	 *
	 * @param array[] $plan What plan() returned (or part of it).
	 * @return array{linked: int, created: int, updated: int, renamed: int, balanced: int} How many of each were done.
	 */
	public static function apply( array $plan ) {
		$done = array(
			'linked'   => 0,
			'created'  => 0,
			'updated'  => 0,
			'renamed'  => 0,
			'balanced' => 0,
		);
		foreach ( $plan as $item ) {
			if ( 'link' === $item['action'] ) {
				$linked          = self::link( $item['expense_id'], $item['disbursement_id'] );
				$done['linked'] += $linked;
				// An expense linked to a payout that is already reconciled takes that over, so it is not left half done.
				if ( $linked && $item['reconciled'] ) {
					self::follow_reconciled( $item['disbursement_id'], true );
				}
			} elseif ( 'create' === $item['action'] ) {
				$done['created'] += self::create( $item['disbursement_id'], $item['cents'] );
			} elseif ( 'update' === $item['action'] ) {
				$done['updated'] += self::set_amount( $item['expense_id'], $item['cents'] );
			} elseif ( 'rename' === $item['action'] ) {
				$done['renamed'] += self::rename( $item['expense_id'], $item['payee_to'] );
			} elseif ( 'balance' === $item['action'] ) {
				$done['balanced'] += self::follow_reconciled( $item['disbursement_id'], true );
			}
		}
		return $done;
	}

	/**
	 * Keep the fee expense of these payouts in step after their donations changed: change the amount of the only one,
	 * and create the missing one for a payout that first appeared after automatic fees began. A payout from before
	 * that is left to Fix fees, because an older fee expense for it may exist that is not certainly its own. An
	 * older fee expense is never linked here, a payee is never renamed here (that is Fix fees, after a look), and a payout is never given a second fee expense.
	 *
	 * @param string[] $disbursement_ids The payouts whose donations changed.
	 */
	public static function refresh( array $disbursement_ids ) {
		$ids = array_values( array_filter( array_unique( array_map( 'strval', $disbursement_ids ) ) ) );
		if ( ! $ids ) {
			return;
		}
		$since = (string) get_option( 'lsfh_payout_fees_since', '' );
		$plan  = array_filter(
			self::plan(),
			static fn( $item ) => in_array( $item['disbursement_id'], $ids, true )
				&& ( 'update' === $item['action'] || ( 'create' === $item['action'] && '' !== $since && $item['created_at'] >= $since ) )
		);
		self::apply( $plan );
	}

	/**
	 * Keep one fee expense of a payout and remove its others.
	 *
	 * @param string $disbursement_id The payout.
	 * @param int    $keep_id         The fee expense to keep.
	 * @return int How many were removed.
	 */
	public static function keep_one( $disbursement_id, $keep_id ) {
		global $wpdb;
		return (int) $wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->prefix}lsfh_expenditures WHERE payment_method = 'fee' AND disbursement_id = %s AND id <> %d", $disbursement_id, $keep_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
	}

	/**
	 * Make a payout's fee expense follow the payout's Reconciled mark: balanced when it is, and a Posted date from the
	 * payout's Date Received when that is known and the fee expense has none.
	 *
	 * @param string $disbursement_id The payout.
	 * @param bool   $reconciled      Whether the payout is reconciled.
	 * @return int How many fee expenses were written (the payout has one, and writing it also stamps its update time).
	 */
	public static function follow_reconciled( $disbursement_id, $reconciled ) {
		global $wpdb;
		if ( '' === (string) $disbursement_id ) {
			return 0;
		}
		$table   = $wpdb->prefix . 'lsfh_expenditures';
		$changed = (int) $wpdb->query( $wpdb->prepare( "UPDATE $table SET balanced = %d, updated_at = %s WHERE payment_method = 'fee' AND disbursement_id = %s", (int) (bool) $reconciled, current_time( 'mysql' ), $disbursement_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		if ( $reconciled ) {
			$today = current_time( 'Y-m-d' );
			$wpdb->query( $wpdb->prepare( "UPDATE $table e INNER JOIN {$wpdb->prefix}lsfh_actblue_disbursements d ON d.disbursement_id = e.disbursement_id SET e.date_posted = d.date_received, e.updated_at = %s WHERE e.payment_method = 'fee' AND e.disbursement_id = %s AND (e.date_posted IS NULL OR e.date_posted = '0000-00-00') AND d.date_received IS NOT NULL AND d.date_received <= %s AND e.expense_date <= %s", current_time( 'mysql' ), $disbursement_id, $today, $today ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		}
		return $changed;
	}

	/**
	 * Decide what to do about one payout.
	 *
	 * @param string  $state  Its fee state.
	 * @param array   $payout Its row from payouts().
	 * @param array[] $rows   Its linked fee expenses (id, cents, payee).
	 * @param array   $pairs  Certain legacy pairs: fee expense id => disbursement id.
	 * @param array[] $older  Fee expenses not linked to a payout.
	 * @param array   $payees What LSFH_Payout_Processor::names() returned.
	 * @return array|null name and fields of the action, or null when nothing is to be done.
	 */
	private static function action_for( $state, array $payout, array $rows, array $pairs, array $older, array $payees ) {
		$id = $payout['disbursement_id'];
		if ( 'many' === $state ) {
			return array(
				'name'   => 'many',
				'fields' => array(),
			);
		}
		if ( 'short' === $state || 'over' === $state ) {
			// Only one expense is linked in these states. With no fees expected it is left for a person.
			return $payout['expected_cents'] > 0 && $rows
				? array(
					'name'   => 'update',
					'fields' => array( 'expense_id' => (int) $rows[0]['id'] ),
				)
				: null;
		}
		if ( 'ok' === $state && $rows ) {
			// The amount is right. What can be left is the old fee button's habit of naming the payee after the payout, or
			// a payout that was reconciled before its fee expense was linked and so never passed its mark on.
			if ( $id === $rows[0]['payee'] ) {
				return array(
					'name'   => 'rename',
					'fields' => array(
						'expense_id' => (int) $rows[0]['id'],
						'payee_to'   => LSFH_Payout_Processor::for_payout( $payout, $payees ),
					),
				);
			}
			return $payout['reconciled'] && ! $rows[0]['balanced']
				? array(
					'name'   => 'balance',
					'fields' => array( 'expense_id' => (int) $rows[0]['id'] ),
				)
				: null;
		}
		if ( 'none' !== $state ) {
			return null;
		}
		$paired = array_search( $id, $pairs, true );
		if ( false !== $paired ) {
			return array(
				'name'   => 'link',
				'fields' => array( 'expense_id' => (int) $paired ),
			);
		}
		// An older expense of the same amount near the payout's date that is not a certain pair: a person decides.
		foreach ( $older as $expense ) {
			if ( $expense['cents'] === $payout['expected_cents'] && $payout['disbursement_date'] && abs( $expense['day'] - (int) floor( strtotime( $payout['disbursement_date'] . ' UTC' ) / DAY_IN_SECONDS ) ) <= 3 ) {
				return array(
					'name'   => 'review',
					'fields' => array(),
				);
			}
		}
		return array(
			'name'   => 'create',
			'fields' => array(),
		);
	}

	/**
	 * The payouts, with the fees each carries.
	 *
	 * @param string[]|null $disbursement_ids Only these payouts, or null for all of them.
	 * @return array[] Each: id, disbursement_id, disbursement_date, date_received, reconciled, created_at, processor, source, expected_cents.
	 */
	private static function payouts( $disbursement_ids ) {
		global $wpdb;
		$sql    = "SELECT p.id, p.disbursement_id, p.disbursement_date, p.date_received, p.reconciled, p.created_at, p.processor,
				(SELECT MIN(d.source) FROM {$wpdb->prefix}lsfh_donations d WHERE d.disbursement_id = p.disbursement_id) AS source,
				ROUND(COALESCE((SELECT SUM(d.actblue_fee) FROM {$wpdb->prefix}lsfh_donations d WHERE d.disbursement_id = p.disbursement_id), 0) * 100) AS expected_cents
			FROM {$wpdb->prefix}lsfh_actblue_disbursements p";
		$values = array();
		if ( null !== $disbursement_ids ) {
			if ( ! $disbursement_ids ) {
				return array();
			}
			$sql   .= ' WHERE p.disbursement_id IN (' . implode( ',', array_fill( 0, count( $disbursement_ids ), '%s' ) ) . ')';
			$values = array_values( $disbursement_ids );
		}
		$rows = (array) $wpdb->get_results( $values ? $wpdb->prepare( $sql . ' ORDER BY p.disbursement_date, p.id', ...$values ) : $sql . ' ORDER BY p.disbursement_date, p.id', ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber,PluginCheck.Security.DirectDB.UnescapedDBParameter
		foreach ( $rows as &$row ) {
			$row['id']             = (int) $row['id'];
			$row['expected_cents'] = (int) $row['expected_cents'];
			$row['reconciled']     = (int) $row['reconciled'];
		}
		return $rows;
	}

	/**
	 * The fee expenses linked to these payouts.
	 *
	 * @param string[] $disbursement_ids The payouts.
	 * @return array<string, array[]> Disbursement id => its fee expenses (id, cents, payee, balanced), oldest first.
	 */
	private static function linked_for( array $disbursement_ids ) {
		global $wpdb;
		if ( ! $disbursement_ids ) {
			return array();
		}
		$marks = implode( ',', array_fill( 0, count( $disbursement_ids ), '%s' ) );
		$rows  = (array) $wpdb->get_results( $wpdb->prepare( "SELECT id, disbursement_id, payee, balanced, ROUND(amount * 100) AS cents FROM {$wpdb->prefix}lsfh_expenditures WHERE payment_method = 'fee' AND disbursement_id IN ($marks) ORDER BY id", ...array_values( $disbursement_ids ) ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$out   = array();
		foreach ( $rows as $row ) {
			$out[ $row['disbursement_id'] ][] = array(
				'id'       => (int) $row['id'],
				'cents'    => (int) $row['cents'],
				'payee'    => (string) $row['payee'],
				'balanced' => (int) $row['balanced'],
			);
		}
		return $out;
	}

	/**
	 * Fee expenses that are not linked to a payout (entered before the link existed).
	 *
	 * @return array[] Each: id, cents, day.
	 */
	private static function unlinked_fee_expenses() {
		global $wpdb;
		$rows = (array) $wpdb->get_results( "SELECT id, ROUND(amount * 100) AS cents, expense_date FROM {$wpdb->prefix}lsfh_expenditures WHERE payment_method = 'fee' AND (disbursement_id IS NULL OR disbursement_id = '') AND expense_date IS NOT NULL", ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$out  = array();
		foreach ( $rows as $row ) {
			$out[] = array(
				'id'    => (string) $row['id'],
				'cents' => (int) $row['cents'],
				'day'   => (int) floor( strtotime( $row['expense_date'] . ' UTC' ) / DAY_IN_SECONDS ),
			);
		}
		return $out;
	}

	/**
	 * Link an older fee expense to its payout.
	 *
	 * @param int    $expense_id      The fee expense.
	 * @param string $disbursement_id The payout.
	 * @return int 1 when it was linked.
	 */
	private static function link( $expense_id, $disbursement_id ) {
		global $wpdb;
		return (int) (bool) $wpdb->query( $wpdb->prepare( "UPDATE {$wpdb->prefix}lsfh_expenditures SET disbursement_id = %s, updated_at = %s WHERE id = %d AND payment_method = 'fee' AND (disbursement_id IS NULL OR disbursement_id = '')", $disbursement_id, current_time( 'mysql' ), $expense_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
	}

	/**
	 * Change the amount of a fee expense.
	 *
	 * @param int $expense_id The fee expense.
	 * @param int $cents      The new amount in cents.
	 * @return int 1 when it was changed.
	 */
	private static function set_amount( $expense_id, $cents ) {
		global $wpdb;
		return (int) (bool) $wpdb->update( $wpdb->prefix . 'lsfh_expenditures', array( 'amount' => $cents / 100 ), array( 'id' => $expense_id ), array( '%f' ), array( '%d' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
	}

	/**
	 * Give a fee expense the processor's name as payee. Only a payee that is still the payout's id is changed, so a name
	 * someone typed since the plan was made is never overwritten.
	 *
	 * @param int    $expense_id The fee expense.
	 * @param string $payee      The new payee.
	 * @return int 1 when it was renamed.
	 */
	private static function rename( $expense_id, $payee ) {
		global $wpdb;
		$table = $wpdb->prefix . 'lsfh_expenditures';
		return (int) (bool) $wpdb->query( $wpdb->prepare( "UPDATE $table SET payee = %s, updated_at = %s WHERE id = %d AND payment_method = 'fee' AND payee = disbursement_id", $payee, current_time( 'mysql' ), $expense_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
	}

	/**
	 * Create the fee expense of a payout.
	 *
	 * @param string $disbursement_id The payout.
	 * @param int    $cents           The fees in cents.
	 * @return int 1 when it was created.
	 */
	private static function create( $disbursement_id, $cents ) {
		global $wpdb;
		$payout = self::payouts( array( $disbursement_id ) )[0] ?? null;
		if ( ! $payout || $cents <= 0 ) {
			return 0;
		}
		$today  = current_time( 'Y-m-d' );
		$date   = $payout['disbursement_date'] ?: $today;
		$posted = ( $date <= $today && $payout['date_received'] && $payout['date_received'] <= $today ) ? $payout['date_received'] : null;
		$now    = current_time( 'mysql' );
		$added  = $wpdb->insert( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prefix . 'lsfh_expenditures',
			array(
				'expense_date'     => $date,
				'date_posted'      => $posted,
				'payee'            => LSFH_Payout_Processor::for_payout( $payout, LSFH_Payout_Processor::names() ),
				'description'      => 'Processing fees — Disbursement ' . $disbursement_id,
				'amount'           => $cents / 100,
				'payment_method'   => 'fee',
				'balanced'         => $payout['reconciled'],
				'paid_by'          => (string) get_option( 'lsfh_campaign_name', '' ),
				'filing_period_id' => LSFH_Periods::period_for_date( $date ),
				'disbursement_id'  => $disbursement_id,
				'created_at'       => $now,
				'updated_at'       => $now,
			)
		);
		return $added ? 1 : 0;
	}
}
