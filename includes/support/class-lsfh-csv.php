<?php
/**
 * CSV and TSV reading and writing, plus the zip and phone formats the importers share.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * CSV and TSV reading and writing, plus the zip and phone formats the importers share.
 */
class LSFH_Csv {

	/**
	 * Format a raw ZIP as 5 digits, or ZIP+4 (XXXXX-XXXX) when it has 9 or more digits.
	 *
	 * @param string $raw ZIP as entered.
	 * @return string Formatted ZIP.
	 */
	public static function fmt_zip( string $raw ): string {
		$digits = preg_replace( '/[^0-9]/', '', $raw );
		if ( strlen( $digits ) === 0 ) {
			return '';
		}
		if ( strlen( $digits ) >= 9 ) {
			return substr( $digits, 0, 5 ) . '-' . substr( $digits, 5, 4 );
		}
		return str_pad( $digits, 5, '0', STR_PAD_LEFT );
	}

	/**
	 * Format a phone number as (XXX) XXX-XXXX.
	 *
	 * @param string $raw Phone number as entered.
	 * @return string Formatted number, or the original text when it cannot be normalized.
	 */
	public static function fmt_phone( string $raw ): string {
		$digits = preg_replace( '/[^0-9]/', '', $raw );
		if ( 11 === strlen( $digits ) && '1' === $digits[0] ) {
			$digits = substr( $digits, 1 );
		}
		if ( strlen( $digits ) !== 10 ) {
			return $raw;
		}
		return '(' . substr( $digits, 0, 3 ) . ') ' . substr( $digits, 3, 3 ) . '-' . substr( $digits, 6, 4 );
	}

	/**
	 * Parse CSV text into rows of cells.
	 *
	 * Handles quoted cells that contain commas, doubled quotes and line breaks. Splitting
	 * the text on newlines and calling str_getcsv() on each line, which this replaces,
	 * cut a record in two whenever a cell held a line break. A leading byte-order mark
	 * and blank lines are ignored.
	 *
	 * @param string $text Raw CSV text.
	 * @return array<int,array<int,string>>
	 */
	public static function parse_csv( $text ) {
		$text = (string) preg_replace( '/^\xEF\xBB\xBF/', '', (string) $text );
		$rows = array();
		$row  = array();
		$cell = '';
		$in_q = false;
		$len  = strlen( $text );
		for ( $i = 0; $i < $len; $i++ ) {
			$ch = $text[ $i ];
			if ( $in_q ) {
				if ( '"' === $ch ) {
					if ( $i + 1 < $len && '"' === $text[ $i + 1 ] ) {
						$cell .= '"';
						++$i;
					} else {
						$in_q = false;
					}
				} else {
					$cell .= $ch;
				}
			} elseif ( '"' === $ch ) {
				$in_q = true;
			} elseif ( ',' === $ch ) {
				$row[] = $cell;
				$cell  = '';
			} elseif ( "\n" === $ch ) {
				$row[]  = $cell;
				$rows[] = $row;
				$row    = array();
				$cell   = '';
			} elseif ( "\r" !== $ch ) {
				$cell .= $ch;
			}
		}
		if ( '' !== $cell || $row ) {
			$row[]  = $cell;
			$rows[] = $row;
		}
		return array_values(
			array_filter(
				$rows,
				static function ( $r ) {
					return ! ( 1 === count( $r ) && '' === trim( $r[0] ) );
				}
			)
		);
	}

	/**
	 * Build a CSV string from headers and rows without fopen/fclose, as WordPress file-handling standards expect.
	 *
	 * Free-text cells that start with = + - or @ are neutralized so a spreadsheet cannot run
	 * them as formulas.
	 *
	 * @param array $headers Column headings.
	 * @param array $rows Rows of cells.
	 * @return string
	 */
	public static function csv_string( array $headers, array $rows ): string {
		// Free-text fields (donor name, payee, notes…) that begin with = + - @ are
		// run as formulas when the file is opened in Excel or Sheets, so a donor who
		// typed `=HYPERLINK(...)` as their employer would execute it on whoever
		// opens the export. A leading apostrophe makes the spreadsheet treat the
		// cell as text. Genuine numbers (a refund's -5.00) are left untouched, and
		// this only covers these internal exports — the state-filing files use
		// tsv_string()/tn_csv_string() and must match the state's format exactly.
		$enc   = static function ( $v ): string {
			$v = (string) $v;
			if ( '' !== $v && false !== strpos( "=+-@\t\r", $v[0] ) && ! is_numeric( $v ) ) {
				$v = "'" . $v;
			}
			return '"' . str_replace( '"', '""', $v ) . '"';
		};
		$lines = array( implode( ',', array_map( $enc, $headers ) ) );
		foreach ( $rows as $row ) {
			$lines[] = implode( ',', array_map( $enc, (array) $row ) );
		}
		return implode( "\r\n", $lines ) . "\r\n";
	}

	/**
	 * Build a tab-delimited string.
	 *
	 * @param array $headers Column headings.
	 * @param array $rows Rows of cells.
	 * @return string
	 */
	public static function tsv_string( array $headers, array $rows ): string {
		$clean = static fn( $v ): string => str_replace( array( "\t", "\r", "\n" ), ' ', (string) $v );
		$lines = array( implode( "\t", array_map( $clean, $headers ) ) );
		foreach ( $rows as $row ) {
			$lines[] = implode( "\t", array_map( $clean, (array) $row ) );
		}
		return implode( "\r\n", $lines ) . "\r\n";
	}
}
