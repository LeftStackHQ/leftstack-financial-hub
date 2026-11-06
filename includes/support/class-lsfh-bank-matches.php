<?php
/**
 * Confirmed bank matches: check a group of bank lines and Hub records, save it, list it, undo it.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Confirmed matches.
 *
 * A match ties a group of bank lines to a group of Hub records. The two sides must add up to the cent,
 * or the person confirming must say in writing why they differ. Everything is checked here against the
 * database, so nothing the browser says about amounts is trusted.
 */
class LSFH_Bank_Matches {

	const MAX_ITEMS_PER_SIDE = 50;
	const MAX_GROUPS         = 200;

	/**
	 * Confirm one or more groups together: all are saved or none is.
	 *
	 * @param int     $account_id Bank account id.
	 * @param array[] $groups     Each: bank (line ids), hub (record ids such as p12), tier, reason, note.
	 * @param int     $user_id    Who is confirming.
	 * @param bool    $fill_dates Whether to fill blank dates on the Hub items from the bank lines.
	 * @return int[]|WP_Error The new match ids, in the order given.
	 */
	public static function confirm( $account_id, array $groups, $user_id, $fill_dates = true ) {
		global $wpdb;
		if ( ! $groups || count( $groups ) > self::MAX_GROUPS ) {
			return new WP_Error( 'bad_groups', 'Send between 1 and ' . self::MAX_GROUPS . ' groups.', array( 'status' => 400 ) );
		}
		$checked = self::check_groups( $account_id, $groups );
		if ( is_wp_error( $checked ) ) {
			return $checked;
		}

		$wpdb->query( 'START TRANSACTION' ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$match_ids = array();
		foreach ( $checked as $group ) {
			$match_id = self::save_group( $account_id, $group, $user_id, $fill_dates );
			if ( ! $match_id ) {
				$wpdb->query( 'ROLLBACK' ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
				return new WP_Error( 'already_matched', 'One of these items was matched by someone else a moment ago. Reload and try again.', array( 'status' => 409 ) );
			}
			$match_ids[] = $match_id;
		}
		$wpdb->query( 'COMMIT' ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		return $match_ids;
	}

	/**
	 * Undo a match: its items become unmatched again.
	 *
	 * @param int $match_id Match id.
	 * @return bool False when there is no such match.
	 */
	public static function remove( $match_id ) {
		global $wpdb;
		$exists = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->prefix}lsfh_bank_matches WHERE id = %d", $match_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		if ( ! $exists ) {
			return false;
		}
		$wpdb->query( 'START TRANSACTION' ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$marked = (array) $wpdb->get_results( $wpdb->prepare( "SELECT kind, ref_id, marked, marked_date FROM {$wpdb->prefix}lsfh_bank_match_links WHERE match_id = %d AND marked <> ''", $match_id ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		foreach ( $marked as $link ) {
			LSFH_Bank_Marks::revert( $link['kind'], (int) $link['ref_id'], $link['marked'], $link['marked_date'] );
		}
		$wpdb->delete( $wpdb->prefix . 'lsfh_bank_match_links', array( 'match_id' => $match_id ), array( '%d' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->delete( $wpdb->prefix . 'lsfh_bank_matches', array( 'id' => $match_id ), array( '%d' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query( 'COMMIT' ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		return true;
	}

	/**
	 * A page of an account's confirmed matches, newest first, each with the ids on both sides
	 * (b12 for a bank line, p3, d7 or e30 for a Hub record: the same ids the review uses).
	 *
	 * @param int    $account_id Bank account id.
	 * @param int    $page       Page number, from 1.
	 * @param int    $per_page   Matches per page.
	 * @param string $direction  Only money in (in) or money out (out); empty for both.
	 * @return array{data: array[], total: int}
	 */
	public static function page( $account_id, $page, $per_page, $direction = '' ) {
		global $wpdb;
		$where   = self::direction_sql( $direction );
		$total   = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->prefix}lsfh_bank_matches m WHERE m.account_id = %d $where", $account_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$matches = (array) $wpdb->get_results( $wpdb->prepare( "SELECT m.id, m.tier, m.reason, m.difference, m.note, m.created_by, m.created_at FROM {$wpdb->prefix}lsfh_bank_matches m WHERE m.account_id = %d $where ORDER BY m.id DESC LIMIT %d OFFSET %d", $account_id, $per_page, ( $page - 1 ) * $per_page ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$by_id   = array();
		foreach ( $matches as $row ) {
			$by_id[ (int) $row['id'] ] = array(
				'id'         => (int) $row['id'],
				'tier'       => $row['tier'],
				'reason'     => $row['reason'],
				'difference' => (float) $row['difference'],
				'note'       => $row['note'],
				'created_by' => (int) $row['created_by'],
				'created_at' => $row['created_at'],
				'bank'       => array(),
				'hub'        => array(),
			);
		}
		if ( $by_id ) {
			$marks = implode( ',', array_fill( 0, count( $by_id ), '%d' ) );
			$links = (array) $wpdb->get_results( $wpdb->prepare( "SELECT match_id, kind, ref_id FROM {$wpdb->prefix}lsfh_bank_match_links WHERE match_id IN ($marks) ORDER BY id", ...array_keys( $by_id ) ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,PluginCheck.Security.DirectDB.UnescapedDBParameter
			foreach ( $links as $link ) {
				$side                                        = 'bank' === $link['kind'] ? 'bank' : 'hub';
				$by_id[ (int) $link['match_id'] ][ $side ][] = $link['kind'][0] . (int) $link['ref_id'];
			}
		}
		return array(
			'data'  => array_values( $by_id ),
			'total' => $total,
		);
	}

	/**
	 * The WHERE part that keeps matches of one direction: money in is a match whose bank lines add up to zero or more,
	 * money out one whose bank lines add up to less than zero. It holds no input, only one of two fixed strings.
	 *
	 * @param string $direction in, out, or anything else for both.
	 * @return string An AND clause on the matches table (alias m), or an empty string.
	 */
	private static function direction_sql( $direction ) {
		global $wpdb;
		if ( ! in_array( $direction, array( 'in', 'out' ), true ) ) {
			return '';
		}
		$sum = "(SELECT COALESCE(SUM(l.amount), 0) FROM {$wpdb->prefix}lsfh_bank_match_links k JOIN {$wpdb->prefix}lsfh_bank_lines l ON l.id = k.ref_id WHERE k.kind = 'bank' AND k.match_id = m.id)";
		return 'in' === $direction ? "AND $sum >= 0" : "AND $sum < 0";
	}

	/**
	 * Check every group against the database and add what saving needs.
	 *
	 * @param int     $account_id Bank account id.
	 * @param array[] $groups     Groups as sent.
	 * @return array[]|WP_Error The groups with their items, link amounts, difference and cleaned labels.
	 */
	private static function check_groups( $account_id, array $groups ) {
		$line_ids = array();
		$hub_ids  = array();
		foreach ( $groups as $group ) {
			$line_ids = array_merge( $line_ids, $group['bank'] );
			$hub_ids  = array_merge( $hub_ids, $group['hub'] );
		}
		if ( count( $line_ids ) !== count( array_unique( $line_ids ) ) || count( $hub_ids ) !== count( array_unique( $hub_ids ) ) ) {
			return new WP_Error( 'duplicate_item', 'An item can be in only one group.', array( 'status' => 400 ) );
		}
		$lines   = LSFH_Bank_Lines::lines_by_id( $account_id, $line_ids );
		$records = LSFH_Bank_Hub_Records::by_ids( $hub_ids );
		if ( count( $lines ) !== count( $line_ids ) || count( $records ) !== count( $hub_ids ) ) {
			return new WP_Error( 'unknown_item', 'A bank line or Hub record in this match does not exist.', array( 'status' => 404 ) );
		}
		if ( self::any_matched( $line_ids, $hub_ids ) ) {
			return new WP_Error( 'already_matched', 'A bank line or Hub record here is already matched.', array( 'status' => 409 ) );
		}

		$out = array();
		foreach ( $groups as $group ) {
			if ( ! $group['bank'] || ! $group['hub'] || count( $group['bank'] ) > self::MAX_ITEMS_PER_SIDE || count( $group['hub'] ) > self::MAX_ITEMS_PER_SIDE ) {
				return new WP_Error( 'bad_group', 'Each group needs bank lines and Hub records on both sides.', array( 'status' => 400 ) );
			}
			$bank_cents = array_sum( array_map( static fn( $id ) => $lines[ $id ]['cents'], $group['bank'] ) );
			$hub_cents  = array_sum( array_map( static fn( $id ) => $records[ $id ]['cents'], $group['hub'] ) );
			if ( $bank_cents !== $hub_cents && '' === $group['note'] ) {
				return new WP_Error( 'needs_note', 'These do not add up. Say why they differ to confirm anyway.', array( 'status' => 400 ) );
			}
			$group['difference'] = ( $bank_cents - $hub_cents ) / 100;
			$group['lines']      = array_intersect_key( $lines, array_flip( $group['bank'] ) );
			$group['records']    = array_intersect_key( $records, array_flip( $group['hub'] ) );
			$out[]               = $group;
		}
		return $out;
	}

	/**
	 * Is any of these items already in a confirmed match?
	 *
	 * @param int[]    $line_ids Bank line ids.
	 * @param string[] $hub_ids  Hub record ids.
	 * @return bool
	 */
	private static function any_matched( array $line_ids, array $hub_ids ) {
		global $wpdb;
		$wanted = array_map( static fn( $id ) => array( 'bank', (int) $id ), $line_ids );
		foreach ( $hub_ids as $id ) {
			$wanted[] = LSFH_Bank_Hub_Records::split_id( $id );
		}
		foreach ( $wanted as list( $kind, $ref_id ) ) {
			$hit = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$wpdb->prefix}lsfh_bank_match_links WHERE kind = %s AND ref_id = %d", $kind, $ref_id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			if ( $hit ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Save one checked group and its links, and mark the Hub items it covers as balanced.
	 *
	 * @param int   $account_id Bank account id.
	 * @param array $group      A group from check_groups().
	 * @param int   $user_id    Who is confirming.
	 * @param bool  $fill_dates Whether to fill blank dates on the Hub items from the bank lines.
	 * @return int The match id, or 0 when an item turned out to be taken (the unique key on links).
	 */
	private static function save_group( $account_id, array $group, $user_id, $fill_dates ) {
		global $wpdb;
		$wpdb->insert( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prefix . 'lsfh_bank_matches',
			array(
				'account_id' => $account_id,
				'tier'       => $group['tier'],
				'reason'     => $group['reason'],
				'difference' => $group['difference'],
				'note'       => $group['note'],
				'created_by' => $user_id,
				'created_at' => current_time( 'mysql' ),
			),
			array( '%d', '%s', '%s', '%f', '%s', '%d', '%s' )
		);
		$match_id  = (int) $wpdb->insert_id;
		$bank_date = max( array_column( $group['lines'], 'date' ) );
		$links     = array();
		foreach ( $group['lines'] as $line ) {
			$links[] = array( 'bank', $line['id'], $line['cents'], '', null );
		}
		foreach ( $group['records'] as $id => $record ) {
			list( $kind, $ref_id ) = LSFH_Bank_Hub_Records::split_id( $id );
			$mark                  = LSFH_Bank_Marks::apply( $kind, $ref_id, $bank_date, $fill_dates );
			$links[]               = array( $kind, $ref_id, $record['cents'], $mark['marked'], $mark['marked_date'] );
		}
		$wpdb->suppress_errors( true );
		foreach ( $links as list( $kind, $ref_id, $cents, $marked, $marked_date ) ) {
			$saved = $wpdb->insert( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
				$wpdb->prefix . 'lsfh_bank_match_links',
				array(
					'match_id' => $match_id,
					'kind'     => $kind,
					'ref_id'   => $ref_id,
					'amount'   => $cents / 100,
					'marked'   => $marked,
				) + ( null === $marked_date ? array() : array( 'marked_date' => $marked_date ) ),
				array( '%d', '%s', '%d', '%f', '%s', '%s' )
			);
			if ( ! $saved ) {
				$wpdb->suppress_errors( false );
				return 0;
			}
		}
		$wpdb->suppress_errors( false );
		return $match_id;
	}
}
