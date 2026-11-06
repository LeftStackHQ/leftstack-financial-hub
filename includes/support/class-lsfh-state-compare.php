<?php
/**
 * Compare the contributions of a filing period with the list the state shows for it.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * The state keeps its own registered names and addresses for organizations, so a row is matched first by what the state
 * does not rewrite: the date, the amount and the ZIP. What is left is paired by name (an individual) or by ZIP with the
 * date or the amount (an organization), and shown as different with the fields that disagree. Whatever is still left is
 * listed as missing at the state (in the Hub only) or extra at the state (in the state's list only). Nothing is changed.
 */
class LSFH_State_Compare {

	/**
	 * Most rows listed under each heading (the counts are always complete).
	 */
	const LIST_LIMIT = 200;

	/**
	 * Most rows of the state's list taken in one request.
	 */
	const MAX_STATE_ROWS = 20000;

	/**
	 * Compare the Hub's report rows with the state's rows.
	 *
	 * @param WP_REST_Request $req   The request, which names the filing period like the export does.
	 * @param array           $state The state's rows, each: name (last name, or an organization), first_name, date (Y-m-d),
	 *                               amount, zip.
	 * @return array hub_count, state_count, hub_total, state_total, matched, different, missing (in the Hub only), extra
	 *               (in the state's list only), each list cut at LIST_LIMIT with more_* flags.
	 */
	public static function run( WP_REST_Request $req, array $state ) {
		global $wpdb;
		$values = array();
		$where  = 'WHERE ' . implode( ' AND ', LSFH_Filing_Check::report_wheres( $req, $values ) );
		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$sql  = "SELECT id, donor_type, first_name, last_name, zip, zip_formatted, contribution_date, gross_amount FROM {$wpdb->prefix}lsfh_donations $where ORDER BY id ASC";
		$rows = (array) ( $values ? $wpdb->get_results( $wpdb->prepare( $sql, ...$values ) ) : $wpdb->get_results( $sql ) );
		// phpcs:enable

		$hub = array();
		foreach ( $rows as $r ) {
			$is_org = 'organization' === $r->donor_type;
			$hub[]  = array(
				'id'     => (int) $r->id,
				'is_org' => $is_org,
				'name'   => $is_org ? trim( (string) $r->first_name ) : trim( $r->first_name . ' ' . $r->last_name ),
				'norm'   => self::norm( $is_org ? $r->first_name : $r->last_name . $r->first_name ),
				'date'   => (string) $r->contribution_date,
				'cents'  => (int) round( (float) $r->gross_amount * 100 ),
				'zip'    => self::zip5( $r->zip_formatted ?: $r->zip ),
			);
		}
		$theirs = array();
		foreach ( array_slice( $state, 0, self::MAX_STATE_ROWS ) as $s ) {
			$theirs[] = array(
				'name'  => trim( trim( (string) ( $s['first_name'] ?? '' ) ) . ' ' . trim( (string) ( $s['name'] ?? '' ) ) ),
				'norm'  => self::norm( ( $s['name'] ?? '' ) . ( $s['first_name'] ?? '' ) ),
				'date'  => (string) ( $s['date'] ?? '' ),
				'cents' => (int) round( (float) ( $s['amount'] ?? 0 ) * 100 ),
				'zip'   => self::zip5( $s['zip'] ?? '' ),
			);
		}

		$matched   = 0;
		$different = array();
		$h_open    = array_keys( $hub );
		$s_open    = array_keys( $theirs );

		// Pass 1: the same date, amount and ZIP.
		$by_key = array();
		foreach ( $s_open as $i ) {
			$by_key[ $theirs[ $i ]['date'] . '|' . $theirs[ $i ]['cents'] . '|' . $theirs[ $i ]['zip'] ][] = $i;
		}
		$h_left = array();
		$taken  = array();
		foreach ( $h_open as $hi ) {
			$k    = $hub[ $hi ]['date'] . '|' . $hub[ $hi ]['cents'] . '|' . $hub[ $hi ]['zip'];
			$pick = null;
			foreach ( $by_key[ $k ] ?? array() as $si ) {
				if ( isset( $taken[ $si ] ) ) {
					continue;
				}
				// Prefer the same name when several rows share the date, amount and ZIP.
				if ( null === $pick || $theirs[ $si ]['norm'] === $hub[ $hi ]['norm'] ) {
					$pick = $si;
				}
			}
			if ( null === $pick ) {
				$h_left[] = $hi;
				continue;
			}
			$taken[ $pick ] = true;
			++$matched;
		}
		$s_left = array_values( array_diff( $s_open, array_keys( $taken ) ) );

		// Pass 2: pair what is left by name (individuals) or by ZIP with the date or the amount (organizations).
		$tries = array(
			array( 'person', array( 'norm', 'date' ), array( 'amount', 'zip' ) ),
			array( 'person', array( 'norm', 'cents' ), array( 'date', 'zip' ) ),
			array( 'org', array( 'zip', 'date' ), array( 'amount' ) ),
			array( 'org', array( 'zip', 'cents' ), array( 'date' ) ),
		);
		foreach ( $tries as list( $kind, $fields, $differs ) ) {
			$index = array();
			foreach ( $s_left as $si ) {
				$index[ self::join( $theirs[ $si ], $fields ) ][] = $si;
			}
			$h_next = array();
			$used   = array();
			foreach ( $h_left as $hi ) {
				$pick     = null;
				$eligible = 'org' === $kind ? ( $hub[ $hi ]['is_org'] && '' !== $hub[ $hi ]['zip'] ) : ! $hub[ $hi ]['is_org'];
				if ( $eligible ) {
					foreach ( $index[ self::join( $hub[ $hi ], $fields ) ] ?? array() as $si ) {
						if ( ! isset( $used[ $si ] ) ) {
							$pick = $si;
							break;
						}
					}
				}
				if ( null === $pick ) {
					$h_next[] = $hi;
					continue;
				}
				$used[ $pick ] = true;
				$different[]   = array(
					'hub'    => self::show( $hub[ $hi ] ),
					'state'  => self::show( $theirs[ $pick ] ),
					'fields' => self::fields_that_differ( $hub[ $hi ], $theirs[ $pick ] ),
				);
			}
			$h_left = $h_next;
			$s_left = array_values( array_diff( $s_left, array_keys( $used ) ) );
		}

		$missing = array_map( fn( $hi ) => self::show( $hub[ $hi ] ), $h_left );
		$extra   = array_map( fn( $si ) => self::show( $theirs[ $si ] ), $s_left );
		return array(
			'hub_count'       => count( $hub ),
			'state_count'     => count( $theirs ),
			'hub_total'       => round( array_sum( array_column( $hub, 'cents' ) ) / 100, 2 ),
			'state_total'     => round( array_sum( array_column( $theirs, 'cents' ) ) / 100, 2 ),
			'matched'         => $matched,
			'different'       => array_slice( $different, 0, self::LIST_LIMIT ),
			'different_count' => count( $different ),
			'missing'         => array_slice( $missing, 0, self::LIST_LIMIT ),
			'missing_count'   => count( $missing ),
			'extra'           => array_slice( $extra, 0, self::LIST_LIMIT ),
			'extra_count'     => count( $extra ),
		);
	}

	/**
	 * A name with everything but letters and digits taken out, lower case, so spelling around it does not matter.
	 *
	 * @param string $value A name.
	 * @return string
	 */
	private static function norm( $value ) {
		return preg_replace( '/[^a-z0-9]/', '', strtolower( (string) $value ) );
	}

	/**
	 * The first five digits of a ZIP code.
	 *
	 * @param string $zip A ZIP code, with or without the plus four.
	 * @return string
	 */
	private static function zip5( $zip ) {
		return substr( preg_replace( '/\D/', '', (string) $zip ), 0, 5 );
	}

	/**
	 * The lookup key of a row for some fields.
	 *
	 * @param array    $row    A normalised row.
	 * @param string[] $fields Fields of the row to join.
	 * @return string
	 */
	private static function join( array $row, array $fields ) {
		return implode( '|', array_map( fn( $f ) => (string) $row[ $f ], $fields ) );
	}

	/**
	 * What to show of a row.
	 *
	 * @param array $row A normalised row.
	 * @return array name, date, amount, zip.
	 */
	private static function show( array $row ) {
		return array(
			'name'   => $row['name'],
			'date'   => $row['date'],
			'amount' => round( $row['cents'] / 100, 2 ),
			'zip'    => $row['zip'],
		);
	}

	/**
	 * The fields on which two paired rows disagree.
	 *
	 * @param array $hub    The Hub's row.
	 * @param array $theirs The state's row.
	 * @return string[] Any of date, amount, zip.
	 */
	private static function fields_that_differ( array $hub, array $theirs ) {
		$out = array();
		if ( $hub['date'] !== $theirs['date'] ) {
			$out[] = 'date';
		}
		if ( $hub['cents'] !== $theirs['cents'] ) {
			$out[] = 'amount';
		}
		if ( $hub['zip'] !== $theirs['zip'] ) {
			$out[] = 'zip';
		}
		return $out;
	}
}
