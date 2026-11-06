// Reads CSV text into { headers, rows }, handling quoted cells (including line breaks and doubled quotes). A tab-separated
// file is read by passing a tab as the delimiter.
export function parseCSV( text, delimiter = ',' ) {
	const allRows = [];
	let i = 0;
	const n = text.length;
	while ( i < n ) {
		const row = [];
		// eslint-disable-next-line no-constant-condition
		while ( true ) {
			let cell = '';
			if ( i < n && text[ i ] === '"' ) {
				i++;
				while ( i < n ) {
					if ( text[ i ] === '"' ) {
						if ( text[ i + 1 ] === '"' ) {
							cell += '"';
							i += 2;
						} else {
							i++;
							break;
						}
					} else {
						cell += text[ i++ ];
					}
				}
			} else {
				while (
					i < n &&
					text[ i ] !== delimiter &&
					text[ i ] !== '\r' &&
					text[ i ] !== '\n'
				) {
					cell += text[ i++ ];
				}
			}
			row.push( cell.trim() );
			if ( i < n && text[ i ] === delimiter ) {
				i++;
				continue;
			}
			if ( i < n && text[ i ] === '\r' ) {
				i++;
			}
			if ( i < n && text[ i ] === '\n' ) {
				i++;
			}
			break;
		}
		allRows.push( row );
	}
	let hi = 0;
	while ( hi < allRows.length && allRows[ hi ].every( ( c ) => ! c ) ) {
		hi++;
	}
	if ( hi >= allRows.length ) {
		return { headers: [], rows: [] };
	}
	const headers = allRows[ hi ];
	const rows = allRows
		.slice( hi + 1 )
		.filter( ( r ) => r.some( ( c ) => c ) )
		.map( ( r ) => {
			const obj = {};
			headers.forEach( ( h, idx ) => {
				obj[ h ] = r[ idx ] ?? '';
			} );
			return obj;
		} );
	return { headers, rows };
}
