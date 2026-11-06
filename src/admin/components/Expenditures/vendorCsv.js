const HEADER = [
	'Vendor',
	'Kind',
	'Month or reference code',
	'Spent',
	'Raised',
	'Refunds',
	'Fees',
	'Gifts',
	'Cost per $1 raised',
];

/**
 * One cell of a CSV line: quoted when it holds a comma, quote or line break.
 *
 * @param {*} value The cell's value.
 * @return {string} The cell as CSV text.
 */
const cell = ( value ) => {
	const text = String( value ?? '' );
	return /[",\n]/.test( text ) ? `"${ text.replace( /"/g, '""' ) }"` : text;
};

/**
 * The vendor report as CSV text: for each group a total row, a row per month and a row per send (reference code).
 *
 * @param {Object[]} groups The groups from the vendor report.
 * @return {string} The CSV text, header first.
 */
export function vendorReportCsv( groups ) {
	const lines = [ HEADER ];
	groups.forEach( ( g ) => {
		const row = ( kind, label, r, cost ) => [
			g.name,
			kind,
			label,
			r.spend ?? '',
			r.raised,
			r.refunds,
			r.fees,
			r.gifts,
			cost ?? '',
		];
		lines.push(
			row( 'Total', '', g.totals, g.totals.cost_per_dollar ),
			...g.months.map( ( m ) =>
				row( 'Month', m.month, m, m.cost_per_dollar )
			),
			...g.sends.map( ( s ) => row( 'Send', s.reference_code, s ) )
		);
	} );
	return lines.map( ( l ) => l.map( cell ).join( ',' ) ).join( '\n' ) + '\n';
}
