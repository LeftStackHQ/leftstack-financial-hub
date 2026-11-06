<?php
/**
 * ActBlue routes: testing the connection and syncing contributions.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * ActBlue routes: testing the connection and syncing contributions.
 */
class LSFH_ActBlue_Controller extends LSFH_REST_Base {

	/**
	 * Build the HTTP Basic authorization header for ActBlue from the saved credentials.
	 *
	 * @return string Header value, or an empty string when no credentials are saved.
	 */
	public static function ab_auth() {
		$user = get_option( 'lsfh_actblue_username', '' );
		$pass = get_option( 'lsfh_actblue_password', '' );
		// HTTP Basic authentication is defined as base64 of "user:password"; this is not obfuscation.
		return $user && $pass ? 'Basic ' . base64_encode( "$user:$pass" ) : ''; // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
	}

	/**
	 * Headers for ActBlue API requests.
	 *
	 * @return array
	 */
	public static function ab_headers() {
		return array(
			'Authorization' => self::ab_auth(),
			'Accept'        => 'application/json',
			'Content-Type'  => 'application/json',
		);
	}

	/**
	 * Read a column from a CSV row, trying several possible header names.
	 *
	 * @param array $row     Cells of the row.
	 * @param array $headers Column headings.
	 * @param array $names   Header names to try, in order.
	 * @return string The trimmed value, or an empty string when none of the headers is present.
	 */
	public static function ab_col( array $row, array $headers, array $names ) {
		foreach ( $names as $n ) {
			$idx = array_search( $n, $headers, true );
			if ( false !== $idx && isset( $row[ $idx ] ) ) {
				return trim( $row[ $idx ] );
			}
		}
		return '';
	}

	/**
	 * Parse a date string into Y-m-d.
	 *
	 * @param string $raw Date as it appears in the file.
	 * @return string The date, or an empty string when it cannot be read.
	 */
	public static function ab_date( string $raw ) {
		if ( ! $raw ) {
			return '';
		}
		$dt = date_create( $raw );
		return $dt ? date_format( $dt, 'Y-m-d' ) : '';
	}

	/**
	 * Check the saved ActBlue credentials by requesting a one-day CSV.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function actblue_test( WP_REST_Request $req ) {
		if ( ! self::ab_auth() ) {
			return rest_ensure_response(
				array(
					'ok'      => false,
					'message' => 'API credentials not configured.',
				)
			);
		}

		// Kick off a minimal CSV request — a 201 proves credentials are valid.
		$res = wp_remote_post(
			'https://secure.actblue.com/api/v1/csvs',
			array(
				'headers' => self::ab_headers(),
				'body'    => wp_json_encode(
					array(
						'csv_type'         => 'paid_contributions',
						'date_range_start' => '2024-01-01',
						'date_range_end'   => '2024-01-01',
					)
				),
				'timeout' => 15,
			)
		);
		if ( is_wp_error( $res ) ) {
			return rest_ensure_response(
				array(
					'ok'      => false,
					'message' => $res->get_error_message(),
				)
			);
		}
		$code = wp_remote_retrieve_response_code( $res );
		if ( $code >= 200 && $code < 300 ) {
			return rest_ensure_response(
				array(
					'ok'      => true,
					'message' => 'Connected successfully.',
				)
			);
		}
		$json   = json_decode( wp_remote_retrieve_body( $res ), true );
		$detail = $json['error_description'] ?? $json['error'] ?? $json['message'] ?? '';
		$detail = is_string( $detail ) ? trim( $detail ) : '';
		return rest_ensure_response(
			array(
				'ok'      => false,
				'message' => 'HTTP ' . $code . ( $detail ? ': ' . $detail : ' — check credentials.' ),
			)
		);
	}

	/**
	 * Pull paid contributions from ActBlue for a date range and add the ones not already saved.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function actblue_sync( WP_REST_Request $req ) {
		$p         = $req->get_json_params() ?? array();
		$date_from = sanitize_text_field( $p['date_from'] ?? gmdate( 'Y-m-01' ) );
		$date_to   = sanitize_text_field( $p['date_to'] ?? gmdate( 'Y-m-d' ) );
		// ActBlue's CSV has no election-type concept — the user picks it once for the whole sync.
		// Each contribution takes the election of the filing period its date falls in.
		// A caller can still force one election for the whole run by passing election_type.
		$election = strtolower( sanitize_text_field( $p['election_type'] ?? '' ) );
		if ( ! in_array( $election, LSFH_Period_Elections::TYPES, true ) ) {
			$election = '';
		}

		if ( ! self::ab_auth() ) {
			return new WP_Error( 'no_creds', 'ActBlue credentials not configured.', array( 'status' => 400 ) );
		}

		// ── Step 1: Request CSV generation ───────────────────────────────────
		// We filter by disbursement date server-side, so request a wider contribution
		// window (90 days before date_from) to catch donations given earlier but
		// disbursed within the user's chosen range.
		$api_from = gmdate( 'Y-m-d', strtotime( $date_from . ' -90 days' ) );
		$res      = wp_remote_post(
			'https://secure.actblue.com/api/v1/csvs',
			array(
				'headers' => self::ab_headers(),
				'body'    => wp_json_encode(
					array(
						'csv_type'         => 'paid_contributions',
						'date_range_start' => $api_from,
						'date_range_end'   => $date_to,
					)
				),
				'timeout' => 30,
			)
		);
		if ( is_wp_error( $res ) ) {
			return new WP_Error( 'request_failed', $res->get_error_message(), array( 'status' => 500 ) );
		}
		$code = wp_remote_retrieve_response_code( $res );
		if ( $code < 200 || $code >= 300 ) {
			$json = json_decode( wp_remote_retrieve_body( $res ), true );
			$msg  = $json['error'] ?? $json['message'] ?? 'HTTP ' . $code;
			return new WP_Error( 'csv_failed', $msg, array( 'status' => 500 ) );
		}
		$csv_id = json_decode( wp_remote_retrieve_body( $res ), true )['id'] ?? '';
		if ( ! $csv_id ) {
			return new WP_Error( 'no_id', 'No CSV job ID returned.', array( 'status' => 500 ) );
		}

		// ── Step 2: Poll until download_url is ready ─────────────────────────
		// Attempt to extend PHP max execution time; silently ignored on strict
		// shared hosts where set_time_limit() is disabled — the $deadline guard
		// below keeps us safe regardless.
		if ( function_exists( 'set_time_limit' ) ) {
			set_time_limit( 120 ); // phpcs:ignore Squiz.PHP.DiscouragedFunctions.Discouraged -- Guarded and optional; the deadline check does not depend on it.
		}
		$download_url = '';
		$poll_hdrs    = array(
			'Authorization' => self::ab_auth(),
			'Accept'        => 'application/json',
		);
		$deadline     = microtime( true ) + 55; // 55-second wall-clock cap; stays under typical 60s shared-hosting limit even if set_time_limit() was ignored
		for ( $i = 0; $i < 20; $i++ ) {
			if ( microtime( true ) >= $deadline ) {
				break;
			}
			sleep( 2 ); // phpcs:ignore WordPress.WP.AlternativeFunctions.sleep_sleep
			$poll = wp_remote_get(
				'https://secure.actblue.com/api/v1/csvs/' . rawurlencode( (string) $csv_id ),
				array(
					'headers' => $poll_hdrs,
					'timeout' => 10,
				)
			);
			if ( is_wp_error( $poll ) ) {
				continue;
			}
			$data = json_decode( wp_remote_retrieve_body( $poll ), true );
			if ( ! empty( $data['download_url'] ) ) {
				$download_url = $data['download_url'];
				break;
			}
		}
		if ( ! $download_url ) {
			return new WP_Error( 'timeout', 'CSV not ready — try again in a moment.', array( 'status' => 504 ) );
		}

		// ── Step 3: Download CSV ──────────────────────────────────────────────
		$dl = wp_safe_remote_get( $download_url, array( 'timeout' => 60 ) ); // Refuses private and internal addresses.
		if ( is_wp_error( $dl ) ) {
			return new WP_Error( 'download_failed', $dl->get_error_message(), array( 'status' => 500 ) );
		}
		$csv_body = wp_remote_retrieve_body( $dl );
		if ( empty( $csv_body ) ) {
			return new WP_Error( 'empty_csv', 'Downloaded CSV was empty.', array( 'status' => 500 ) );
		}

		// ── Step 4: Parse CSV ─────────────────────────────────────────────────
		$csv_rows = LSFH_Csv::parse_csv( $csv_body );
		if ( count( $csv_rows ) < 2 ) {
			return rest_ensure_response(
				array(
					'imported' => 0,
					'skipped'  => 0,
				)
			);
		}

		$headers    = array_map( 'trim', array_shift( $csv_rows ) );
		$imported   = 0;
		$duplicates = 0;
		$pending    = 0;
		$failed     = 0;
		$failures   = array();
		$bank_refs  = array();
		$disb_seen  = array();
		$no_period  = 0;
		$gifts      = array();
		$filled     = array(
			'phone' => 0,
			'email' => 0,
		);
		global $wpdb;

		foreach ( $csv_rows as $row ) {
			$c = fn( ...$names ) => self::ab_col( $row, $headers, $names );

			// ActBlue disbursement CSV uses "Receipt ID" as the unique contribution identifier.
			$ab_id   = $c( 'Receipt ID', 'Order Number', 'order_number' );
			$disb_id = $c( 'Disbursement ID', 'disbursement_id' );
			if ( ! $ab_id ) {
				++$pending;
				continue; }  // Malformed row
			if ( ! $disb_id ) {
				++$pending;
				continue; }  // Not yet disbursed to bank
			$disb_seen[ (string) $disb_id ] = true;

			// Dates include time component ("2026-05-11 09:03:11") — ab_date strips it.
			$contrib_date = self::ab_date( $c( 'Date', 'Receipt Date', 'receipt_date' ) );
			$disb_date    = self::ab_date( $c( 'Disbursement Date', 'Date Received', 'disbursement_date', 'date_received' ) );
			$pay_date     = self::ab_date( $c( 'Payment Date', 'payment_date' ) );

			// Filter by disbursement date BEFORE dedup check so that rows from the
			// wider API window that fall outside the user's chosen range are silently
			// skipped — they should not appear in any counter (not duplicates, not pending).
			if ( $disb_date && ( $disb_date < $date_from || $disb_date > $date_to ) ) {
				continue;
			}

			// ActBlue's "Check Number" is the direct deposit number. Captured before the
			// duplicate check so a re-sync also fills it in on already-imported payouts.
			$deposit_no = sanitize_text_field( $c( 'Check Number', 'check_number' ) );
			if ( '' !== $deposit_no ) {
				$bank_refs[ $disb_id ] = $deposit_no;
			}

			// Dedup: actblue_id + contribution_date — recurring donors reuse the same
			// Receipt ID every month, so actblue_id alone would falsely flag later
			// installments as duplicates of the first. Using the date as a tiebreaker
			// matches the logic already used in the manual CSV import path.
			// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$dup = $contrib_date
				? $wpdb->get_row(
					$wpdb->prepare(
						"SELECT id, phone, email FROM {$wpdb->prefix}lsfh_donations WHERE actblue_id=%s AND contribution_date=%s LIMIT 1",
						$ab_id,
						$contrib_date
					)
				)
				: $wpdb->get_row(
					$wpdb->prepare(
						"SELECT id, phone, email FROM {$wpdb->prefix}lsfh_donations WHERE actblue_id=%s LIMIT 1",
						$ab_id
					)
				);
			// phpcs:enable
			if ( $dup ) {
				++$duplicates;
				// Already saved: leave it as it is, except a blank phone or email the file can fill in.
				$got              = LSFH_Donor_Contact::fill(
					$dup->id,
					$dup->phone,
					$dup->email,
					LSFH_Donor_Contact::clean_phone( $c( 'Donor Phone', 'Phone', 'phone' ) ),
					LSFH_Donor_Contact::clean_email( $c( 'Donor Email', 'Email', 'email' ) )
				);
				$filled['phone'] += $got['phone'];
				$filled['email'] += $got['email'];
				continue;
			}

			$gross = (float) preg_replace( '/[^0-9.\-]/', '', $c( 'Amount', 'amount' ) );
			$fee   = (float) preg_replace( '/[^0-9.\-]/', '', $c( 'Fee', 'fee' ) );
			// ActBlue disbursement CSVs have no Net column — derive it.
			$net_r = $c( 'Net', 'net' );
			$net   = '' !== $net_r ? (float) preg_replace( '/[^0-9.\-]/', '', $net_r ) : round( $gross - $fee, 2 );

			$zip_raw = $c( 'Donor ZIP', 'ZIP', 'Zip', 'zip', 'postal_code' );

			// Recurring: "Recurring Total Months" is non-empty for recurring donations.
			$rec_raw   = $c( 'Recurring Total Months', 'Recurring', 'recurring', 'Is Recurring' );
			$recurring = ( '' !== $rec_raw && 'f' !== strtolower( $rec_raw ) && '0' !== $rec_raw ) ? 1 : 0;

			$row_election = $election ?: LSFH_Periods::period_election_for_date( $contrib_date );

			$d        = array(
				'source'            => 'actblue',
				'actblue_id'        => sanitize_text_field( $ab_id ),
				'first_name'        => sanitize_text_field( $c( 'Donor First Name', 'First Name', 'firstname' ) ),
				'last_name'         => sanitize_text_field( $c( 'Donor Last Name', 'Last Name', 'lastname' ) ),
				'address'           => sanitize_text_field( $c( 'Donor Addr1', 'Billing Address 1', 'Address 1', 'address' ) ),
				'city'              => sanitize_text_field( $c( 'Donor City', 'City', 'city' ) ),
				'state'             => strtoupper( substr( sanitize_text_field( $c( 'Donor State', 'State', 'state' ) ), 0, 2 ) ),
				'zip'               => $zip_raw,
				'zip_formatted'     => LSFH_Csv::fmt_zip( $zip_raw ),
				'email'             => LSFH_Donor_Contact::clean_email( $c( 'Donor Email', 'Email', 'email' ) ),
				'phone'             => LSFH_Donor_Contact::clean_phone( $c( 'Donor Phone', 'Phone', 'phone' ) ),
				'occupation'        => sanitize_text_field( $c( 'Donor Occupation', 'Occupation', 'occupation' ) ),
				'employer'          => sanitize_text_field( $c( 'Donor Employer', 'Employer', 'employer' ) ),
				'disbursement_id'   => sanitize_text_field( $disb_id ),
				'disbursement_date' => $disb_date ?: null,
				'payment_date'      => $pay_date ?: $contrib_date ?: null,
				'contribution_date' => $contrib_date ?: null,
				'gross_amount'      => $gross,
				'actblue_fee'       => $fee,
				'net_amount'        => $net,
				'fundraising_page'  => sanitize_text_field( $c( 'Fundraising Page', 'fundraising_page' ) ),
				'reference_code'    => sanitize_text_field( $c( 'Reference Code', 'Reference Code 1', 'reference_code' ) ),
				'payment_type'      => 'actblue',
				'recurring'         => $recurring,
				'election_type'     => $row_election,
				'report_type'       => 'itemized',
				'reporting_status'  => 'pending',
				'created_at'        => current_time( 'mysql' ),
				'updated_at'        => current_time( 'mysql' ),
			);
			$inserted = $wpdb->insert( $wpdb->prefix . 'lsfh_donations', $d ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			if ( $inserted ) {
				++$imported;
				$gifts[] = $d;
				if ( '' === $row_election ) {
					++$no_period;
				}
			} else {
				// Row was counted as "would import" but the DB write failed (e.g. a bad
				// date value under strict SQL mode) — surface it instead of silently
				// reporting success with nothing actually saved.
				++$failed;
				error_log( sprintf( 'LSFH ActBlue sync: insert failed for actblue_id=%s disbursement_id=%s — %s', $ab_id, $disb_id, $wpdb->last_error ) ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
				// PHP's error_log() destination depends on the host, so the reasons are
				// also returned to the signed-in manager who ran the sync. Nothing is
				// written under wp-content, which is publicly reachable on most hosts.
				if ( count( $failures ) < 5 ) {
					$failures[] = array(
						'actblue_id' => $ab_id,
						'reason'     => $wpdb->last_error,
					);
				}
			}
		}

		if ( $imported > 0 ) {
			// Everything the ActBlue sync brings in is ActBlue's, so its payouts are named so (a payout that has a name keeps it).
			LSFH_Disbursements_Controller::sync_disbursements( LSFH_Payout_Processor::sync_request( LSFH_Payout_Processor::DEFAULTS['actblue'], array_keys( $disb_seen ) ) );
		}
		$bank_filled = LSFH_Disbursements_Controller::fill_bank_references( $bank_refs );

		return rest_ensure_response(
			array(
				'imported'         => $imported,
				'duplicates'       => $duplicates,
				'pending'          => $pending,
				'failed'           => $failed,
				'failures'         => $failures,
				'no_period'        => $no_period,
				'phones_added'     => $filled['phone'],
				'emails_added'     => $filled['email'],
				'bank_refs_filled' => $bank_filled,
				'over_limit'       => LSFH_Donor_Limits::over( array_filter( $gifts, static fn( $g ) => $g['gross_amount'] > 0 ) ),
			)
		);
	}
}
