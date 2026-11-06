import { useState, useMemo, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { parseCSV } from '../components/csv';
import { PROCESSORS } from '../components/BankTieOut/constants';
import { apiSend } from '../components/shared';
import {
	buildLines,
	guessLayout,
	layoutToMapping,
	mappingToLayout,
} from '../components/BankTieOut/bankFile';

/** The server takes at most this many lines in one request. */
const LINES_PER_REQUEST = 5000;

const namesToText = ( names ) => ( names || [] ).join( ', ' );
const textToNames = ( text ) =>
	text
		.split( ',' )
		.map( ( name ) => name.trim() )
		.filter( Boolean );

/**
 * Uploading a bank file: read it in the browser, check its layout against the statement's totals, then
 * save the layout and add the lines.
 *
 * @param {Object}   options
 * @param {Object}   options.account      The bank account the file is for.
 * @param {Function} options.saveFormat   Saves the account's format; resolves to the account or null.
 * @param {Function} [options.onUploaded] Called after lines were added.
 * @return {Object} step (file, layout or done), fileError, error, fileName, headers, layout, setLayoutField(name, value),
 *                  depositors (text by processor), setDepositors(processor, text), built (lines, problems, totals),
 *                  readFile(file), upload(), working, result and reset().
 */
export function useBankUpload( {
	account,
	saveFormat,
	onUploaded = () => {},
} ) {
	const [ step, setStep ] = useState( 'file' );
	const [ fileName, setFileName ] = useState( '' );
	const [ headers, setHeaders ] = useState( [] );
	const [ rows, setRows ] = useState( [] );
	const [ layout, setLayout ] = useState( null );
	const [ depositors, setDepositorsState ] = useState( {} );
	const [ fileError, setFileError ] = useState( '' );
	const [ error, setError ] = useState( '' );
	const [ working, setWorking ] = useState( false );
	const [ result, setResult ] = useState( null );

	const built = useMemo(
		() => ( layout ? buildLines( rows, layout ) : null ),
		[ rows, layout ]
	);

	const readFile = useCallback(
		( file ) => {
			const reader = new window.FileReader();
			reader.onload = ( event ) => {
				const text = String( event.target.result );
				const parsed = parseCSV( text );
				// Control characters or the replacement character mean the file is not text (an image, a spreadsheet).
				if (
					/[\u0000-\u0008\u000E-\u001F\uFFFD]/.test( text ) ||
					! parsed.headers.length ||
					! parsed.rows.length
				) {
					setFileError(
						__(
							'This file has no rows to read. Make sure it is a CSV with column names in the first row.',
							'leftstack-financial-hub'
						)
					);
					return;
				}
				const guess = guessLayout( parsed.headers, parsed.rows );
				const saved = account.format?.depositors || {};
				const names = {};
				PROCESSORS.forEach( ( key ) => {
					names[ key ] = namesToText(
						saved[ key ] ||
							( 'actblue' === key && ! Object.keys( saved ).length
								? [ 'ACTBLUE' ]
								: [] )
					);
				} );
				setHeaders( parsed.headers );
				setRows( parsed.rows );
				setLayout(
					mappingToLayout(
						account.format?.mapping || {},
						parsed.headers,
						guess
					)
				);
				setDepositorsState( names );
				setFileName( file.name );
				setFileError( '' );
				setStep( 'layout' );
			};
			reader.readAsText( file );
		},
		[ account ]
	);

	const setLayoutField = useCallback(
		( name, value ) =>
			setLayout( ( current ) => ( { ...current, [ name ]: value } ) ),
		[]
	);
	const setDepositors = useCallback(
		( processor, text ) =>
			setDepositorsState( ( current ) => ( {
				...current,
				[ processor ]: text,
			} ) ),
		[]
	);

	const upload = useCallback( async () => {
		setWorking( true );
		setError( '' );
		const names = {};
		PROCESSORS.forEach( ( key ) => {
			const list = textToNames( depositors[ key ] || '' );
			if ( list.length ) {
				names[ key ] = list;
			}
		} );
		const saved = await saveFormat( account.id, {
			mapping: layoutToMapping( layout ),
			depositors: names,
		} );
		if ( ! saved ) {
			setError(
				__(
					'The layout could not be saved.',
					'leftstack-financial-hub'
				)
			);
			setWorking( false );
			return;
		}
		let added = 0;
		let duplicates = 0;
		for ( let at = 0; at < built.lines.length; at += LINES_PER_REQUEST ) {
			const response = await apiSend(
				'POST',
				`/bank/accounts/${ account.id }/lines`,
				{
					lines: built.lines.slice( at, at + LINES_PER_REQUEST ),
				}
			);
			const body = await response.json();
			if ( ! response.ok ) {
				setError(
					body.message ||
						__(
							'The lines could not be added.',
							'leftstack-financial-hub'
						)
				);
				setWorking( false );
				return;
			}
			added += body.added;
			duplicates += body.duplicates;
		}
		setResult( { added, duplicates } );
		setStep( 'done' );
		setWorking( false );
		onUploaded();
	}, [ account, depositors, layout, built, saveFormat, onUploaded ] );

	const reset = useCallback( () => {
		setStep( 'file' );
		setLayout( null );
		setRows( [] );
		setResult( null );
		setError( '' );
		setFileError( '' );
	}, [] );

	return {
		step,
		fileName,
		headers,
		layout,
		depositors,
		built,
		fileError,
		error,
		working,
		result,
		readFile,
		setLayoutField,
		setDepositors,
		upload,
		reset,
	};
}
