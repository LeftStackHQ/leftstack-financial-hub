import { useState, useEffect, useCallback } from '@wordpress/element';
import { apiGet, apiSend } from '../components/shared';
import { useLatestRequest } from './useLatestRequest';

const PER_PAGE = 25;

/**
 * The pre-filing check for one filing period: the donors with something missing from the contributions a state
 * report would contain, and the best-efforts records that excuse a donor's occupation and employer.
 *
 * @param {number|string} periodId The filing period to check.
 * @return {Object} result, loading, error, page, setPage, reload, saveBestEfforts, removeBestEfforts.
 */
export function useFilingCheck( periodId ) {
	const [ result, setResult ] = useState( null );
	const [ loading, setLoading ] = useState( false );
	const [ error, setError ] = useState( '' );
	const [ page, setPage ] = useState( 1 );
	const begin = useLatestRequest();

	const reload = useCallback( () => {
		if ( ! periodId ) {
			setResult( null );
			return;
		}
		const isStale = begin();
		setLoading( true );
		setError( '' );
		const params = new URLSearchParams( {
			filing_period_id: periodId,
			page,
			per_page: PER_PAGE,
		} );
		apiGet( '/filing-check', `${ params }` )
			.then( ( r ) => r.json() )
			.then( ( d ) => {
				if ( isStale() ) {
					return;
				}
				if ( Array.isArray( d.donors ) ) {
					setResult( d );
				} else {
					setError( d.message || '' );
				}
				setLoading( false );
			} )
			.catch( () => {
				if ( ! isStale() ) {
					setError( 'Network error.' );
					setLoading( false );
				}
			} );
	}, [ begin, periodId, page ] );

	useEffect( () => {
		reload();
	}, [ reload ] );

	// A different period starts again at the first page.
	useEffect( () => {
		setPage( 1 );
	}, [ periodId ] );

	// Record that the campaign asked a donor, then look again.
	const saveBestEfforts = async ( donor, requestedOn, note ) => {
		const r = await apiSend( 'POST', '/filing-check/best-efforts', {
			first_name: donor.first_name,
			last_name: donor.last_name,
			requested_on: requestedOn,
			note,
		} );
		const d = await r.json();
		if ( ! d.id ) {
			return d.message || 'Could not save.';
		}
		reload();
		return '';
	};

	const removeBestEfforts = async ( id ) => {
		await apiSend( 'DELETE', `/filing-check/best-efforts/${ id }` );
		reload();
	};

	return {
		result,
		loading,
		error,
		page,
		setPage,
		reload,
		saveBestEfforts,
		removeBestEfforts,
	};
}
