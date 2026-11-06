import { CATEGORY_BADGE_COLORS, METHOD_LABEL } from './constants';

export const methodLabel = ( m ) =>
	METHOD_LABEL[ m ] || ( m ? m.charAt( 0 ).toUpperCase() + m.slice( 1 ) : m );

export function catColorIdx( name ) {
	let h = 0;
	for ( let i = 0; i < name.length; i++ ) {
		// >>> 0 keeps the hash an unsigned 32-bit integer so % below is never negative.
		// eslint-disable-next-line no-bitwise
		h = ( h * 31 + name.charCodeAt( i ) ) >>> 0;
	}
	return h % CATEGORY_BADGE_COLORS.length;
}

/**
 * The query parameters for the Expenditures list and its CSV export: the search and every
 * filter that is switched on.
 *
 * @param {Object} filters
 * @param {string} filters.search    Search text.
 * @param {string} filters.fCat      Category id.
 * @param {string} filters.fMethod   Payment method.
 * @param {string} filters.fStatus   scheduled, pending or posted.
 * @param {string} filters.fPeriod   Filing period id.
 * @param {string} filters.fDateFrom Start of the date range.
 * @param {string} filters.fDateTo   End of the date range.
 * @return {URLSearchParams} The parameters to add to a /expenditures or /export/expenditures request.
 */
export function buildExpenditureFilterParams( {
	search,
	fCat,
	fMethod,
	fStatus,
	fPeriod,
	fDateFrom,
	fDateTo,
} ) {
	const params = new URLSearchParams();
	if ( search ) {
		params.set( 'search', search );
	}
	if ( fCat ) {
		params.set( 'category_id', fCat );
	}
	if ( fMethod ) {
		params.set( 'payment_method', fMethod );
	}
	if ( fStatus ) {
		params.set( 'status', fStatus );
	}
	if ( fPeriod ) {
		params.set( 'filing_period_id', fPeriod );
	}
	if ( fDateFrom ) {
		params.set( 'date_from', fDateFrom );
	}
	if ( fDateTo ) {
		params.set( 'date_to', fDateTo );
	}
	return params;
}

// A Posted date makes a payment "posted". Without one it is "scheduled" while it is
// dated in the future, and "pending" after that. Worked out here so the badge flips
// as soon as a Posted date is added or cleared.
export const expenseStatus = ( e ) => {
	if ( e.date_posted && e.date_posted !== '0000-00-00' ) {
		return 'posted';
	}
	return e.is_future ? 'scheduled' : 'pending';
};
