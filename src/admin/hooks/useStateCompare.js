import { useState } from '@wordpress/element';
import { apiSend } from '../components/shared';
import {
	readStateFile,
	guessColumns,
	toStateRows,
} from '../components/Donations/stateCompareFile';

/**
 * The comparison of a filing period with the list the state shows: read the file, choose the columns, ask the server.
 *
 * @param {number|string} periodId The filing period to compare.
 * @return {Object} file (headers and rows), cols, setCol, onFile, compare, result, skipped, loading, error, reset.
 */
export function useStateCompare( periodId ) {
	const [ file, setFile ] = useState( null );
	const [ cols, setCols ] = useState( {} );
	const [ result, setResult ] = useState( null );
	const [ skipped, setSkipped ] = useState( 0 );
	const [ loading, setLoading ] = useState( false );
	const [ error, setError ] = useState( '' );

	const reset = () => {
		setFile( null );
		setResult( null );
		setError( '' );
	};

	const onFile = ( e ) => {
		const f = e.target.files?.[ 0 ];
		if ( ! f ) {
			return;
		}
		setResult( null );
		setError( '' );
		const reader = new window.FileReader();
		reader.onload = ( ev ) => {
			const parsed = readStateFile( String( ev.target.result ) );
			if ( ! parsed.headers.length || ! parsed.rows.length ) {
				setFile( null );
				setError(
					'That file has no rows. Save the state’s list as CSV and try again.'
				);
				return;
			}
			setFile( parsed );
			setCols( guessColumns( parsed.headers ) );
		};
		reader.readAsText( f );
	};

	const compare = async () => {
		const read = toStateRows( file.rows, cols );
		setSkipped( read.skipped );
		setLoading( true );
		setError( '' );
		try {
			const r = await apiSend( 'POST', '/filing-check/compare', {
				filing_period_id: parseInt( periodId, 10 ),
				rows: read.rows,
			} );
			const d = await r.json();
			if ( 'matched' in d ) {
				setResult( d );
			} else {
				setError( d.message || 'The comparison failed.' );
			}
		} catch {
			setError( 'Network error.' );
		}
		setLoading( false );
	};

	return {
		file,
		cols,
		setCol: ( key, value ) =>
			setCols( ( c ) => ( { ...c, [ key ]: value } ) ),
		onFile,
		compare,
		result,
		skipped,
		loading,
		error,
		reset,
	};
}
