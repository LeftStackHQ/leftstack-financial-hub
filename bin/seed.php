<?php
/**
 * Synthetic test-data seeder for local development.
 *
 * Generates realistically SHAPED but entirely FAKE campaign finance data so
 * the admin UI can be tested at true scale — pagination, the sticky header,
 * frozen columns and the horizontal scroll region only behave meaningfully
 * with thousands of rows.
 *
 * Deliberately contains no real donor information. Never point this at a
 * production database, and never replace it with a copy of live data: those
 * records are real names, home addresses and employers.
 *
 * Usage (from the plugin folder, with wp-env running):
 *
 *   npm run seed              # 4,000 donations, 300 expenditures
 *   npm run seed -- 12000     # custom donation count
 *
 * Or directly:
 *   npx wp-env run cli --env-cwd=wp-content/plugins/<this folder's name> wp eval-file bin/seed.php 4000
 *
 * Re-running WIPES the plugin's tables first, so it is idempotent.
 *
 * @package LeftStack_Financial_Hub
 */

if ( ! defined( 'ABSPATH' ) ) {
	fwrite( STDERR, "Must be run through wp-cli (wp eval-file).\n" );
	exit( 1 );
}

global $wpdb;

// phpcs:disable WordPress.DB.PreparedSQL.NotPrepared -- dev-only seeder, values are generated locally.

$donation_count    = isset( $args[0] ) ? max( 1, (int) $args[0] ) : 4000;
$expenditure_count = isset( $args[1] ) ? max( 1, (int) $args[1] ) : 300;

$first_names = array(
	'Michael', 'Lawrence', 'Mark', 'Judy', 'Lucy', 'Patricia', 'Annie', 'Laura', 'James', 'Barbara',
	'Robert', 'Susan', 'David', 'Jessica', 'William', 'Sarah', 'Richard', 'Karen', 'Joseph', 'Nancy',
	'Thomas', 'Lisa', 'Charles', 'Betty', 'Daniel', 'Margaret', 'Matthew', 'Sandra', 'Anthony', 'Ashley',
	'Priya', 'Wei', 'Ahmed', 'Sofia', 'Diego', 'Yuki', 'Amara', 'Hassan', 'Ingrid', 'Mateo',
);
$last_names  = array(
	'Rose', 'Pius', 'Noller', 'Stevens', 'Rosa', 'Haynes', 'Turbin', 'Kaunas', 'Whitfield', 'Ableman',
	'Carrington', 'Delgado', 'Fairbanks', 'Grimaldi', 'Hollis', 'Ivarsson', 'Jessup', 'Kowalski',
	'Lindqvist', 'Mbeki', 'Nakamura', 'Oyelaran', 'Pemberton', 'Quintero', 'Rasmussen', 'Sandoval',
	'Thibodeaux', 'Ueda', 'Vasquez', 'Wachowski', 'Ximenes', 'Yarborough', 'Zabriskie', 'Ashford',
);
$cities = array(
	array( 'Nashville', 'TN', '37201' ), array( 'Memphis', 'TN', '38103' ),
	array( 'Knoxville', 'TN', '37902' ), array( 'Chattanooga', 'TN', '37402' ),
	array( 'Clarksville', 'TN', '37040' ), array( 'Murfreesboro', 'TN', '37130' ),
	array( 'Franklin', 'TN', '37064' ), array( 'Jackson', 'TN', '38301' ),
	array( 'Mt Juliet', 'TN', '37122' ), array( 'Ooltewah', 'TN', '37363' ),
	array( 'Atlanta', 'GA', '30303' ), array( 'Miami Beach', 'FL', '33139' ),
	array( 'Stuart', 'FL', '34994' ), array( 'Highland Park', 'IL', '60035' ),
	array( 'North Bangor', 'NY', '12966' ), array( 'Palmyra', 'TN', '37142' ),
);
$occupations = array(
	'Teacher', 'Engineer', 'Nurse', 'Attorney', 'Retired', 'Not Employed', 'Consultant',
	'Physician', 'Professor', 'Small Business Owner', 'Accountant', 'Social Worker',
	'Electrician', 'Pharmacist', 'Architect', 'Realtor', 'Librarian', 'Chef',
);
$employers = array(
	'Self-Employed', 'Retired', 'Not Employed', 'Metro Public Schools', 'Vanderbilt University',
	'HCA Healthcare', 'State of Tennessee', 'Nissan North America', 'Dollar General',
	'Bridgestone Americas', 'Community Health Systems', 'Tractor Supply Co',
);
$streets = array( 'Maple', 'Oak', 'Cedar', 'Elm', 'Pine', 'Walnut', 'Chestnut', 'Willow', 'Birch', 'Poplar' );
$suffix  = array( 'St', 'Ave', 'Rd', 'Dr', 'Ln', 'Ct', 'Blvd' );

// A handful of organisations, including PACs, so the state-export PAC
// filtering and donor_type handling have something to exercise.
$orgs = array(
	'Volunteer State PAC', 'Tennessee Educators PAC', 'Riverbend Solutions LLC',
	'Highland Consulting Group', 'Cumberland Labor PAC', 'Bluegrass Partners Inc',
);

$d_table = $wpdb->prefix . 'lsfh_donations';
$e_table = $wpdb->prefix . 'lsfh_expenditures';
$p_table = $wpdb->prefix . 'lsfh_filing_periods';
$c_table = $wpdb->prefix . 'lsfh_budget_categories';
$i_table = $wpdb->prefix . 'lsfh_inkind';
$b_table = $wpdb->prefix . 'lsfh_actblue_disbursements';

WP_CLI::log( 'Clearing existing plugin data…' );
foreach ( array( $d_table, $e_table, $p_table, $c_table, $i_table, $b_table ) as $t ) {
	$wpdb->query( "TRUNCATE TABLE {$t}" );
}


/* ── Plugin settings ─────────────────────────────────────────────── */
// Several features are gated on configuration rather than data, and stay
// invisible locally if these are unset — the "Export for State Filing"
// button only renders when a filing state is chosen, election-day
// projection needs an election date, and contribution-limit warnings need
// limits. Seeding data without seeding settings makes those features look
// broken or missing when they are simply unconfigured.
//
// Deliberately NOT set: the ActBlue credentials. Those are real secrets on
// production and a local install has no business holding any.
WP_CLI::log( 'Applying plugin settings…' );

$settings = array(
	'lsfh_campaign_name'        => 'Test Campaign (Local)',
	'lsfh_filing_state'         => 'tn',
	'lsfh_election_date'        => '2026-11-03',
	'lsfh_beginning_balance'    => '5000.00',
	'lsfh_campaign_goal'        => '750000',
	'lsfh_unitemized_threshold' => '100',
	'lsfh_near_limit_pct'       => '80',
	'lsfh_limit_primary'        => '1600',
	'lsfh_limit_general'        => '1600',
	'lsfh_limit_runoff'         => '1600',
	'lsfh_org_limit_primary'    => '12500',
	'lsfh_org_limit_general'    => '12500',
	'lsfh_org_limit_runoff'     => '12500',
	'lsfh_no_limit'             => '0',
	'lsfh_org_no_limit'         => '0',
);
foreach ( $settings as $key => $value ) {
	update_option( $key, $value );
}
WP_CLI::log( 'Settings applied: ' . count( $settings ) );

/* ── Filing periods ──────────────────────────────────────────────── */
$periods = array(
	array( 'Q1 2026', '2026-01-01', '2026-03-31' ),
	array( 'Q2 2026', '2026-04-01', '2026-06-30' ),
	array( 'Q3 2026', '2026-07-01', '2026-09-30' ),
	array( 'Q4 2026', '2026-10-01', '2026-12-31' ),
);
foreach ( $periods as $p ) {
	$wpdb->insert(
		$p_table,
		array( 'name' => $p[0], 'start_date' => $p[1], 'end_date' => $p[2] ),
		array( '%s', '%s', '%s' )
	);
}
$period_ids = $wpdb->get_col( "SELECT id FROM {$p_table} ORDER BY start_date" );
WP_CLI::log( 'Filing periods: ' . count( $period_ids ) );

/* ── Budget categories ───────────────────────────────────────────── */
$categories = array(
	array( 'Advertising', 15000 ), array( 'Staff & Payroll', 40000 ),
	array( 'Events', 8000 ), array( 'Printing & Mail', 12000 ),
	array( 'Travel', 5000 ), array( 'Office & Supplies', 3500 ),
	array( 'Consulting', 20000 ), array( 'Fundraising Costs', 6000 ),
);
foreach ( $categories as $c ) {
	$wpdb->insert(
		$c_table,
		array( 'name' => $c[0], 'budget_amount' => $c[1] ),
		array( '%s', '%f' )
	);
}
$cat_rows = $wpdb->get_results( "SELECT id, name FROM {$c_table}", ARRAY_A );
WP_CLI::log( 'Budget categories: ' . count( $cat_rows ) );

/**
 * Weighted small-dollar amount, which is what a real grassroots
 * contribution distribution actually looks like — mostly <$50 with a
 * thin tail up to the contribution limit.
 */
$pick_amount = static function () {
	$r = wp_rand( 1, 100 );
	if ( $r <= 55 ) {
		return wp_rand( 300, 5000 ) / 100;      // $3 – $50
	}
	if ( $r <= 85 ) {
		return wp_rand( 5000, 25000 ) / 100;    // $50 – $250
	}
	if ( $r <= 97 ) {
		return wp_rand( 25000, 100000 ) / 100;  // $250 – $1,000
	}
	return wp_rand( 100000, 160000 ) / 100;     // up to the limit
};

$period_for = static function ( $date ) use ( $periods, $period_ids ) {
	foreach ( $periods as $i => $p ) {
		if ( $date >= $p[1] && $date <= $p[2] ) {
			return $period_ids[ $i ];
		}
	}
	return null;
};

/* ── Donations ───────────────────────────────────────────────────── */
WP_CLI::log( "Generating {$donation_count} donations…" );

$sources     = array( 'actblue', 'actblue', 'actblue', 'manual', 'cash', 'check' );
$pages       = array( 'campaign-ads', 'campaign-website', 'grassroots-email', 'event-rsvp', null );
$disb_pool   = array();
for ( $i = 0; $i < 60; $i++ ) {
	$disb_pool[] = (string) ( 3100000 + wp_rand( 1000, 99999 ) );
}

$batch      = array();
$batch_size = 500;
$inserted   = 0;

for ( $i = 0; $i < $donation_count; $i++ ) {
	$is_org = ( 0 === wp_rand( 0, 40 ) );
	$loc    = $cities[ array_rand( $cities ) ];
	$date   = gmdate( 'Y-m-d', strtotime( '2026-01-01 +' . wp_rand( 0, 240 ) . ' days' ) );
	$gross  = $pick_amount();
	$source = $sources[ array_rand( $sources ) ];
	$fee    = 'actblue' === $source ? round( $gross * 0.0395, 2 ) : 0.00;

	if ( $is_org ) {
		// The TN export reads an organisation's name from first_name (it maps to
		// LNAME, with FNAME left blank), so the name must go there — not in
		// last_name. Putting it in the wrong column silently disables the
		// PAC-exclusion rule, since that check also reads first_name.
		$first = $orgs[ array_rand( $orgs ) ];
		$last  = '';
		$occ   = null;
		$emp   = null;
	} else {
		$first = $first_names[ array_rand( $first_names ) ];
		$last  = $last_names[ array_rand( $last_names ) ];
		$occ   = $occupations[ array_rand( $occupations ) ];
		$emp   = $employers[ array_rand( $employers ) ];
	}

	$batch[] = $wpdb->prepare(
		'(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%f,%f,%f,%s,%d,%d,%s,%s,%s,%s,%s,%s,%s)',
		$source,
		'actblue' === $source ? 'AB' . wp_rand( 100000, 999999 ) : null,
		$first,
		$last,
		wp_rand( 100, 9999 ) . ' ' . $streets[ array_rand( $streets ) ] . ' ' . $suffix[ array_rand( $suffix ) ],
		$loc[0],
		$loc[1],
		$loc[2],
		$loc[2],
		$occ,
		$emp,
		$date,
		$gross,
		$fee,
		round( $gross - $fee, 2 ),
		'actblue' === $source ? 'actblue' : $source,
		wp_rand( 0, 5 ) === 0 ? 1 : 0,
		wp_rand( 0, 3 ) === 0 ? 1 : 0,
		wp_rand( 0, 3 ) === 0 ? 'general' : 'primary',
		wp_rand( 0, 9 ) === 0 ? 'unitemized' : 'itemized',
		wp_rand( 0, 4 ) === 0 ? 'filed' : 'pending',
		'actblue' === $source ? $disb_pool[ array_rand( $disb_pool ) ] : null,
		$pages[ array_rand( $pages ) ],
		$is_org ? 'organization' : 'individual',
		$period_for( $date )
	);

	if ( count( $batch ) >= $batch_size ) {
		$wpdb->query(
			"INSERT INTO {$d_table}
			(source,actblue_id,first_name,last_name,address,city,state,zip,zip_formatted,
			 occupation,employer,contribution_date,gross_amount,actblue_fee,net_amount,
			 payment_type,recurring,balanced,election_type,report_type,reporting_status,
			 disbursement_id,fundraising_page,donor_type,filing_period_id)
			 VALUES " . implode( ',', $batch )
		);
		$inserted += count( $batch );
		$batch     = array();
		WP_CLI::log( "  {$inserted} / {$donation_count}" );
	}
}
if ( $batch ) {
	$wpdb->query(
		"INSERT INTO {$d_table}
		(source,actblue_id,first_name,last_name,address,city,state,zip,zip_formatted,
		 occupation,employer,contribution_date,gross_amount,actblue_fee,net_amount,
		 payment_type,recurring,balanced,election_type,report_type,reporting_status,
		 disbursement_id,fundraising_page,donor_type,filing_period_id)
		 VALUES " . implode( ',', $batch )
	);
	$inserted += count( $batch );
}
WP_CLI::log( "Donations inserted: {$inserted}" );

/* ── Expenditures ────────────────────────────────────────────────── */
WP_CLI::log( "Generating {$expenditure_count} expenditures…" );

$payees = array(
	'Volunteer Print Shop', 'Cumberland Media Buy', 'Riverfront Catering', 'Statewide Signs Co',
	'Delta Digital Ads', 'Music City Consulting', 'Southern Mailing Services', 'Hilltop Venue Rentals',
	'Peabody Office Supply', 'Gateway Travel', 'Harbor Data Services', 'First Ave Payroll',
);
$methods = array( 'check', 'card', 'ach', 'cash' );
$e_batch = array();
for ( $i = 0; $i < $expenditure_count; $i++ ) {
	$cat  = $cat_rows[ array_rand( $cat_rows ) ];
	$date = gmdate( 'Y-m-d', strtotime( '2026-01-01 +' . wp_rand( 0, 240 ) . ' days' ) );
	$e_batch[] = $wpdb->prepare(
		'(%s,%s,%f,%d,%s,%s,%d,%s)',
		$date,
		$payees[ array_rand( $payees ) ],
		wp_rand( 2500, 750000 ) / 100,
		(int) $cat['id'],
		'Operating expenditure — synthetic test record',
		$methods[ array_rand( $methods ) ],
		wp_rand( 0, 3 ) === 0 ? 1 : 0,
		$period_for( $date )
	);
}
$wpdb->query(
	"INSERT INTO {$e_table}
	(expense_date,payee,amount,category_id,description,payment_method,balanced,filing_period_id)
	 VALUES " . implode( ',', $e_batch )
);
WP_CLI::log( 'Expenditures inserted: ' . count( $e_batch ) );

/* ── In-kind contributions ───────────────────────────────────────── */
$inkind_count = isset( $args[2] ) ? max( 0, (int) $args[2] ) : 120;
WP_CLI::log( "Generating {$inkind_count} in-kind contributions…" );

$inkind_items = array(
	'Printing services for 5,000 door hangers', 'Catering for volunteer appreciation event',
	'Donated office space, one month', 'Graphic design for mailer',
	'Sound system rental for town hall', 'Photography services at campaign launch',
	'Bulk yard sign printing', 'Web hosting, annual',
	'Donated laptop for field office', 'Van rental for canvass weekend',
	'Legal consultation, compliance review', 'Coffee and refreshments for phone bank',
);

$i_batch = array();
for ( $i = 0; $i < $inkind_count; $i++ ) {
	$is_org = ( 0 === wp_rand( 0, 3 ) );
	$date   = gmdate( 'Y-m-d', strtotime( '2026-01-01 +' . wp_rand( 0, 240 ) . ' days' ) );
	$name   = $is_org
		? $orgs[ array_rand( $orgs ) ]
		: $first_names[ array_rand( $first_names ) ] . ' ' . $last_names[ array_rand( $last_names ) ];
	$loc    = $cities[ array_rand( $cities ) ];

	$i_batch[] = $wpdb->prepare(
		'(%s,%s,%s,%s,%s,%s,%f,%s)',
		$date,
		$name,
		wp_rand( 100, 9999 ) . ' ' . $streets[ array_rand( $streets ) ] . ' ' . $suffix[ array_rand( $suffix ) ]
			. ', ' . $loc[0] . ', ' . $loc[1] . ' ' . $loc[2],
		$is_org ? null : $occupations[ array_rand( $occupations ) ],
		$is_org ? null : $employers[ array_rand( $employers ) ],
		$inkind_items[ array_rand( $inkind_items ) ],
		wp_rand( 5000, 350000 ) / 100,
		$period_for( $date )
	);
}
if ( $i_batch ) {
	$wpdb->query(
		"INSERT INTO {$i_table}
		(donation_date,donor_name,address,occupation,employer,description,value,filing_period_id)
		 VALUES " . implode( ',', $i_batch )
	);
}
WP_CLI::log( 'In-kind inserted: ' . count( $i_batch ) );


/* ── ActBlue disbursements ───────────────────────────────────────── */
// Derived from the donations just inserted, so each disbursement's counts and
// totals actually reconcile against its contributions — the Disbursements tab
// compares the two and would otherwise show every row as mismatched.
WP_CLI::log( 'Deriving ActBlue disbursements from seeded donations…' );

$groups = $wpdb->get_results(
	"SELECT disbursement_id,
	        COUNT(*)              AS n,
	        SUM(gross_amount)     AS gross,
	        SUM(actblue_fee)      AS fee,
	        SUM(net_amount)       AS net,
	        MAX(contribution_date) AS last_date
	   FROM {$d_table}
	  WHERE disbursement_id IS NOT NULL AND disbursement_id <> ''
	  GROUP BY disbursement_id",
	ARRAY_A
);

$b_batch = array();
foreach ( $groups as $g ) {
	// Settlement lands a couple of days after the last contribution.
	$disb_date = gmdate( 'Y-m-d', strtotime( $g['last_date'] . ' +2 days' ) );
	$recv      = gmdate( 'Y-m-d', strtotime( $g['last_date'] . ' +4 days' ) );
	$reconciled = wp_rand( 0, 2 ) > 0 ? 1 : 0;
	$b_batch[] = $wpdb->prepare(
		'(%s,%s,%d,%f,%f,%f,%s,%s,%d,%d,%s,%s)',
		$g['disbursement_id'],
		$disb_date,
		(int) $g['n'],
		(float) $g['gross'],
		(float) $g['fee'],
		(float) $g['net'],
		$reconciled ? $recv : null,
		$reconciled ? 'ACH' . wp_rand( 100000, 999999 ) : null,
		$reconciled,
		$reconciled && wp_rand( 0, 1 ) ? 1 : 0,
		wp_rand( 0, 3 ) === 0 ? 'general' : 'primary',
		$period_for( $disb_date )
	);
}
if ( $b_batch ) {
	$wpdb->query(
		"INSERT INTO {$b_table}
		(disbursement_id,disbursement_date,donation_count,gross_total,fee_total,
		 net_total,date_received,bank_reference,reconciled,filed,election_type,filing_period_id)
		 VALUES " . implode( ',', $b_batch )
	);
}
WP_CLI::log( 'Disbursements inserted: ' . count( $b_batch ) );

WP_CLI::success(
	sprintf(
		'Seeded %d donations, %d expenditures, %d in-kind and %d disbursements across %d filing periods. All data is synthetic.',
		$inserted,
		count( $e_batch ),
		count( $i_batch ),
		count( $b_batch ),
		count( $period_ids )
	)
);
