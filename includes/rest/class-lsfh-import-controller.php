<?php
/**
 * CSV import routes for donations, expenditures and in-kind contributions.
 *
 * @package LeftStack_Financial_Hub
 */

defined( 'ABSPATH' ) || exit;

/**
 * CSV import routes for donations, expenditures and in-kind contributions.
 */
class LSFH_Import_Controller extends LSFH_REST_Base {

	/**
	 * Import in-kind contributions from rows mapped from a CSV file, skipping ones already saved.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function import_inkind( WP_REST_Request $req ) {
		global $wpdb;
		$p              = $req->get_json_params() ?? array();
		$rows           = (array) ( $p['rows'] ?? array() );
		$mapping        = (array) ( $p['mapping'] ?? array() );
		$default_period = ! empty( $p['default_period_id'] ) ? (int) $p['default_period_id'] : null;

		$imported   = 0;
		$skipped    = 0;
		$duplicates = 0;

		foreach ( $rows as $row ) {
			$get = fn( $f ) => isset( $mapping[ $f ] ) && isset( $row[ $mapping[ $f ] ] )
				? trim( $row[ $mapping[ $f ] ] ) : '';

			// Value — required.
			$value = (float) preg_replace( '/[^0-9.]/', '', $get( 'value' ) );
			if ( ! $value ) {
				++$skipped;
				continue;
			}

			// Normalise dates via strtotime.
			$donation_date   = null;
			$fec_report_date = null;
			$raw             = sanitize_text_field( $get( 'donation_date' ) );
			if ( $raw ) {
				$ts = strtotime( $raw );
				if ( $ts ) {
					$donation_date = gmdate( 'Y-m-d', $ts );
				}
			}
			$raw = sanitize_text_field( $get( 'fec_report_date' ) );
			if ( $raw ) {
				$ts = strtotime( $raw );
				if ( $ts ) {
					$fec_report_date = gmdate( 'Y-m-d', $ts );
				}
			}

			$donor_name = sanitize_text_field( $get( 'donor_name' ) );

			// Dedup: skip if same date + donor + value already exists.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$exists = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT id FROM {$wpdb->prefix}lsfh_inkind WHERE donation_date = %s AND LOWER(TRIM(donor_name)) = LOWER(TRIM(%s)) AND ROUND(value,2) = ROUND(%f,2) LIMIT 1",
					$donation_date,
					$donor_name,
					$value
				)
			);
			if ( $exists ) {
				++$duplicates;
				continue;
			}

			$d  = array(
				'donation_date'    => $donation_date,
				'donor_name'       => $donor_name,
				'address'          => sanitize_text_field( $get( 'address' ) ),
				'occupation'       => sanitize_text_field( $get( 'occupation' ) ),
				'employer'         => sanitize_text_field( $get( 'employer' ) ),
				'description'      => sanitize_textarea_field( $get( 'description' ) ),
				'value'            => $value,
				'fec_report_date'  => $fec_report_date,
				'notes'            => sanitize_textarea_field( $get( 'notes' ) ),
				'filing_period_id' => $default_period ?? LSFH_Periods::period_for_date( $donation_date ?? '' ),
				'created_at'       => current_time( 'mysql' ),
				'updated_at'       => current_time( 'mysql' ),
			);
			$ok = $wpdb->insert( $wpdb->prefix . 'lsfh_inkind', $d ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			if ( $ok ) {
				++$imported;
			} else {
				++$skipped;
			}
		}

		return rest_ensure_response(
			array(
				'imported'   => $imported,
				'skipped'    => $skipped,
				'duplicates' => $duplicates,
			)
		);
	}

	/**
	 * Import donations from rows mapped from a CSV file.
	 *
	 * Donations already saved are updated; new ones are added.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function import_donations( WP_REST_Request $req ) {
		global $wpdb;
		$p                = $req->get_json_params() ?? array();
		$rows             = (array) ( $p['rows'] ?? array() );
		$mapping          = (array) ( $p['mapping'] ?? array() );
		$default_election = strtolower( sanitize_text_field( $p['default_election'] ?? '' ) );
		// Supplied by the importer when it recognised the file as a known
		// third-party export. Beats inference, which cannot tell a Democracy
		// Engine transaction id from an ActBlue receipt id and defaults to
		// ActBlue for both.
		$default_source = sanitize_text_field( $p['default_source'] ?? '' );
		$processor      = sanitize_text_field( $p['processor'] ?? '' );
		// Used only where a row has no disbursement date of its own. One file is
		// one payout, so this is the natural place to supply a date the provider
		// left out rather than correcting rows afterwards.
		$default_disb_date = '';
		if ( ! empty( $p['default_disbursement_date'] ) ) {
			$ts                = strtotime( sanitize_text_field( $p['default_disbursement_date'] ) );
			$default_disb_date = $ts ? gmdate( 'Y-m-d', $ts ) : '';
		}
		$default_period = ! empty( $p['default_period_id'] ) ? (int) $p['default_period_id'] : null;

		$imported       = 0;
		$updated        = 0;
		$skipped_amount = 0;
		$skipped_dup    = 0;
		$errors         = array();
		$no_period      = 0;

		$disbursement_ids_seen = array();
		$bank_refs             = array();
		$filled                = array(
			'phone' => 0,
			'email' => 0,
		);

		foreach ( $rows as $i => $row ) {
			$get   = fn( $f )=>isset( $mapping[ $f ] ) && isset( $row[ $mapping[ $f ] ] ) ? trim( $row[ $mapping[ $f ] ] ) : '';
			$gross = (float) preg_replace( '/[^0-9.\-]/', '', $get( 'gross_amount' ) ); // allow leading minus for refunds.
			if ( ! $gross ) {
				++$skipped_amount;
				continue;}

			$zip_raw = $get( 'zip' );
			$zip_fmt = LSFH_Csv::fmt_zip( $zip_raw );
			$fee_raw = $get( 'actblue_fee' );
			// Detect accounting-notation negatives like (0.99) before stripping non-numeric chars.
			$fee_negative = ( strpos( $fee_raw, '(' ) !== false ) || ( strpos( $fee_raw, '-' ) !== false );
			$fee_abs      = round( (float) preg_replace( '/[^0-9\.]/', '', $fee_raw ), 2 );
			// If gross is negative (refund) the fee must also be negative — matches sign regardless
			// of whether the CSV used "(0.99)" accounting notation or "-0.99" or plain "0.99".
			$fee     = ( $gross < 0 || $fee_negative ) ? -$fee_abs : $fee_abs;
			$ab_id   = sanitize_text_field( $get( 'actblue_id' ) );
			$disb_id = sanitize_text_field( $get( 'disbursement_id' ) );
			// The file's check number is the direct deposit number for its payout.
			$deposit_no = sanitize_text_field( $get( 'check_number' ) );
			if ( $disb_id && '' !== $deposit_no ) {
				$bank_refs[ $disb_id ] = $deposit_no;
			}
			$contrib_date_raw = sanitize_text_field( $get( 'contribution_date' ) );

			// Normalize contribution_date to YYYY-MM-DD regardless of CSV format (handles
			// "01/15/2024", "2024-01-15 14:23:45", ISO strings, etc.).
			$dedup_date = '';
			if ( $contrib_date_raw ) {
				$ts         = strtotime( $contrib_date_raw );
				$dedup_date = $ts ? gmdate( 'Y-m-d', $ts ) : substr( $contrib_date_raw, 0, 10 );
			}

			// Normalize disbursement_date the same way — prevents MySQL 0000-00-00 for
			// non-standard date formats (e.g., MM/DD/YYYY from Stripe or other platforms).
			$disb_date_raw = sanitize_text_field( $get( 'disbursement_date' ) );
			$disb_date     = '';
			if ( $disb_date_raw ) {
				$ts        = strtotime( $disb_date_raw );
				$disb_date = $ts ? gmdate( 'Y-m-d', $ts ) : substr( $disb_date_raw, 0, 10 );
			}
			if ( ! $disb_date ) {
				$disb_date = $default_disb_date;
			}

			// ── Dedup path A: actblue_id present ─────────────────────────────
			// Uses actblue_id + date (date needed for recurring donors who reuse Receipt IDs).
			if ( $ab_id ) {
				// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
				$exists = $dedup_date
					? $wpdb->get_row(
						$wpdb->prepare(
							"SELECT id, phone, email FROM {$wpdb->prefix}lsfh_donations WHERE actblue_id=%s AND contribution_date=%s LIMIT 1",
							$ab_id,
							$dedup_date
						)
					)
					: $wpdb->get_row(
						$wpdb->prepare(
							"SELECT id, phone, email FROM {$wpdb->prefix}lsfh_donations WHERE actblue_id=%s LIMIT 1",
							$ab_id
						)
					);
				// phpcs:enable
				if ( $exists ) {
					// Always update donor profile fields + disbursement fields on re-import. Phone and email are the
					// exception: they are only filled in where blank (below), never replaced and never cleared.
					$upsert = array(
						'first_name'    => sanitize_text_field( $get( 'first_name' ) ),
						'last_name'     => sanitize_text_field( $get( 'last_name' ) ),
						'address'       => sanitize_text_field( $get( 'address' ) ),
						'city'          => sanitize_text_field( $get( 'city' ) ),
						'state'         => strtoupper( substr( sanitize_text_field( $get( 'state' ) ), 0, 2 ) ),
						'zip'           => sanitize_text_field( $zip_raw ),
						'zip_formatted' => $zip_fmt,
						'occupation'    => sanitize_text_field( $get( 'occupation' ) ),
						'employer'      => sanitize_text_field( $get( 'employer' ) ),
						'payment_date'  => sanitize_text_field( $get( 'payment_date' ) ) ?: null,
						'updated_at'    => current_time( 'mysql' ),
					);
					// Only overwrite fundraising_page / reference_code when the new value is non-empty,
					// so a re-import that doesn't map these fields won't wipe existing data.
					$new_fp = sanitize_text_field( $get( 'fundraising_page' ) );
					$new_rc = sanitize_text_field( $get( 'reference_code' ) );
					if ( $new_fp ) {
						$upsert['fundraising_page'] = $new_fp;
					}
					if ( $new_rc ) {
						$upsert['reference_code'] = $new_rc;
					}
					if ( $disb_id ) {
						$upsert['disbursement_id']         = $disb_id;
						$upsert['disbursement_date']       = $disb_date ?: null;
						$disbursement_ids_seen[ $disb_id ] = true;
					}
					// Backfill / correct the processing fee on re-import, but only when the CSV
					// actually provides a fee value for this row — so a re-import that doesn't map
					// the fee column won't wipe an existing fee to zero. Net is recomputed from the
					// row's gross (same transaction, so gross matches the stored value).
					if ( '' !== $fee_raw ) {
						$upsert['actblue_fee'] = $fee;
						$upsert['net_amount']  = round( $gross - $fee, 2 );
					}
					// Correct the source label for Stripe-processed donations on re-import — fixes
					// rows an earlier import mis-tagged as ActBlue. pi_/po_ prefixes are Stripe-only,
					// so there is no risk of relabeling genuine ActBlue rows. (Stripe is the processor;
					// the committee/org name — e.g. "Oath" — is not used as the source.).
					if ( strpos( $ab_id, 'pi_' ) === 0 || strpos( $disb_id, 'po_' ) === 0 ) {
						$upsert['source'] = 'stripe';
					}
					$wpdb->update( $wpdb->prefix . 'lsfh_donations', $upsert, array( 'id' => $exists->id ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
					$got              = LSFH_Donor_Contact::fill(
						$exists->id,
						$exists->phone,
						$exists->email,
						LSFH_Donor_Contact::clean_phone( $get( 'donor_phone' ) ),
						LSFH_Donor_Contact::clean_email( $get( 'donor_email' ) )
					);
					$filled['phone'] += $got['phone'];
					$filled['email'] += $got['email'];
					++$updated;
					continue;
				}
			}

			// ── Dedup path B: no actblue_id — match on name + date + amount ─────
			// Prevents duplicate rows when re-importing manual/check/cash CSVs.
			if ( ! $ab_id && $dedup_date ) {
				$fn = sanitize_text_field( $get( 'first_name' ) );
				$ln = sanitize_text_field( $get( 'last_name' ) );
				if ( $fn || $ln ) {
					// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
					$dup = (int) $wpdb->get_var(
						$wpdb->prepare(
							"SELECT id FROM {$wpdb->prefix}lsfh_donations
                         WHERE actblue_id IS NULL AND first_name=%s AND last_name=%s
                           AND contribution_date=%s AND gross_amount=%s LIMIT 1",
							$fn,
							$ln,
							$dedup_date,
							$gross
						)
					);
					if ( $dup ) {
						++$skipped_dup;
						continue;
					}
				}
			}

			// Election: the file's own column wins, then an election the caller forced,
			// then the filing period the contribution date falls in.
			$row_election = strtolower( sanitize_text_field( $get( 'election_type' ) ) ) ?: ( $default_election ?: LSFH_Periods::period_election_for_date( $dedup_date ) );

			// Infer source when the CSV has no explicit source column:
			// - Stripe-style IDs (charge pi_*, payout po_*) => stripe (the processor; works for
			// ANY committee using a Stripe payout export, regardless of org name)
			// - any other receipt / disbursement id => ActBlue
			// - otherwise => manual.
			$src = sanitize_text_field( $get( 'source' ) );
			if ( ! $src ) {
				$src = $default_source;
			}
			if ( ! $src ) {
				if ( strpos( $ab_id, 'pi_' ) === 0 || strpos( $disb_id, 'po_' ) === 0 ) {
					$src = 'stripe';
				} else {
					$src = ( $ab_id || $disb_id ) ? 'actblue' : 'manual';
				}
			}

			// Organisations. Every imported row used to be written as an
			// individual, so an organisation's contribution was exported with
			// CONTRIBUTORTYPE = I and, because the PAC rule only looks at
			// organisations, a PAC was never skipped from the individual
			// schedule. Democracy Engine states this outright in two columns.
			// The TN export reads an organisation's name out of first_name
			// (it becomes LNAME, with FNAME left blank), so an org name is
			// stored there and last_name is cleared.
			$org_flag = strtolower( trim( $get( 'donor_type' ) ) );
			$org_name = sanitize_text_field( $get( 'org_name' ) );
			$is_org   = ( '' !== $org_name )
				|| in_array( $org_flag, array( 'yes', 'y', 'true', '1', 'organization', 'org' ), true );

			$d  = array(
				'source'            => $src,
				'actblue_id'        => $ab_id ?: null,
				'first_name'        => $is_org && $org_name ? $org_name : sanitize_text_field( $get( 'first_name' ) ),
				'last_name'         => $is_org && $org_name ? '' : sanitize_text_field( $get( 'last_name' ) ),
				'address'           => sanitize_text_field( $get( 'address' ) ),
				'city'              => sanitize_text_field( $get( 'city' ) ),
				'state'             => strtoupper( substr( sanitize_text_field( $get( 'state' ) ), 0, 2 ) ),
				'zip'               => sanitize_text_field( $zip_raw ),
				'zip_formatted'     => $zip_fmt,
				'occupation'        => sanitize_text_field( $get( 'occupation' ) ),
				'employer'          => sanitize_text_field( $get( 'employer' ) ),
				'disbursement_id'   => $disb_id ?: null,
				'disbursement_date' => $disb_date ?: null,
				'payment_date'      => sanitize_text_field( $get( 'payment_date' ) ) ?: null,
				'fundraising_page'  => sanitize_text_field( $get( 'fundraising_page' ) ) ?: null,
				'reference_code'    => sanitize_text_field( $get( 'reference_code' ) ) ?: null,
				'phone'             => LSFH_Donor_Contact::clean_phone( $get( 'donor_phone' ) ),
				'email'             => LSFH_Donor_Contact::clean_email( $get( 'donor_email' ) ),
				'donor_type'        => $is_org ? 'organization' : 'individual',
				'contribution_date' => $dedup_date ?: null,
				'date_deposited'    => sanitize_text_field( $get( 'date_deposited' ) ) ?: null,
				'gross_amount'      => $gross,
				'actblue_fee'       => $fee,
				'net_amount'        => round( $gross - $fee, 2 ),
				// Only an ActBlue row defaults to an ActBlue payment type. This
				// hardcoded 'actblue' for every import, so Stripe payout files —
				// which carry no payment_type column — stamped 690 card
				// donations as ActBlue while the same import correctly set
				// source='stripe'. The field was recording the shape of the CSV
				// rather than how anyone paid. For a processor donation the
				// instrument genuinely is not known, so 'other' is the honest
				// value. Lowercased because some Stripe files supply "Other",
				// whose capital O misses the label map.
				'payment_type'      => strtolower( sanitize_text_field( $get( 'payment_type' ) ) ) ?: ( 'actblue' === $src ? 'actblue' : 'other' ),
				'check_number'      => sanitize_text_field( $get( 'check_number' ) ),
				'recurring'         => (int) ( strtolower( $get( 'recurring' ) ) === 'y' || $get( 'recurring' ) === '1' || ( is_numeric( $get( 'recurring' ) ) && (float) $get( 'recurring' ) > 0 ) ),
				'election_type'     => $row_election,
				'report_type'       => 'itemized',
				'reporting_status'  => strtolower( sanitize_text_field( $get( 'reporting_status' ) ?: 'pending' ) ),
				'notes'             => sanitize_textarea_field( $get( 'notes' ) ),
				'filing_period_id'  => $default_period,
				'created_at'        => current_time( 'mysql' ),
				'updated_at'        => current_time( 'mysql' ),
			);
			$ok = $wpdb->insert( $wpdb->prefix . 'lsfh_donations', $d ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			if ( $ok ) {
				++$imported;
				if ( '' === $row_election ) {
					++$no_period;
				}
				if ( $disb_id ) {
					$disbursement_ids_seen[ $disb_id ] = true;
				}
			} else {
				$errors[] = 'Row ' . ( $i + 2 ) . ': DB insert error — ' . $wpdb->last_error;
			}
		}

		// Auto-sync disbursements ledger for any disbursement_ids touched by this import.
		$bank_filled = 0;
		if ( ! empty( $disbursement_ids_seen ) ) {
			LSFH_Disbursements_Controller::sync_disbursements( LSFH_Payout_Processor::sync_request( $processor, array_keys( $disbursement_ids_seen ) ) );
			$bank_filled = LSFH_Disbursements_Controller::fill_bank_references( $bank_refs );
		}

		return rest_ensure_response(
			array(
				'imported'         => $imported,
				'updated'          => $updated,
				'skipped'          => $skipped_dup + $skipped_amount,
				'skipped_dup'      => $skipped_dup,
				'skipped_amount'   => $skipped_amount,
				'no_period'        => $no_period,
				'phones_added'     => $filled['phone'],
				'emails_added'     => $filled['email'],
				'bank_refs_filled' => $bank_filled,
				'errors'           => array_slice( $errors, 0, 50 ),
			)
		);
	}

	/**
	 * Import expenditures from rows mapped from a CSV file, skipping ones already saved.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WP_REST_Response
	 */
	public static function import_expenditures( WP_REST_Request $req ) {
		global $wpdb;
		$p              = $req->get_json_params() ?? array();
		$rows           = (array) ( $p['rows'] ?? array() );
		$mapping        = (array) ( $p['mapping'] ?? array() );
		$default_period = ! empty( $p['default_period_id'] ) ? (int) $p['default_period_id'] : null;

		// Pre-load category name → id map (case-insensitive).
		$cat_rows = $wpdb->get_results( "SELECT id, name FROM {$wpdb->prefix}lsfh_budget_categories", ARRAY_A ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$cat_map  = array();
		foreach ( $cat_rows as $c ) {
			$cat_map[ strtolower( trim( $c['name'] ) ) ] = (int) $c['id'];
		}

		// Payment method aliases → canonical slug.
		$method_aliases = array(
			'check'         => 'check',
			'debit'         => 'debit',
			'debit card'    => 'debit',
			'credit'        => 'credit',
			'credit card'   => 'credit',
			'cash'          => 'cash',
			'ach'           => 'ach',
			'transfer'      => 'transfer',
			'bank transfer' => 'transfer',
			'wire transfer' => 'wire',
			'wire'          => 'wire',
			'fee'           => 'fee',
			'other'         => 'other',
			'business card' => 'other',
			'campaign card' => 'other',
		);

		$imported   = 0;
		$skipped    = 0;
		$duplicates = 0;

		foreach ( $rows as $row ) {
			$get = fn( $f ) => isset( $mapping[ $f ] ) && isset( $row[ $mapping[ $f ] ] )
				? trim( $row[ $mapping[ $f ] ] ) : '';

			// Amount — required.
			$amount = (float) preg_replace( '/[^0-9.]/', '', $get( 'amount' ) );
			if ( ! $amount ) {
				++$skipped;
				continue;
			}

			// Date — normalise to Y-m-d via strtotime.
			$raw_date     = sanitize_text_field( $get( 'expense_date' ) );
			$expense_date = null;
			if ( $raw_date ) {
				$ts = strtotime( $raw_date );
				if ( $ts ) {
					$expense_date = gmdate( 'Y-m-d', $ts );
				}
			}

			// Dedup: skip if identical date + payee + amount already exists.
			$dup_payee = sanitize_text_field( $get( 'payee' ) );
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			$exists = $wpdb->get_var(
				$wpdb->prepare(
					"SELECT id FROM {$wpdb->prefix}lsfh_expenditures WHERE expense_date = %s AND LOWER(TRIM(payee)) = LOWER(TRIM(%s)) AND ROUND(amount,2) = ROUND(%f,2) LIMIT 1",
					$expense_date,
					$dup_payee,
					$amount
				)
			);
			if ( $exists ) {
				++$duplicates;
				continue;
			}

			// Category lookup by name.
			$cat_key = strtolower( trim( $get( 'category_name' ) ) );
			$cat_id  = ( $cat_key && isset( $cat_map[ $cat_key ] ) ) ? $cat_map[ $cat_key ] : null;

			// Payment method normalisation.
			$raw_method = strtolower( trim( $get( 'payment_method' ) ) );
			$method     = $method_aliases[ $raw_method ] ?? ( $raw_method ?: 'check' );

			// Balanced: accept Y / Yes / true / 1.
			$bal_raw  = strtolower( trim( $get( 'balanced' ) ) );
			$balanced = in_array( $bal_raw, array( 'y', 'yes', 'true', '1' ), true ) ? 1 : 0;

			$d  = array(
				'expense_date'     => $expense_date,
				'payee'            => sanitize_text_field( $get( 'payee' ) ),
				'address'          => sanitize_text_field( $get( 'address' ) ),
				'category_id'      => $cat_id,
				'description'      => sanitize_textarea_field( $get( 'description' ) ),
				'amount'           => $amount,
				'payment_method'   => sanitize_text_field( $method ),
				'check_number'     => sanitize_text_field( $get( 'check_number' ) ),
				'balanced'         => $balanced,
				'paid_by'          => sanitize_text_field( $get( 'paid_by' ) ),
				'notes'            => sanitize_textarea_field( $get( 'notes' ) ),
				'filing_period_id' => $default_period ?? LSFH_Periods::period_for_date( $expense_date ?? '' ),
				'created_at'       => current_time( 'mysql' ),
				'updated_at'       => current_time( 'mysql' ),
			);
			$ok = $wpdb->insert( $wpdb->prefix . 'lsfh_expenditures', $d ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
			if ( $ok ) {
				++$imported;
			} else {
				++$skipped;
			}
		}

		return rest_ensure_response(
			array(
				'imported'   => $imported,
				'skipped'    => $skipped,
				'duplicates' => $duplicates,
			)
		);
	}
}
