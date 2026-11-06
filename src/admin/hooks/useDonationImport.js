import { useState } from '@wordpress/element';
import { apiGet, apiSend } from '../components/shared';
import { parseCSV } from '../components/csv';
import {
	detectProvider,
	applyPreset,
	autoDetect,
} from '../components/Donations/importProviders';

/**
 * The state and actions behind the donations CSV import pop-up: the three steps (upload, map
 * columns, results), the parsed file, the column mapping, and the request that imports the rows.
 *
 * @param {Object}   options
 * @param {Function} options.onDone Called once when an import added at least one row.
 * @return {Object} The step, the file, the mapping and the actions that change them.
 */
export function useDonationImport( { onDone } ) {
	const [ step, setStep ] = useState( 1 );
	const [ headers, setHeaders ] = useState( [] );
	const [ rows, setRows ] = useState( [] );
	const [ mapping, setMapping ] = useState( {} );
	// Unset on purpose, like the sync dialog: this election is applied to every
	// row the import creates.
	const [ defDisbDate, setDefDisbDate ] = useState( '' );
	const [ importing, setImport ] = useState( false );
	const [ result, setResult ] = useState( null );
	const [ fileErr, setFileErr ] = useState( '' );
	const [ provider, setProvider ] = useState( null );
	// Who pays these payouts out; it names their fee expenses. Filled in from the kind of file once it is recognised.
	const [ processor, setProcessor ] = useState( '' );
	// Set only when the user states the file genuinely has no deposit columns.
	const [ noDeposit, setNoDeposit ] = useState( false );

	const disbDateCol = mapping.disbursement_date;
	const fileHasDisbDate =
		!! disbDateCol &&
		rows.some(
			( r ) => ( r[ disbDateCol ] ?? '' ).toString().trim() !== ''
		);

	const onFile = ( e ) => {
		const file = e.target.files?.[ 0 ];
		if ( ! file ) {
			return;
		}
		setFileErr( '' );
		const reader = new window.FileReader();
		reader.onload = ( ev ) => {
			const { headers: h, rows: r } = parseCSV( ev.target.result );
			if ( ! h.length ) {
				setFileErr(
					'Could not parse CSV — make sure it has a header row.'
				);
				return;
			}
			if ( ! r.length ) {
				setFileErr( 'The file has a header row but no data rows.' );
				return;
			}
			const hit = detectProvider( h );
			setHeaders( h );
			setRows( r );
			setProvider( hit );
			setProcessor( '' );
			if ( hit ) {
				apiGet( '/disbursements/processors' )
					.then( ( res ) => res.json() )
					.then( ( names ) =>
						setProcessor( names[ hit.source ] || '' )
					)
					.catch( () => {} );
			}
			// A recognised export gets its known mapping; anything else falls
			// back to name matching, which the user then corrects by hand.
			setMapping( hit ? applyPreset( hit, h ) : autoDetect( h ) );
			setNoDeposit( false );
			setStep( 2 );
		};
		reader.readAsText( file );
	};

	const doImport = async () => {
		setImport( true );
		try {
			const r = await apiSend( 'POST', `/import/donations`, {
				rows,
				mapping,
				default_source: provider?.source || '',
				processor: processor.trim(),
				default_disbursement_date: fileHasDisbDate ? '' : defDisbDate,
			} );
			const d = await r.json();
			setResult( d );
			if ( d.imported > 0 ) {
				onDone();
			}
			setStep( 3 );
		} catch {
			setResult( {
				imported: 0,
				skipped: rows.length,
				errors: [ 'Network error.' ],
			} );
			setStep( 3 );
		}
		setImport( false );
	};

	return {
		step,
		setStep,
		headers,
		rows,
		mapping,
		setMapping,
		defDisbDate,
		setDefDisbDate,
		importing,
		result,
		fileErr,
		provider,
		processor,
		setProcessor,
		noDeposit,
		setNoDeposit,
		disbDateCol,
		fileHasDisbDate,
		onFile,
		doImport,
	};
}
