/**
 * The filing period that covers a date. When several do, the most specific one wins: the shortest,
 * then the one that starts latest, then the newest. This is the same rule LSFH_Periods applies on
 * the server, so a form and a sync always agree.
 *
 * @param {Array}  periods Filing periods from /filing-periods.
 * @param {string} date    A date, YYYY-MM-DD (a longer timestamp is cut to its day).
 * @return {Object|null} The period, or null when none covers the date.
 */
export function periodForDate( periods, date ) {
	const day = String( date || '' ).slice( 0, 10 );
	if ( ! day ) {
		return null;
	}
	const span = ( p ) => Date.parse( p.end_date ) - Date.parse( p.start_date );
	const covering = ( periods || [] ).filter(
		( p ) => day >= p.start_date && day <= p.end_date
	);
	covering.sort(
		( a, b ) =>
			span( a ) - span( b ) ||
			b.start_date.localeCompare( a.start_date ) ||
			b.id - a.id
	);
	return covering[ 0 ] || null;
}
