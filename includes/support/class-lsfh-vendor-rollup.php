<?php
/**
 * Spend against money raised, added up by vendor group (the rules only: no database).
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Takes what was raised (one row per month, page and reference code) and what was spent (one row per month and payee)
 * and adds both up for each vendor group: by month, and by send (reference code). Raised is the gross of the gifts,
 * refunds are shown apart, and the cost of a dollar raised is the spend over what was raised net of refunds.
 */
class LSFH_Vendor_Rollup {

	/**
	 * How many sends a group lists at most (newest first).
	 */
	const MAX_SENDS = 200;

	/**
	 * Add the rows up for each group.
	 *
	 * @param array[] $groups Groups from LSFH_Vendor_Groups (name, payees, pages).
	 * @param array[] $raised Rows: month (Y-m), page (as stored), ref, first_date, gifts, raised, refunds, fees.
	 * @param array[] $spend  Rows: month (Y-m), payee, spent.
	 * @return array{groups: array[], pages: array[], payees: array[]} The groups with their months, sends and totals,
	 *               and every page and payee seen (page: name, gifts, raised; payee: name, spent), largest first.
	 */
	public static function build( array $groups, array $raised, array $spend ) {
		$by_page  = array();
		$by_payee = array();
		foreach ( $groups as $i => $g ) {
			foreach ( $g['pages'] as $page ) {
				$by_page[ $page ] = $i;
			}
			foreach ( $g['payees'] as $payee ) {
				$by_payee[ strtolower( $payee ) ] = $i;
			}
		}

		$months   = array_fill( 0, count( $groups ), array() );
		$sends    = array_fill( 0, count( $groups ), array() );
		$all_page = array();
		$all_pay  = array();

		foreach ( $raised as $r ) {
			$page = LSFH_Fundraising_Pages::normalize( $r['page'] );
			if ( '' !== $page ) {
				$all_page[ $page ]            = $all_page[ $page ] ?? array(
					'name'   => $page,
					'gifts'  => 0,
					'raised' => 0.0,
				);
				$all_page[ $page ]['gifts']  += (int) $r['gifts'];
				$all_page[ $page ]['raised'] += (float) $r['raised'];
			}
			if ( ! isset( $by_page[ $page ] ) ) {
				continue;
			}
			$i = $by_page[ $page ];
			self::add( $months[ $i ], $r['month'], 'month', $r );
			self::add( $sends[ $i ], (string) $r['ref'], 'reference_code', $r );
		}

		foreach ( $spend as $s ) {
			$key                       = strtolower( trim( $s['payee'] ) );
			$all_pay[ $key ]           = $all_pay[ $key ] ?? array(
				'name'  => $s['payee'],
				'spent' => 0.0,
			);
			$all_pay[ $key ]['spent'] += (float) $s['spent'];
			if ( ! isset( $by_payee[ $key ] ) ) {
				continue;
			}
			$i = $by_payee[ $key ];
			self::blank( $months[ $i ], $s['month'], 'month' );
			$months[ $i ][ $s['month'] ]['spend'] += (float) $s['spent'];
		}

		$out = array();
		foreach ( $groups as $i => $g ) {
			krsort( $months[ $i ] );
			$rows = array_map( array( __CLASS__, 'finish' ), array_values( $months[ $i ] ) );
			$send = array_values( $sends[ $i ] );
			usort(
				$send,
				static fn( $a, $b ) => strcmp( (string) $b['first_date'], (string) $a['first_date'] ) ?: $b['raised'] <=> $a['raised']
			);
			$total = array(
				'spend'   => 0.0,
				'raised'  => 0.0,
				'refunds' => 0.0,
				'fees'    => 0.0,
				'gifts'   => 0,
			);
			foreach ( $rows as $row ) {
				foreach ( array_keys( $total ) as $k ) {
					$total[ $k ] += $row[ $k ];
				}
			}
			$out[] = array(
				'name'       => $g['name'],
				'payees'     => $g['payees'],
				'pages'      => $g['pages'],
				'months'     => $rows,
				'sends'      => array_map( array( __CLASS__, 'finish_send' ), array_slice( $send, 0, self::MAX_SENDS ) ),
				'sends_more' => max( 0, count( $send ) - self::MAX_SENDS ),
				'totals'     => self::finish( $total ),
			);
		}

		usort( $all_page, static fn( $a, $b ) => $b['raised'] <=> $a['raised'] );
		usort( $all_pay, static fn( $a, $b ) => $b['spent'] <=> $a['spent'] );
		return array(
			'groups' => $out,
			'pages'  => array_map(
				static fn( $p ) => array(
					'name'   => $p['name'],
					'gifts'  => $p['gifts'],
					'raised' => round( $p['raised'], 2 ),
				),
				$all_page
			),
			'payees' => array_map(
				static fn( $p ) => array(
					'name'  => $p['name'],
					'spent' => round( $p['spent'], 2 ),
				),
				$all_pay
			),
		);
	}

	/**
	 * Add one raised row into a keyed list of totals.
	 *
	 * @param array  $totals_by The totals by key, changed.
	 * @param string $key   The row's key (a month or a reference code).
	 * @param string $label The name of the key field in the row ('month' or 'reference_code').
	 * @param array  $r     The raised row.
	 */
	private static function add( array &$totals_by, $key, $label, array $r ) {
		self::blank( $totals_by, $key, $label );
		$totals_by[ $key ]['raised']  += (float) $r['raised'];
		$totals_by[ $key ]['refunds'] += (float) $r['refunds'];
		$totals_by[ $key ]['fees']    += (float) $r['fees'];
		$totals_by[ $key ]['gifts']   += (int) $r['gifts'];
		$first                         = (string) $r['first_date'];
		if ( '' !== $first && ( '' === $totals_by[ $key ]['first_date'] || $first < $totals_by[ $key ]['first_date'] ) ) {
			$totals_by[ $key ]['first_date'] = $first;
		}
	}

	/**
	 * Make sure a list has an empty entry for a key.
	 *
	 * @param array  $totals_by The totals by key, changed.
	 * @param string $key   The key.
	 * @param string $label The name of the key field in the entry.
	 */
	private static function blank( array &$totals_by, $key, $label ) {
		if ( ! isset( $totals_by[ $key ] ) ) {
			$totals_by[ $key ] = array(
				$label       => $key,
				'first_date' => '',
				'spend'      => 0.0,
				'raised'     => 0.0,
				'refunds'    => 0.0,
				'fees'       => 0.0,
				'gifts'      => 0,
			);
		}
	}

	/**
	 * Round a row and work out what a dollar raised cost.
	 *
	 * @param array $row A month or a total.
	 * @return array The row with amounts rounded and cost_per_dollar added (null when nothing was raised net of refunds).
	 */
	private static function finish( array $row ) {
		$net = $row['raised'] - $row['refunds'];
		foreach ( array( 'spend', 'raised', 'refunds', 'fees' ) as $k ) {
			$row[ $k ] = round( $row[ $k ], 2 );
		}
		$row['cost_per_dollar'] = $net > 0 ? round( $row['spend'] / $net, 4 ) : null;
		unset( $row['first_date'] );
		return $row;
	}

	/**
	 * Round a send's amounts.
	 *
	 * @param array $row A send.
	 * @return array The send without the spend field.
	 */
	private static function finish_send( array $row ) {
		foreach ( array( 'raised', 'refunds', 'fees' ) as $k ) {
			$row[ $k ] = round( $row[ $k ], 2 );
		}
		unset( $row['spend'] );
		return $row;
	}
}
