import { parseCSV } from '../csv';

/** What the comparison needs from each row of the state's list, and the header patterns that find it. */
export const STATE_COLUMNS = [
	{
		key: 'name',
		label: 'Last name, or organization name',
		pattern:
			/last.?name|lname|surname|organi[sz]ation|contributor.?name|^name$/i,
	},
	{ key: 'first_name', label: 'First name', pattern: /first.?name|fname/i },
	{
		key: 'date',
		label: 'Date',
		pattern: /contribution.?date|receipt.?date|batch.?d|date/i,
	},
	{ key: 'amount', label: 'Amount', pattern: /amount|amt/i },
	{ key: 'zip', label: 'ZIP', pattern: /zip|postal/i },
	{
		key: 'address',
		label: 'Address (the ZIP is read from it when there is no ZIP column)',
		pattern: /address/i,
	},
];

/**
 * Read the state's list: comma or tab separated text (an Excel file is saved as CSV first).
 *
 * @param {string} text The file's text.
 * @return {{headers: string[], rows: Object[]}} The header row and the rows keyed by header.
 */
export function readStateFile( text ) {
	const clean = text.charCodeAt( 0 ) === 0xfeff ? text.slice( 1 ) : text;
	const first = clean.split( /\r?\n/, 1 )[ 0 ] || '';
	const tabs = ( first.match( /\t/g ) || [] ).length;
	const commas = ( first.match( /,/g ) || [] ).length;
	return parseCSV( clean, tabs > commas ? '\t' : ',' );
}

/**
 * Guess which header holds each needed value.
 *
 * @param {string[]} headers The header row.
 * @return {Object} For each key of STATE_COLUMNS, the header chosen, or ''.
 */
export function guessColumns( headers ) {
	const used = new Set();
	const out = {};
	STATE_COLUMNS.forEach( ( c ) => {
		const found = headers.find(
			( h ) => ! used.has( h ) && c.pattern.test( h )
		);
		out[ c.key ] = found || '';
		if ( found ) {
			used.add( found );
		}
	} );
	return out;
}

/**
 * A date as Y-m-d, from 2026-05-11 or 5/11/2026 or 5/11/26 (a time after it is ignored).
 *
 * @param {string} raw The date as written in the file.
 * @return {string} The date, or '' when it cannot be read.
 */
export function readDate( raw ) {
	const t = String( raw ).trim();
	let m = t.match( /^(\d{4})-(\d{1,2})-(\d{1,2})/ );
	let y;
	let mo;
	let d;
	if ( m ) {
		[ , y, mo, d ] = m;
	} else {
		m = t.match( /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/ );
		if ( ! m ) {
			return '';
		}
		[ , mo, d, y ] = m;
		if ( y.length === 2 ) {
			y = `20${ y }`;
		}
	}
	return `${ y }-${ String( mo ).padStart( 2, '0' ) }-${ String( d ).padStart(
		2,
		'0'
	) }`;
}

/**
 * The state's public list gives one name column ("LAST, FIRST M") and one address column that ends in the ZIP, so these
 * two read what a separate first name and ZIP column would otherwise give.
 *
 * @param {string} name  The name column.
 * @param {string} first The first name column, or '' when the file has none.
 * @return {{name: string, first_name: string}} The last name (or organization) and the first name.
 */
function splitName( name, first ) {
	const t = String( name ).trim();
	if ( first || ! t.includes( ',' ) ) {
		return { name: t, first_name: String( first ).trim() };
	}
	const at = t.indexOf( ',' );
	return {
		name: t.slice( 0, at ).trim(),
		// A trailing middle initial is dropped: the Hub keeps the first name alone.
		first_name: t
			.slice( at + 1 )
			.replace( /\s+[A-Za-z]\.?$/, '' )
			.trim(),
	};
}

/**
 * The ZIP at the end of an address like "501 N MAIN ST, DICKSON , TN, 37055-1234".
 *
 * @param {string} address The address text.
 * @return {string} The ZIP as written, or ''.
 */
function zipFromAddress( address ) {
	const m = String( address ).match( /(\d{5}(?:-\d{4})?)\s*$/ );
	return m ? m[ 1 ] : '';
}

/**
 * Turn the file's rows into the rows the server compares.
 *
 * @param {Object[]} rows The rows keyed by header.
 * @param {Object}   cols The header chosen for each key of STATE_COLUMNS.
 * @return {{rows: Object[], skipped: number}} The rows the server takes, and how many file rows had no readable date or amount.
 */
export function toStateRows( rows, cols ) {
	const out = [];
	let skipped = 0;
	rows.forEach( ( r ) => {
		const date = readDate( r[ cols.date ] ?? '' );
		const amount = parseFloat(
			String( r[ cols.amount ] ?? '' ).replace( /[^0-9.-]/g, '' )
		);
		if ( ! date || Number.isNaN( amount ) ) {
			skipped++;
			return;
		}
		const who = splitName(
			r[ cols.name ] ?? '',
			r[ cols.first_name ] ?? ''
		);
		const zip =
			String( r[ cols.zip ] ?? '' ).trim() ||
			zipFromAddress( r[ cols.address ] ?? '' );
		out.push( {
			name: who.name.slice( 0, 200 ),
			first_name: who.first_name.slice( 0, 200 ),
			date,
			amount,
			zip: zip.slice( 0, 20 ),
		} );
	} );
	return { rows: out, skipped };
}
