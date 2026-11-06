import { DONATION_IMPORT_FIELDS, AUTO_MAP_HINTS } from './importFields';

// Known third-party exports. Auto-detection alone is fragile across 60–100
// column files where several columns are plausible matches for the same field,
// so a recognised file gets an explicit mapping instead of a guess. Keys are
// lowercased header names; they are resolved against the real headers on load.
const PROVIDER_PRESETS = [
	{
		id: 'actblue',
		label: 'ActBlue',
		source: 'actblue',
		signature: [ 'receipt id', 'disbursement id' ],
		map: {
			first_name: 'donor first name',
			last_name: 'donor last name',
			donor_email: 'donor email',
			donor_phone: 'donor phone',
			address: 'donor addr1',
			city: 'donor city',
			state: 'donor state',
			zip: 'donor zip',
			occupation: 'donor occupation',
			employer: 'donor employer',
			gross_amount: 'amount',
			contribution_date: 'date',
			actblue_fee: 'fee',
			actblue_id: 'receipt id',
			disbursement_id: 'disbursement id',
			disbursement_date: 'disbursement date',
			payment_date: 'payment date',
			recurring: 'recurrence number',
			notes: 'comments',
			fundraising_page: 'fundraising page',
			reference_code: 'reference code',
		},
	},
	{
		id: 'stripe',
		label: 'Stripe payout',
		source: 'stripe',
		// Oath.vote and anything else paying out through Stripe Connect.
		signature: [ 'payout_id', 'donation_amount', 'processing_fee' ],
		map: {
			first_name: 'donor_first_name',
			last_name: 'donor_last_name',
			address: 'address',
			city: 'city',
			state: 'state',
			zip: 'zip_code',
			occupation: 'occupation',
			employer: 'employer',
			gross_amount: 'donation_amount',
			contribution_date: 'transaction_date',
			actblue_fee: 'processing_fee',
			actblue_id: 'transaction_id',
			disbursement_id: 'payout_id',
			disbursement_date: 'payout_available_on',
			reference_code: 'original_source_code',
		},
	},
	{
		id: 'democracyengine',
		label: 'Democracy Engine',
		// Source records what the FILE is, not the rails underneath. Democracy
		// Engine settles through Stripe, but a DE report looks nothing like a
		// Stripe payout export — DE ships its own transmittal references and
		// L-prefixed receipt ids, so calling it 'stripe' would make it harder to
		// reconcile against the file actually downloaded. It also must not be a
		// source of its own: the filter offers five values and 'democracyengine'
		// was not one of them, so those rows could not be filtered at all.
		// 'manual' displays as "Other", which is honest and reachable.
		source: 'manual',
		signature: [ 'transmittal reference', 'donation guid' ],
		map: {
			first_name: 'donor first name',
			last_name: 'donor last name',
			donor_email: 'donor email',
			donor_phone: 'donor phone',
			address: 'donor addr1',
			city: 'donor city',
			state: 'donor state',
			zip: 'donor zip',
			occupation: 'donor occupation',
			employer: 'donor employer',
			donor_type: 'donor is an organization (not an individual)?',
			org_name:
				'donor organization name (only applicable to non-individual donations)',
			gross_amount: 'gross amount',
			contribution_date: 'donation date (et)',
			actblue_fee: 'convenience fee (if applicable)',
			actblue_id: 'transaction id',
			disbursement_id: 'transmittal reference',
			disbursement_date: 'transmittal payment posted on',
			reference_code: 'reference code',
		},
	},
];

/**
 * Match a file against a preset by requiring every signature header.
 *
 * @param {string[]} headers Header row from the uploaded CSV.
 * @return {Object|null} Matching preset, or null when nothing fits.
 */
export function detectProvider( headers ) {
	const n = headers.map( ( h ) => h.toLowerCase().trim() );
	return (
		PROVIDER_PRESETS.find( ( p ) =>
			p.signature.every( ( sig ) => n.includes( sig ) )
		) || null
	);
}

/**
 * Resolve a preset's lowercased column names back to the file's real headers.
 *
 * @param {Object}   preset  One entry from PROVIDER_PRESETS.
 * @param {string[]} headers Header row from the uploaded CSV.
 * @return {Object} Field-key to header-name mapping.
 */
export function applyPreset( preset, headers ) {
	const n = headers.map( ( h ) => h.toLowerCase().trim() );
	const m = {};
	Object.entries( preset.map ).forEach( ( [ field, col ] ) => {
		const i = n.indexOf( col );
		if ( i !== -1 ) {
			m[ field ] = headers[ i ];
		}
	} );
	return m;
}

/**
 * Guess a mapping by matching header names against the known synonyms.
 *
 * @param {string[]} headers Header row from the uploaded CSV.
 * @return {Object} Field-key to header-name mapping.
 */
export function autoDetect( headers ) {
	const m = {};
	const normalized = headers.map( ( h ) => h.toLowerCase().trim() );
	DONATION_IMPORT_FIELDS.forEach( ( { key } ) => {
		// Try patterns in order — first match wins, so more specific names take priority
		for ( const pat of AUTO_MAP_HINTS[ key ] || [] ) {
			const idx = normalized.indexOf( pat );
			if ( idx !== -1 ) {
				m[ key ] = headers[ idx ];
				break;
			}
		}
	} );
	return m;
}
