// Reads the rows of a bank's CSV file into bank lines, using a "layout" that says which column holds what.
// Pure functions with no React and no network, so they can be tested on their own. The bank file is read in
// the browser; only the lines this produces are sent to the server.
//
// A layout looks like:
//   dateColumn, dateFormat ('ymd' | 'mdy' | 'dmy'),
//   amountStyle ('signed' | 'two' | 'typed'), amountColumn, debitColumn, creditColumn, typeColumn,
//   descriptionColumns (array of column names, joined with a space),
//   checkSource ('none' | 'column' | 'description'), checkColumn.

const DATE_NAMES = [
	'date',
	'posting date',
	'post date',
	'transaction date',
	'posted date',
];
const AMOUNT_NAMES = [ 'amount', 'transaction amount' ];
const DEBIT_NAMES = [
	'debit',
	'debits',
	'withdrawal',
	'withdrawals',
	'money out',
];
const CREDIT_NAMES = [ 'credit', 'credits', 'deposit', 'deposits', 'money in' ];
const TYPE_NAMES = [ 'type', 'transaction type', 'debit/credit' ];
const DESCRIPTION_NAMES = [
	'description',
	'name',
	'payee',
	'details',
	'transaction description',
];
const CHECK_NAMES = [
	'check number',
	'check no',
	'check #',
	'check',
	'transaction',
	'serial',
];

const findColumn = ( headers, names ) =>
	headers.find( ( h ) => names.includes( h.toLowerCase().trim() ) ) || '';

/**
 * Whole cents from the way a bank writes an amount: "-1,234.56", "$1,234.56", "(1,234.56)", "1,234.56-".
 *
 * @param {string} text The cell.
 * @return {number|null} Cents, or null when the cell is not an amount.
 */
export function parseAmount( text ) {
	let t = String( text ?? '' ).replace( /[$,\s]/g, '' );
	let negative = false;
	if ( /^\(.*\)$/.test( t ) ) {
		negative = true;
		t = t.slice( 1, -1 );
	}
	if ( t.endsWith( '-' ) ) {
		negative = true;
		t = t.slice( 0, -1 );
	}
	if ( t.startsWith( '-' ) ) {
		negative = ! negative;
		t = t.slice( 1 );
	}
	if ( ! /^\d+(\.\d{1,2})?$/.test( t ) ) {
		return null;
	}
	const cents = Math.round( parseFloat( t ) * 100 );
	return negative ? -cents : cents;
}

/**
 * A date as Y-m-d, or null when the cell is not a real date in the given order.
 *
 * @param {string} text   The cell, with - / or . between the parts.
 * @param {string} format 'ymd', 'mdy' or 'dmy'.
 * @return {string|null} The date as YYYY-MM-DD.
 */
export function parseDate( text, format ) {
	const match = /^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})$/.exec(
		String( text ?? '' ).trim()
	);
	if ( ! match ) {
		return null;
	}
	const [ a, b, c ] = match.slice( 1 ).map( Number );
	let [ y, m, d ] = [ a, b, c ];
	if ( 'mdy' === format ) {
		[ m, d, y ] = [ a, b, c ];
	} else if ( 'dmy' === format ) {
		[ d, m, y ] = [ a, b, c ];
	}
	if ( y < 100 ) {
		y += 2000;
	}
	const real = new Date( Date.UTC( y, m - 1, d ) );
	if (
		real.getUTCFullYear() !== y ||
		real.getUTCMonth() !== m - 1 ||
		real.getUTCDate() !== d
	) {
		return null;
	}
	return real.toISOString().slice( 0, 10 );
}

/**
 * Which order the dates in a column are written in, judged from the cells.
 *
 * @param {string[]} samples Date cells.
 * @return {string} 'ymd', 'mdy' or 'dmy' (month first when the cells cannot tell).
 */
export function detectDateFormat( samples ) {
	const parts = samples
		.map( ( s ) =>
			/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})$/.exec( s.trim() )
		)
		.filter( Boolean );
	if ( parts.some( ( p ) => p[ 1 ].length === 4 ) ) {
		return 'ymd';
	}
	if ( parts.some( ( p ) => Number( p[ 1 ] ) > 12 ) ) {
		return 'dmy';
	}
	return 'mdy';
}

/**
 * A first guess at the layout from the file's column names and first rows.
 *
 * @param {string[]} headers Column names.
 * @param {Object[]} rows    Rows keyed by column name.
 * @return {Object} A layout (see the top of this file).
 */
export function guessLayout( headers, rows ) {
	const dateColumn = findColumn( headers, DATE_NAMES );
	const debitColumn = findColumn( headers, DEBIT_NAMES );
	const creditColumn = findColumn( headers, CREDIT_NAMES );
	const amountColumn = findColumn( headers, AMOUNT_NAMES );
	const typeColumn = findColumn( headers, TYPE_NAMES );
	const description = findColumn( headers, DESCRIPTION_NAMES );
	const checkColumn = findColumn( headers, CHECK_NAMES );
	let amountStyle = 'signed';
	if ( ! amountColumn && debitColumn && creditColumn ) {
		amountStyle = 'two';
	} else if ( typeColumn && amountColumn && ! checkColumn ) {
		amountStyle = 'typed';
	}
	return {
		dateColumn,
		dateFormat: detectDateFormat(
			rows.slice( 0, 50 ).map( ( r ) => r[ dateColumn ] ?? '' )
		),
		amountStyle,
		amountColumn,
		debitColumn,
		creditColumn,
		typeColumn,
		descriptionColumns: description ? [ description ] : [],
		checkSource: checkColumn ? 'column' : 'none',
		checkColumn,
	};
}

// A check number in the bank's check column or description: 3 to 6 digits.
const CHECK_IN_COLUMN = /^\d{3,6}$/;
const CHECK_IN_TEXT = /\bcheck\s*(?:no\.?|number|#)?\s*(\d{3,6})\b/i;

/**
 * Money in cents for one row, positive in and negative out, or null when the row has no readable amount.
 *
 * @param {Object} row    Row keyed by column name.
 * @param {Object} layout Layout.
 * @return {number|null} Cents.
 */
function rowCents( row, layout ) {
	if ( 'two' === layout.amountStyle ) {
		const out = parseAmount( row[ layout.debitColumn ] );
		const into = parseAmount( row[ layout.creditColumn ] );
		if ( null === out && null === into ) {
			return null;
		}
		return Math.abs( into ?? 0 ) - Math.abs( out ?? 0 );
	}
	const cents = parseAmount( row[ layout.amountColumn ] );
	if ( null === cents || 'typed' !== layout.amountStyle ) {
		return cents;
	}
	const kind = String( row[ layout.typeColumn ] ?? '' ).toLowerCase();
	return /debit|^dr\b|withdraw|payment|purchase/.test( kind )
		? -Math.abs( cents )
		: Math.abs( cents );
}

/**
 * The check number on a row under the layout, or an empty string.
 *
 * @param {Object} row         Row keyed by column name.
 * @param {Object} layout      Layout.
 * @param {string} description The row's description.
 * @return {string} The check number.
 */
function rowCheckNumber( row, layout, description ) {
	if ( 'column' === layout.checkSource ) {
		const cell = String( row[ layout.checkColumn ] ?? '' ).trim();
		return CHECK_IN_COLUMN.test( cell ) ? cell : '';
	}
	if ( 'description' === layout.checkSource ) {
		return CHECK_IN_TEXT.exec( description )?.[ 1 ] ?? '';
	}
	return '';
}

/**
 * Turn the rows of a bank file into lines, with the totals to compare against the bank's statement.
 *
 * Rows with neither a readable date nor a readable amount (blank lines, a "Total" footer) are skipped. A row
 * that has one but not the other is reported as a problem, because it usually means the layout is wrong.
 *
 * @param {Object[]} rows   Rows keyed by column name.
 * @param {Object}   layout Layout.
 * @return {{lines: Object[], problems: Object[], skipped: number, totals: Object}} The lines (date, amount in dollars as text, description, check_number), problem rows (row number and reason code: date or amount), the number of rows skipped, and totals (count, first, last, moneyIn, moneyOut in cents).
 */
export function buildLines( rows, layout ) {
	const lines = [];
	const problems = [];
	let skipped = 0;
	let moneyIn = 0;
	let moneyOut = 0;
	rows.forEach( ( row, index ) => {
		const dateText = String( row[ layout.dateColumn ] ?? '' ).trim();
		const cents = rowCents( row, layout );
		const date = parseDate( dateText, layout.dateFormat );
		if ( null === cents && ! date ) {
			skipped++;
			return;
		}
		if ( ! date ) {
			problems.push( { row: index + 1, reason: 'date' } );
			return;
		}
		if ( null === cents ) {
			problems.push( { row: index + 1, reason: 'amount' } );
			return;
		}
		const description = layout.descriptionColumns
			.map( ( c ) => String( row[ c ] ?? '' ).trim() )
			.filter( Boolean )
			.join( ' ' );
		lines.push( {
			date,
			amount: ( cents / 100 ).toFixed( 2 ),
			description,
			check_number: rowCheckNumber( row, layout, description ),
		} );
		if ( cents > 0 ) {
			moneyIn += cents;
		} else {
			moneyOut += cents;
		}
	} );
	const dates = lines.map( ( l ) => l.date ).sort();
	return {
		lines,
		problems,
		skipped,
		totals: {
			count: lines.length,
			first: dates[ 0 ] ?? '',
			last: dates[ dates.length - 1 ] ?? '',
			moneyIn,
			moneyOut,
		},
	};
}

const COLUMN_FIELDS = [
	[ 'dateColumn', 'date_column' ],
	[ 'amountColumn', 'amount_column' ],
	[ 'debitColumn', 'debit_column' ],
	[ 'creditColumn', 'credit_column' ],
	[ 'typeColumn', 'type_column' ],
	[ 'checkColumn', 'check_column' ],
];
const CHOICE_FIELDS = [
	[ 'dateFormat', 'date_format', [ 'ymd', 'mdy', 'dmy' ] ],
	[ 'amountStyle', 'amount_style', [ 'signed', 'two', 'typed' ] ],
	[ 'checkSource', 'check_source', [ 'none', 'column', 'description' ] ],
];

/**
 * A layout as the flat text settings the server stores with a bank account.
 *
 * @param {Object} layout Layout.
 * @return {Object} Setting name to text.
 */
export function layoutToMapping( layout ) {
	const mapping = {
		description_columns: layout.descriptionColumns.join( '|' ),
	};
	COLUMN_FIELDS.concat( CHOICE_FIELDS ).forEach( ( [ field, name ] ) => {
		mapping[ name ] = layout[ field ] ?? '';
	} );
	return mapping;
}

/**
 * The remembered layout for a new file: each saved setting is used when it still fits the file (the column
 * exists, the choice is a known one), and the first guess fills in the rest.
 *
 * @param {Object}   saved   Settings saved with the account (see layoutToMapping), possibly empty.
 * @param {string[]} headers The new file's column names.
 * @param {Object}   guess   guessLayout() for the new file.
 * @return {Object} Layout.
 */
export function mappingToLayout( saved, headers, guess ) {
	const layout = { ...guess };
	COLUMN_FIELDS.forEach( ( [ field, name ] ) => {
		if ( saved[ name ] && headers.includes( saved[ name ] ) ) {
			layout[ field ] = saved[ name ];
		}
	} );
	CHOICE_FIELDS.forEach( ( [ field, name, choices ] ) => {
		if ( choices.includes( saved[ name ] ) ) {
			layout[ field ] = saved[ name ];
		}
	} );
	const described = ( saved.description_columns || '' )
		.split( '|' )
		.filter( ( c ) => headers.includes( c ) );
	if ( described.length ) {
		layout.descriptionColumns = described;
	}
	return layout;
}
