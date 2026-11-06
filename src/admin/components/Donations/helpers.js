import { SOURCE_LABELS } from './constants';

export const renderSortArrow = ( isActive, dir ) => {
	if ( ! isActive ) {
		return <span style={ { opacity: 0.3 } }>↕</span>;
	}
	return dir === 'asc' ? '↑' : '↓';
};

export const fundraisingLabel = ( v ) => {
	const m = v?.match( /secure\.actblue\.com\/page\/([^/?#]+)/ );
	return m ? m[ 1 ] : v;
};

// Shared by StateExportModal's buildParams and the main component's
// buildFilterParams so the two export paths can't silently drift on which
// filters they honor — add a new filter here once, not in two places.
export function buildDonationFilterParams( filters ) {
	const params = new URLSearchParams();
	if ( filters.search ) {
		params.set( 'search', filters.search );
	}
	if ( filters.fElec ) {
		params.set( 'election_type', filters.fElec );
	}
	if ( filters.fReport ) {
		params.set( 'report_type', filters.fReport );
	}
	if ( filters.fStatus ) {
		params.set( 'reporting_status', filters.fStatus );
	}
	if ( filters.fSource ) {
		params.set( 'source', filters.fSource );
	}
	if ( filters.fPeriod ) {
		params.set( 'filing_period_id', filters.fPeriod );
	}
	if ( filters.fState ) {
		params.set( 'state', filters.fState );
	}
	if ( filters.fCity ) {
		params.set( 'city', filters.fCity );
	}
	if ( filters.fZip ) {
		params.set( 'zip', filters.fZip );
	}
	if ( filters.fAmountMin ) {
		params.set( 'amount_min', filters.fAmountMin );
	}
	if ( filters.fAmountMax ) {
		params.set( 'amount_max', filters.fAmountMax );
	}
	if ( filters.fDateFrom ) {
		params.set( 'date_from', filters.fDateFrom );
	}
	if ( filters.fDateTo ) {
		params.set( 'date_to', filters.fDateTo );
	}
	if ( filters.fDisbId ) {
		params.set( 'disbursement_id', filters.fDisbId );
	}
	if ( filters.fHasRefund ) {
		params.set( 'has_refund', '1' );
	}
	if ( filters.fPage ) {
		params.set( 'fundraising_page', filters.fPage );
	}
	return params;
}

/**
 * Display name for a stored donation source ('manual' shows as Other).
 *
 * @param {string} s The stored source value.
 * @return {string} The label to show.
 */
export const srcLabel = ( s ) =>
	SOURCE_LABELS[ s ] ||
	( s ? s.charAt( 0 ).toUpperCase() + s.slice( 1 ) : s );
