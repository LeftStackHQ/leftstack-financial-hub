<?php
/**
 * Bank accounts and their lines: save a bank's format, add the lines of a bank file, read the open ones.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Storage for bank accounts and bank lines.
 *
 * Amounts are signed: money in is positive, money out is negative. A line is kept with a fingerprint so
 * two bank files that overlap never add the same line twice.
 */
class LSFH_Bank_Lines {

	/**
	 * Every bank account, oldest first, with its saved format.
	 *
	 * @return array[]
	 */
	public static function accounts() {
		global $wpdb;
		$rows = $wpdb->get_results( "SELECT id, label, format FROM {$wpdb->prefix}lsfh_bank_accounts ORDER BY id", ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		return array_map( array( __CLASS__, 'shape_account' ), $rows );
	}

	/**
	 * One bank account, or null when there is none with that id.
	 *
	 * @param int $id Account id.
	 * @return array|null
	 */
	public static function account( $id ) {
		global $wpdb;
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT id, label, format FROM {$wpdb->prefix}lsfh_bank_accounts WHERE id = %d", $id ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		return $row ? self::shape_account( $row ) : null;
	}

	/**
	 * Add a bank account.
	 *
	 * @param string $label  What the user calls it.
	 * @param array  $format Cleaned format (see LSFH_Bank_Format).
	 * @return int The new account id.
	 */
	public static function add_account( $label, array $format ) {
		global $wpdb;
		$wpdb->insert( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prefix . 'lsfh_bank_accounts',
			array(
				'label'  => $label,
				'format' => wp_json_encode( $format ),
			),
			array( '%s', '%s' )
		);
		return (int) $wpdb->insert_id;
	}

	/**
	 * Change a bank account's label or format. Only the parts given are changed.
	 *
	 * @param int   $id     Account id.
	 * @param array $fields Column => value, from label and format.
	 */
	public static function update_account( $id, array $fields ) {
		global $wpdb;
		if ( isset( $fields['format'] ) ) {
			$fields['format'] = wp_json_encode( $fields['format'] );
		}
		$wpdb->update( $wpdb->prefix . 'lsfh_bank_accounts', $fields, array( 'id' => $id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
	}

	/**
	 * Add the lines of a bank file to an account, skipping lines already stored.
	 *
	 * Identical lines in one file (two deposits of the same amount on one day) are different lines, so
	 * each gets a fingerprint that includes how many identical ones came before it in the file.
	 *
	 * @param int     $account_id Account id.
	 * @param array[] $lines      Cleaned lines: date, cents, description, check_number.
	 * @return array{added: int, duplicates: int}
	 */
	public static function add_lines( $account_id, array $lines ) {
		global $wpdb;
		$seen  = array();
		$added = 0;
		foreach ( $lines as $line ) {
			$base          = implode( '|', array( $account_id, $line['date'], $line['cents'], strtolower( $line['description'] ), $line['check_number'] ) );
			$seen[ $base ] = ( $seen[ $base ] ?? 0 ) + 1;
			$inserted      = $wpdb->query( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
				$wpdb->prepare(
					"INSERT IGNORE INTO {$wpdb->prefix}lsfh_bank_lines (account_id, line_date, amount, description, check_number, fingerprint) VALUES (%d, %s, %f, %s, %s, %s)",
					$account_id,
					$line['date'],
					$line['cents'] / 100,
					$line['description'],
					$line['check_number'],
					sha1( $base . '|' . $seen[ $base ] )
				)
			);
			$added        += (int) $inserted;
		}
		return array(
			'added'      => $added,
			'duplicates' => count( $lines ) - $added,
		);
	}

	/**
	 * The first and last dates among all the lines of an account, matched or not.
	 *
	 * @param int $account_id Account id.
	 * @return array{first: string, last: string}|null Null when the account has no lines.
	 */
	public static function date_range( $account_id ) {
		global $wpdb;
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT MIN(line_date) AS first, MAX(line_date) AS last FROM {$wpdb->prefix}lsfh_bank_lines WHERE account_id = %d", $account_id ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		return $row && $row['first'] ? $row : null;
	}

	/**
	 * The lines of an account that are not part of a confirmed match, oldest first.
	 *
	 * @param int         $account_id Account id.
	 * @param string|null $from       Y-m-d; lines before it are left out.
	 * @return array[] Each: id, date, cents, description, check_number.
	 */
	public static function open_lines( $account_id, $from = null ) {
		global $wpdb;
		$sql    = "SELECT l.id, l.line_date, l.amount, l.description, l.check_number
			FROM {$wpdb->prefix}lsfh_bank_lines l
			LEFT JOIN {$wpdb->prefix}lsfh_bank_match_links k ON k.kind = 'bank' AND k.ref_id = l.id
			WHERE l.account_id = %d AND k.id IS NULL";
		$values = array( $account_id );
		if ( null !== $from ) {
			$sql     .= ' AND l.line_date >= %s';
			$values[] = $from;
		}
		$rows = $wpdb->get_results( $wpdb->prepare( $sql . ' ORDER BY l.line_date, l.id', ...$values ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare,PluginCheck.Security.DirectDB.UnescapedDBParameter
		return array_map( array( __CLASS__, 'shape_line' ), $rows );
	}

	/**
	 * Lines of one account by id, whether matched or not.
	 *
	 * @param int   $account_id Account id.
	 * @param int[] $ids        Line ids.
	 * @return array[] Keyed by line id.
	 */
	public static function lines_by_id( $account_id, array $ids ) {
		global $wpdb;
		if ( ! $ids ) {
			return array();
		}
		$marks = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
		$rows  = $wpdb->get_results( $wpdb->prepare( "SELECT id, line_date, amount, description, check_number FROM {$wpdb->prefix}lsfh_bank_lines WHERE account_id = %d AND id IN ($marks)", $account_id, ...$ids ), ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$out   = array();
		foreach ( $rows as $row ) {
			$line               = self::shape_line( $row );
			$out[ $line['id'] ] = $line;
		}
		return $out;
	}

	/**
	 * Turn a stored account row into the shape the API returns.
	 *
	 * @param array $row Database row.
	 * @return array
	 */
	private static function shape_account( array $row ) {
		return array(
			'id'     => (int) $row['id'],
			'label'  => $row['label'],
			'format' => json_decode( (string) $row['format'], true ) ?: array(),
		);
	}

	/**
	 * Turn a stored line row into the shape the matcher and the API use.
	 *
	 * @param array $row Database row.
	 * @return array
	 */
	private static function shape_line( array $row ) {
		return array(
			'id'           => (int) $row['id'],
			'date'         => $row['line_date'],
			'cents'        => (int) round( (float) $row['amount'] * 100 ),
			'description'  => $row['description'],
			'check_number' => $row['check_number'],
		);
	}
}
