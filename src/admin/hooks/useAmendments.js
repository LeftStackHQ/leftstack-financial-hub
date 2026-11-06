import { useState, useEffect, useCallback } from '@wordpress/element';
import { apiGet, apiSend } from '../components/shared';
import { useLatestRequest } from './useLatestRequest';

/**
 * The refunds that still have to be reported to a period that was already filed, grouped by the period they amend,
 * and the action that marks some of them reported.
 *
 * @param {number} version Change it to load the list again (for example after a refund was edited).
 * @return {Object} result, error, markReported( ids ).
 */
export function useAmendments( version ) {
	const [ result, setResult ] = useState( null );
	const [ error, setError ] = useState( '' );
	const begin = useLatestRequest();

	const reload = useCallback( () => {
		const isStale = begin();
		apiGet( '/filing-check/amendments' )
			.then( ( r ) => r.json() )
			.then( ( d ) => {
				if ( isStale() ) {
					return;
				}
				if ( Array.isArray( d.periods ) ) {
					setResult( d );
					setError( '' );
				} else {
					setError( d.message || '' );
				}
			} )
			.catch( () => ! isStale() && setError( 'Network error.' ) );
	}, [ begin ] );

	useEffect( () => {
		reload();
	}, [ reload, version ] );

	// Marking a refund reported is the ordinary Filed status of the refund, set with the bulk action.
	const markReported = async ( ids ) => {
		await apiSend( 'POST', '/donations/bulk', { ids, action: 'filed' } );
		reload();
	};

	return { result, error, markReported };
}
