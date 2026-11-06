import { date as wpDate } from '@wordpress/date';

// ── Date utilities ────────────────────────────────────────────────────────────

export function monthRange( ym ) {
	if ( ! ym ) {
		return { from: '', to: '' };
	}
	const [ y, m ] = ym.split( '-' ).map( Number );
	const last = new Date( y, m, 0 ).getDate();
	return {
		from: `${ ym }-01`,
		to: `${ ym }-${ String( last ).padStart( 2, '0' ) }`,
	};
}

/**
 * "2026-08" → "Aug 2026". Used for the compact month grid; the applied
 * filter label keeps the long form so the toolbar button stays readable.
 *
 * @param {string} ym Month key in YYYY-MM form.
 * @return {string} Abbreviated month and year.
 */
export const monthLabelShort = ( ym ) => {
	const [ y, m ] = ym.split( '-' ).map( Number );
	return new Date( y, m - 1, 1 ).toLocaleDateString( 'en-US', {
		month: 'short',
		year: 'numeric',
	} );
};

export const monthLabel = ( ym ) => {
	const [ y, m ] = ym.split( '-' ).map( Number );
	return new Date( y, m - 1, 1 ).toLocaleDateString( 'en-US', {
		month: 'long',
		year: 'numeric',
	} );
};

/**
 * Today's date as YYYY-MM-DD in the site's time zone (Settings → General → Timezone).
 *
 * This is the same "today" the server uses (current_time()), so a new form never opens a
 * day ahead or behind it. A date made from the browser's UTC clock was wrong every evening
 * in the Americas.
 *
 * @return {string} Today, e.g. 2026-10-18.
 */
export const todayISO = () => wpDate( 'Y-m-d' );

/**
 * A calendar date as YYYY-MM-DD, from the parts the Date holds in its own time zone.
 *
 * @param {Date} d A date made with new Date( y, m, d ) or from dateFromISO().
 * @return {string} The same calendar day, e.g. 2026-10-18.
 */
export const isoDate = ( d ) =>
	`${ d.getFullYear() }-${ String( d.getMonth() + 1 ).padStart(
		2,
		'0'
	) }-${ String( d.getDate() ).padStart( 2, '0' ) }`;

/**
 * Midnight of a YYYY-MM-DD day as a Date, for working out weeks, months and day offsets.
 *
 * @param {string} iso A date such as 2026-10-18.
 * @return {Date} That day at 00:00 in the browser's time zone.
 */
export const dateFromISO = ( iso ) => {
	const [ y, m, d ] = iso.split( '-' ).map( Number );
	return new Date( y, m - 1, d );
};

export const DATE_PRESETS = [
	{ key: 'this_week', label: 'This week' },
	{ key: 'last_7d', label: 'Last 7 days' },
	{ key: 'this_month', label: 'This month' },
	{ key: 'last_month', label: 'Last month' },
	{ key: 'last_30d', label: 'Last 30 days' },
	{ key: 'ytd', label: 'Year to date' },
];

export function presetRange( key ) {
	const today = todayISO();
	const now = dateFromISO( today );
	const iso = isoDate;
	if ( key === 'this_week' ) {
		const d = new Date( now );
		d.setDate( now.getDate() - ( ( now.getDay() + 6 ) % 7 ) );
		return { from: iso( d ), to: today };
	}
	if ( key === 'last_7d' ) {
		const d = new Date( now );
		d.setDate( now.getDate() - 6 );
		return { from: iso( d ), to: today };
	}
	if ( key === 'this_month' ) {
		const y = now.getFullYear();
		const mo = now.getMonth();
		return {
			from: `${ y }-${ String( mo + 1 ).padStart( 2, '0' ) }-01`,
			to: today,
		};
	}
	if ( key === 'last_month' ) {
		const y = now.getFullYear();
		const mo = now.getMonth();
		const f = new Date( y, mo - 1, 1 ),
			t = new Date( y, mo, 0 );
		return { from: iso( f ), to: iso( t ) };
	}
	if ( key === 'last_30d' ) {
		const d = new Date( now );
		d.setDate( now.getDate() - 29 );
		return { from: iso( d ), to: today };
	}
	if ( key === 'ytd' ) {
		return { from: `${ now.getFullYear() }-01-01`, to: today };
	}
	return null;
}
