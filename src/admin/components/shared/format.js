// Format a number as US dollars with cents.
export const fmtC = ( n ) =>
	new Intl.NumberFormat( 'en-US', {
		style: 'currency',
		currency: 'USD',
	} ).format( n ?? 0 );

// A date such as Aug 12, with the year added when it is not this year.
export const fmtDate = ( d ) => {
	if ( ! d ) {
		return '—';
	}
	const dt = new Date( d + 'T00:00:00' );
	const opts = { month: 'short', day: 'numeric' };
	if ( dt.getFullYear() !== new Date().getFullYear() ) {
		opts.year = 'numeric';
	}
	return dt.toLocaleDateString( 'en-US', opts );
};
