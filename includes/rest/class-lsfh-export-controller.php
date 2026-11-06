<?php
/**
 * Export routes: the Tennessee state report and the CSV exports.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * Export routes: the Tennessee state report and the CSV exports.
 */
class LSFH_Export_Controller extends LSFH_REST_Base {

	/**
	 * Tennessee bulk contribution import file, tab-delimited as the state prefers.
	 *
	 * Columns: CONTRIBUTORTYPE, LNAME, FNAME, STREET, ADDR2, CITY, STATE, ZIP, OCCUPATION,
	 * EMPLOYER, AMT, BATCHDTE, FUNDCODE.
	 *
	 * Pass preflight=1 to get JSON statistics (total, organization and PAC rows, PAC names,
	 * rows per election, rows missing an address) without generating the file. Pass
	 * contributor_type=I or O to export only individuals or only organizations and PACs.
	 * FUNDCODE comes from the fund_code parameter.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function export_tn_contributions( WP_REST_Request $req ) {
		global $wpdb;
		$fund_code      = sanitize_text_field( $req->get_param( 'fund_code' ) ?? '' );
		$fund_code_auto = ( 'all' === $fund_code ); // derive P/G per row from election_type.
		$preflight      = (bool) $req->get_param( 'preflight' );
		$use_csv        = ( $req->get_param( 'format' ) === 'csv' );
		$batch_offset   = max( 0, (int) ( $req->get_param( 'offset' ) ?? 0 ) );
		$batch_limit    = max( 0, (int) ( $req->get_param( 'limit' ) ?? 0 ) ); // 0 = no limit
		// NB: not 'zip' — build_donation_where() already reads that as a postal
		// ZIP-code filter, so `zip=1` silently filtered the export to
		// contributions whose ZIP contains a "1" (roughly half of them) while
		// still producing a plausible-looking archive.
		$as_zip = (bool) $req->get_param( 'archive' );  // all batches in one file.

		// Which contributions a report contains (positive, itemized, never narrowed by dollar size) is decided in one
		// place, shared with the check before a state report. See LSFH_Filing_Check::report_wheres().
		$values = array();
		$wheres = LSFH_Filing_Check::report_wheres( $req, $values );
		// TN loads organisations and PACs on a schedule separate from
		// individuals, so the filing needs each set on its own. No user value
		// reaches the SQL — the parameter only selects between two fixed
		// clauses. Rows with a NULL donor_type count as individuals, which
		// matches how they already export.
		$contributor = strtoupper( sanitize_text_field( $req->get_param( 'contributor_type' ) ?? '' ) );
		if ( 'O' === $contributor ) {
			$wheres[] = "donor_type = 'organization'";
		} elseif ( 'I' === $contributor ) {
			$wheres[] = "( donor_type IS NULL OR donor_type <> 'organization' )";
		}
		// A refunded contribution is reported at the amount it was given. Tennessee wants
		// the contribution as received, and the refund is reported on its own, so a
		// refund is never netted against the contribution (a fully refunded one used
		// to print 0.00, and a partly refunded one the remainder). Refund rows are not
		// in the file (the gross_amount > 0 filter above), and nobody is dropped from a
		// report: a contribution refunded in a later period still appears, at its
		// amount, in the period it belongs to. See dev/refund-amendments-spec.md.
		$where_sql = $wheres ? 'WHERE ' . implode( ' AND ', $wheres ) : '';

		// Fetched in chunks rather than all at once. Previously the whole result
		// set was loaded into $rows and then a second, reformatted copy built in
		// $csv_rows, so both existed simultaneously and peak memory scaled with
		// the campaign's total contributions — 126 MB at 27k rows, fatal beyond
		// roughly 40k. Chunking keeps only CHUNK database objects alive at a
		// time, so the raw rows never coexist with the full formatted set.
		//
		// The filtering below is unchanged. The PAC rule reads first_name after
		// tn_clean(), which is not reliably expressible in SQL (a name like
		// "P#AC" cleans to "PAC"), so it deliberately stays in PHP rather than
		// risking a different set of contributions reaching a legal filing.
		$chunk_size = 2000;
		$sql_offset = 0;

		$csv_rows        = array();
		$pac_names       = array();
		$org_rows        = 0;
		$missing_address = 0;
		// FUNDCODE is the only thing in the file that says which election a
		// contribution is for, and fund_code does not filter — picking P
		// stamps every exported row P whatever its own election. Counting the
		// split here lets the caller see it, and refuse a code that disagrees.
		$elec_primary = 0;
		$elec_general = 0;
		$elec_other   = 0;

		$headers = array( 'CONTRIBUTORTYPE', 'LNAME', 'FNAME', 'STREET', 'ADDR2', 'CITY', 'STATE', 'ZIP', 'OCCUPATION', 'EMPLOYER', 'AMT', 'BATCHDTE', 'FUNDCODE' );

		// Streaming archive mode. Formatted rows are written into the ZIP a
		// batch at a time and then discarded, so memory stays flat regardless
		// of how many contributions the campaign has. Accumulating everything
		// first was what put a ceiling on this: at 107k rows the row array was
		// 126 MB while the finished archive was only 2 MB.
		//
		// ZipArchive writes entries to its temp file on disk as they are added,
		// so the archive itself never sits in memory — only the current batch's
		// string does, ~50 KB. That keeps the response a normal
		// WP_REST_Response rather than echoing output directly, which would
		// bypass the REST pipeline, its permission handling and
		// rest_post_dispatch filters.
		$stream_zip   = ( $as_zip && $batch_limit > 0 && ! $preflight );
		$zip_archive  = null;
		$zip_tmp      = null;
		$zip_ext      = $use_csv ? 'csv' : 'txt';
		$zip_date     = gmdate( 'Y-m-d' );
		$zip_batch    = array();
		$zip_files    = 0;
		$zip_rowcount = 0;

		if ( $stream_zip ) {
			if ( ! class_exists( 'ZipArchive' ) ) {
				return new WP_Error(
					'zip_unavailable',
					'This server cannot build ZIP files. Download the files individually instead.',
					array( 'status' => 501 )
				);
			}
			// Not wp_tempnam(): that lives in wp-admin/includes/file.php, which
			// is not loaded during a REST request. get_temp_dir() is in
			// wp-includes and always available. WP_Filesystem is deliberately
			// not used — this file is created outside wp-content, read once and
			// deleted, and the abstraction can prompt for credentials on some
			// hosts for no benefit here.
			$zip_tmp = tempnam( get_temp_dir(), 'lsfh-tn-export' );
			if ( ! $zip_tmp ) {
				return new WP_Error( 'zip_failed', 'Could not create a temporary file.', array( 'status' => 500 ) );
			}
			// The normal paths below delete this file, but a fatal part-way
			// through or a client disconnect would leave it behind. On a
			// multisite where every campaign shares one server, those would
			// accumulate in the system temp directory unnoticed. A shutdown
			// handler makes cleanup unconditional; it is a no-op once the file
			// has already been removed.
			register_shutdown_function(
				static function () use ( $zip_tmp ) {
					if ( $zip_tmp && file_exists( $zip_tmp ) ) {
						wp_delete_file( $zip_tmp );
					}
				}
			);
			$zip_archive = new ZipArchive();
			if ( true !== $zip_archive->open( $zip_tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE ) ) {
				wp_delete_file( $zip_tmp );
				return new WP_Error( 'zip_failed', 'Could not create the ZIP file.', array( 'status' => 500 ) );
			}
		}

		do {
			// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
			$sql          = "SELECT * FROM {$wpdb->prefix}lsfh_donations $where_sql ORDER BY contribution_date ASC, id ASC LIMIT %d OFFSET %d";
			$chunk_values = array_merge( $values, array( $chunk_size, $sql_offset ) );
			$rows         = $wpdb->get_results( $wpdb->prepare( $sql, ...$chunk_values ) );
			// phpcs:enable

			$sql_offset += $chunk_size;

			foreach ( $rows as $r ) {
				// CONTRIBUTORTYPE: I for individuals, O for organizations (donor_type field).
				$is_org = ( 'organization' === $r->donor_type );
				$ctype  = $is_org ? 'O' : 'I';
				$lname  = $is_org ? self::tn_clean( $r->first_name ) : self::tn_clean( $r->last_name );
				$fname  = $is_org ? '' : self::tn_clean( $r->first_name );

				// PACs are counted here, never dropped. This used to `continue`,
				// which silently removed them from the file: on 2026-09-10 four
				// organisations worth $3,650 were missing from a filing with
				// nothing on screen saying why, because the UI only ever read the
				// excluded-row count and never the names. TN strips PACs from the
				// individual upload on its own side, so carrying them costs
				// nothing and keeps the spreadsheet reviewable. Use
				// contributor_type=O for the organisations-and-PACs file.
				if ( $is_org ) {
					++$org_rows;
					if ( LSFH_Donations_Controller::is_pac_name( $lname ) ) {
						$pac_names[] = $lname;
					}
				}

				$row_elec = (string) $r->election_type;
				if ( 'primary' === $row_elec ) {
					++$elec_primary;
				} elseif ( 'general' === $row_elec ) {
					++$elec_general;
				} else {
					// Runoff, special or unset — 'all' writes a blank FUNDCODE for
					// these, which is a filing gap worth surfacing before download.
					++$elec_other;
				}

				// Data quality — count rows with a missing part of the address (the same rule as the check before a report).
				if ( LSFH_Filing_Check::address_gaps( $r ) ) {
					++$missing_address;
				}

				$batch_dte = $r->contribution_date ? gmdate( 'm/d/Y', strtotime( $r->contribution_date ) ) : '';
				// The contribution's own amount; a refund is reported separately, not netted here.
				$amt = number_format( (float) $r->gross_amount, 2, '.', '' );
				// zipFormatted correctly zero-pads short zips (e.g. "1970" → "01970").
				// Both columns can be NULL (a donation entered without a ZIP), which is a blank ZIP in the file.
				$zip = LSFH_Csv::fmt_zip( (string) ( $r->zip_formatted ?: $r->zip ) );

				$formatted = array(
					$ctype,
					$lname,
					$fname,
					self::tn_clean( $r->address ),
					'', // ADDR2: not stored as a separate field.
					self::tn_clean( $r->city ),
					strtoupper( $r->state ?: '' ),
					$zip,
					$is_org ? '' : self::tn_clean( $r->occupation ),
					$is_org ? '' : self::tn_clean( $r->employer ),
					$amt,
					$batch_dte,
					$fund_code_auto ? ( 'primary' === $r->election_type ? 'P' : ( 'general' === $r->election_type ? 'G' : '' ) ) : $fund_code,
				);

				if ( $stream_zip ) {
					$zip_batch[] = $formatted;
					++$zip_rowcount;
					if ( count( $zip_batch ) >= $batch_limit ) {
						++$zip_files;
						$zip_archive->addFromString(
							sprintf( 'tn-import-%s-file%02d.%s', $zip_date, $zip_files, $zip_ext ),
							$use_csv
							? self::tn_csv_string( $headers, $zip_batch )
							: LSFH_Csv::tsv_string( $headers, $zip_batch )
						);
						$zip_batch = array();
					}
				} elseif ( $preflight ) {
					// Only the counts are returned; nothing needs keeping.
					++$zip_rowcount;
				} else {
					$csv_rows[] = $formatted;
				}
			}

			// Release this chunk's database objects before fetching the next.
			$fetched = count( $rows );
			unset( $rows );

			// Same idea as core's WP_Importer::stop_the_insanity(): $wpdb logs
			// every query when SAVEQUERIES is on — which Query Monitor and
			// similar debug plugins enable — so on those sites the log would
			// grow with one entry per chunk for the life of the request.
			// Harmless when SAVEQUERIES is off, which is the usual case.
			if ( defined( 'SAVEQUERIES' ) && SAVEQUERIES ) {
				$wpdb->queries = array();
			}
		} while ( $fetched === $chunk_size );

		if ( $preflight ) {
			return rest_ensure_response(
				array(
					'total'           => $zip_rowcount,
					'org_rows'        => $org_rows,
					'pac_rows'        => count( $pac_names ),
					'pac_names'       => LSFH_Donations_Controller::unique_pacs( $pac_names ),
					'elec_primary'    => $elec_primary,
					'elec_general'    => $elec_general,
					'elec_other'      => $elec_other,
					'missing_address' => $missing_address,
				)
			);
		}

		// Finalise the streaming archive: flush any partial last batch, close
		// the file, and return it. Rows were written as they were formatted,
		// so nothing large is held here — only the finished archive is read
		// back, which is ~2 MB even at 100k contributions.
		if ( $stream_zip ) {
			if ( $zip_batch ) {
				++$zip_files;
				$zip_archive->addFromString(
					sprintf( 'tn-import-%s-file%02d.%s', $zip_date, $zip_files, $zip_ext ),
					$use_csv
						? self::tn_csv_string( $headers, $zip_batch )
						: LSFH_Csv::tsv_string( $headers, $zip_batch )
				);
				$zip_batch = array();
			}

			// Entries were named file01, file02 … while streaming, because the
			// total is not known until the last row is read. Now that it is,
			// rename them to file01-of-15 style so a filing's parts are
			// self-describing outside the archive too. renameIndex() works on
			// the open archive, before close() writes it out.
			for ( $i = 0; $i < $zip_files; $i++ ) {
				$zip_archive->renameIndex(
					$i,
					sprintf(
						'tn-import-%s-file%02d-of-%02d.%s',
						$zip_date,
						$i + 1,
						$zip_files,
						$zip_ext
					)
				);
			}

			$zip_archive->close();

			// A filing that fits in one file does not need an archive; fall
			// through so the caller gets the plain file it would otherwise get.
			if ( $zip_files > 1 ) {
				// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
				$body = file_get_contents( $zip_tmp );
				wp_delete_file( $zip_tmp );

				return new WP_REST_Response(
					$body,
					200,
					array(
						'Content-Type'                  => 'application/zip',
						'Content-Disposition'           => 'attachment; filename="tn-import-' . $zip_date . '.zip"',
						'X-LSFH-PAC-Names'              => wp_json_encode( LSFH_Donations_Controller::unique_pacs( $pac_names ) ),
						'X-LSFH-PAC-Rows'               => (string) count( $pac_names ),
						'X-LSFH-Org-Rows'               => (string) $org_rows,
						'X-LSFH-File-Count'             => (string) $zip_files,
						'Access-Control-Expose-Headers' => 'X-LSFH-PAC-Names, X-LSFH-PAC-Rows, X-LSFH-Org-Rows, X-LSFH-File-Count',
					)
				);
			}
			wp_delete_file( $zip_tmp );
			return new WP_Error(
				'zip_not_needed',
				'This export fits in a single file; download it directly.',
				array( 'status' => 400 )
			);
		}

		// Apply batch slicing (after row formatting so offsets are accurate).
		if ( $batch_limit > 0 ) {
			$csv_rows = array_slice( $csv_rows, $batch_offset, $batch_limit );
		}

		if ( $use_csv ) {
			$body      = self::tn_csv_string( $headers, $csv_rows );
			$mime      = 'text/csv';
			$extension = 'csv';
		} else {
			$body      = LSFH_Csv::tsv_string( $headers, $csv_rows );
			$mime      = 'text/tab-separated-values';
			$extension = 'txt';
		}

		$batch_num = $batch_limit > 0 ? (int) floor( $batch_offset / $batch_limit ) + 1 : '';
		// Name the scope in the file. Both sets are uploaded to TN separately
		// and land in the same downloads folder, so identical names would
		// overwrite each other and it would not be obvious which was which.
		$scope_tag = ( 'O' === $contributor ) ? 'orgs-' : ( ( 'I' === $contributor ) ? 'individuals-' : '' );
		$filename  = 'tn-import-' . $scope_tag . gmdate( 'Y-m-d' ) . ( $batch_num ? "-batch{$batch_num}" : '' ) . '.' . $extension;

		return new WP_REST_Response(
			$body,
			200,
			array(
				'Content-Type'                  => $mime,
				'Content-Disposition'           => 'attachment; filename="' . $filename . '"',
				'X-LSFH-PAC-Names'              => wp_json_encode( LSFH_Donations_Controller::unique_pacs( $pac_names ) ),
				'X-LSFH-PAC-Rows'               => (string) count( $pac_names ),
				'X-LSFH-Org-Rows'               => (string) $org_rows,
				'Access-Control-Expose-Headers' => 'X-LSFH-PAC-Names, X-LSFH-PAC-Rows, X-LSFH-Org-Rows',
			)
		);
	}

	/**
	 * Export donations as a CSV file, with the same filters as the list.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function export_donations( WP_REST_Request $req ) {
		global $wpdb;
		$values    = array();
		$wheres    = LSFH_Donations_Controller::build_donation_where( $req, $values );
		$wheres[]  = 'refund_of_id IS NULL';
		$wheres[]  = "id NOT IN (SELECT d2.id FROM {$wpdb->prefix}lsfh_donations d2 INNER JOIN {$wpdb->prefix}lsfh_donations r ON r.refund_of_id = d2.id WHERE d2.refund_of_id IS NULL GROUP BY d2.id, d2.gross_amount HAVING ABS(SUM(r.gross_amount)) >= d2.gross_amount)";
		$where_sql = $wheres ? 'WHERE ' . implode( ' AND ', $wheres ) : '';
		// phpcs:disable WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter,WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare
		$rows = $wpdb->get_results( self::prepared( "SELECT * FROM {$wpdb->prefix}lsfh_donations $where_sql ORDER BY contribution_date DESC", $values ) );
		// phpcs:enable
		$csv_rows = array();
		foreach ( $rows as $r ) {
			$csv_rows[] = array( $r->contribution_date, $r->first_name, $r->last_name, $r->address, $r->city, $r->state, $r->zip, $r->occupation, $r->employer, $r->source, $r->actblue_id ?? '', $r->disbursement_id ?? '', $r->disbursement_date ?? '', $r->payment_date ?? '', $r->fundraising_page ?? '', $r->reference_code ?? '', $r->gross_amount, $r->actblue_fee, $r->net_amount, $r->payment_type, $r->check_number, $r->recurring ? 'Y' : 'N', $r->election_type, $r->report_type, $r->reporting_status, $r->balanced ? 'Y' : 'N', $r->notes, $r->phone ?? '', $r->email ?? '' );
		}
		$csv = LSFH_Csv::csv_string(
			array( 'Date', 'First Name', 'Last Name', 'Address', 'City', 'State', 'ZIP', 'Occupation', 'Employer', 'Source', 'Receipt ID', 'Disbursement ID', 'Disbursement Date', 'Payment Date', 'Fundraising Page', 'Reference Code', 'Gross Amount', 'ActBlue Fee', 'Net Amount', 'Payment Type', 'Check #', 'Recurring', 'Election', 'Report Type', 'Status', 'Balanced', 'Notes', 'Phone', 'Email' ),
			$csv_rows
		);
		return new WP_REST_Response(
			$csv,
			200,
			array(
				'Content-Type'        => 'text/csv',
				'Content-Disposition' => 'attachment; filename="donations-' . gmdate( 'Y-m-d' ) . '.csv"',
			)
		);
	}

	/**
	 * Export expenditures as a CSV file, with the same filters as the list.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function export_expenditures( WP_REST_Request $req ) {
		global $wpdb;
		$t = $wpdb->prefix . 'lsfh_expenditures';
		$c = $wpdb->prefix . 'lsfh_budget_categories';

		// Apply the same filters as list_expenditures so the export matches what the user sees.
		$wheres    = array();
		$values    = array();
		$date_from = sanitize_text_field( $req->get_param( 'date_from' ) ?? '' );
		$date_to   = sanitize_text_field( $req->get_param( 'date_to' ) ?? '' );
		$cat_id    = $req->get_param( 'category_id' );
		$method    = sanitize_text_field( $req->get_param( 'payment_method' ) ?? '' );
		$balanced  = $req->get_param( 'balanced' );
		$period    = $req->get_param( 'filing_period_id' );
		$search    = sanitize_text_field( $req->get_param( 'search' ) ?? '' );
		$status    = sanitize_key( $req->get_param( 'status' ) ?? '' );
		$today     = current_time( 'Y-m-d' );

		if ( $date_from ) {
			$wheres[] = 'e.expense_date >= %s';
			$values[] = $date_from;
		}
		if ( $date_to ) {
			$wheres[] = 'e.expense_date <= %s';
			$values[] = $date_to;
		}
		// Status: a Posted date means posted; otherwise future-dated is scheduled, the rest pending.
		$no_posted = "(e.date_posted IS NULL OR e.date_posted = '0000-00-00')";
		if ( 'posted' === $status ) {
			$wheres[] = "NOT $no_posted";
		}
		if ( 'scheduled' === $status ) {
			$wheres[] = "$no_posted AND e.expense_date > %s";
			$values[] = $today;
		}
		if ( 'pending' === $status ) {
			$wheres[] = "$no_posted AND e.expense_date <= %s";
			$values[] = $today;
		}
		if ( $cat_id ) {
			$wheres[] = 'e.category_id = %d';
			$values[] = (int) $cat_id;
		}
		if ( $method ) {
			$wheres[] = 'e.payment_method = %s';
			$values[] = $method;
		}
		if ( $period ) {
			$wheres[] = 'e.filing_period_id = %d';
			$values[] = (int) $period;
		}
		if ( null !== $balanced && '' !== $balanced ) {
			$wheres[] = 'e.balanced = %d';
			$values[] = (int) (bool) $balanced;
		}
		if ( $search ) {
			$like     = '%' . $wpdb->esc_like( $search ) . '%';
			$values[] = $like;
			$values[] = $like;
			$amount   = self::search_amount( $search );
			if ( null === $amount ) {
				$wheres[] = '(e.payee LIKE %s OR e.description LIKE %s)';
			} else {
				// A number also matches a payment of that amount.
				$wheres[] = '(e.payee LIKE %s OR e.description LIKE %s OR ROUND(ABS(e.amount),2) = %f)';
				$values[] = $amount;
			}
		}
		$where_sql = $wheres ? 'WHERE ' . implode( ' AND ', $wheres ) : '';

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQL.NotPrepared,PluginCheck.Security.DirectDB.UnescapedDBParameter
		$sql  = "SELECT e.*,c.name AS category_name FROM $t e LEFT JOIN $c c ON c.id=e.category_id $where_sql ORDER BY e.expense_date DESC";
		$rows = $wpdb->get_results( self::prepared( $sql, $values ) );
		// phpcs:enable
		$csv_rows = array();
		foreach ( $rows as $r ) {
			$csv_rows[] = array( $r->expense_date, $r->date_posted ?? '', $r->payee, $r->address, $r->category_name ?? '', $r->description, $r->amount, $r->payment_method, $r->check_number, $r->receipt_url ?? '', $r->balanced ? 'Y' : 'N', $r->paid_by, $r->notes );
		}
		$csv = LSFH_Csv::csv_string(
			array( 'Date', 'Date Posted', 'Payee', 'Address', 'Category', 'Description', 'Amount', 'Payment Method', 'Check #', 'Receipt', 'Balanced', 'Paid By', 'Notes' ),
			$csv_rows
		);
		return new WP_REST_Response(
			$csv,
			200,
			array(
				'Content-Type'        => 'text/csv',
				'Content-Disposition' => 'attachment; filename="expenditures-' . gmdate( 'Y-m-d' ) . '.csv"',
			)
		);
	}

	/**
	 * Export in-kind contributions as a CSV file.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function export_inkind( WP_REST_Request $req ) {
		global $wpdb;
		$rows     = $wpdb->get_results( "SELECT * FROM {$wpdb->prefix}lsfh_inkind ORDER BY donation_date DESC" ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$csv_rows = array();
		foreach ( $rows as $r ) {
			$csv_rows[] = array( $r->donation_date, $r->donor_name, $r->address, $r->occupation, $r->employer, $r->description, $r->value, $r->fec_report_date, $r->notes );
		}
		$csv = LSFH_Csv::csv_string(
			array( 'Date', 'Donor Name', 'Address', 'Occupation', 'Employer', 'Description', 'Value', 'FEC Report Date', 'Notes' ),
			$csv_rows
		);
		return new WP_REST_Response(
			$csv,
			200,
			array(
				'Content-Type'        => 'text/csv',
				'Content-Disposition' => 'attachment; filename="inkind-' . gmdate( 'Y-m-d' ) . '.csv"',
			)
		);
	}

	/**
	 * Build a CSV string with conditional quoting: a field is quoted only when it contains a comma, a double quote or a line break.
	 *
	 * @param array $headers Column headings.
	 * @param array $rows Rows of cells.
	 * @return string
	 */
	public static function tn_csv_string( array $headers, array $rows ): string {
		$enc   = static function ( $v ): string {
			$v = (string) $v;
			if ( strpbrk( $v, ',"' . "\n\r" ) !== false ) {
				return '"' . str_replace( '"', '""', $v ) . '"';
			}
			return $v;
		};
		$lines = array( implode( ',', array_map( $enc, $headers ) ) );
		foreach ( $rows as $row ) {
			$lines[] = implode( ',', array_map( $enc, (array) $row ) );
		}
		return implode( "\r\n", $lines ) . "\r\n";
	}

	/**
	 * Clean a field for the Tennessee state file: replace "&" with "and" and strip "#" and "|".
	 *
	 * @param string|null $v Field value.
	 * @return string Cleaned value.
	 */
	public static function tn_clean( ?string $v ): string {
		if ( ! $v ) {
			return '';
		}
		$v = str_replace( '&', 'and', $v );
		$v = preg_replace( '/[#|]/', '', $v );
		return trim( $v );
	}
}
