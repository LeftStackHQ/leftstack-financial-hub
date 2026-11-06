import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { apiGet, apiSend, readJson } from '../components/shared';
import { useLatestRequest } from './useLatestRequest';

/**
 * The confirmed matches of a bank account, newest first, a page at a time, with the details of what each ties together.
 * They can be limited to money in or money out.
 *
 * @param {number}   accountId The bank account.
 * @param {Function} onChanged Called after a match was undone, so other lists can reload.
 * @return {Object} matches, bank and hub (details by id), page, pages, setPage(n), direction ('' for all, in or out)
 *                  and setDirection(value), which goes back to page 1, loading, error and undo(id), which
 *                  resolves to an error message or ''.
 */
export function useBankMatches( accountId, onChanged ) {
	const [ data, setData ] = useState( {
		data: [],
		bank: {},
		hub: {},
		pages: 1,
	} );
	const [ page, setPage ] = useState( 1 );
	const [ direction, setDirectionState ] = useState( '' );
	const [ version, setVersion ] = useState( 0 );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( '' );
	const begin = useLatestRequest();

	useEffect( () => {
		const isStale = begin();
		setLoading( true );
		apiGet( `/bank/accounts/${ accountId }/matches`, {
			page,
			per_page: 25,
			direction,
		} )
			.then( readJson )
			.then( ( body ) => {
				if ( isStale() ) {
					return;
				}
				setData( body );
				setError( '' );
				setLoading( false );
			} )
			.catch( () => {
				if ( ! isStale() ) {
					setError(
						__(
							'The matches could not be loaded.',
							'leftstack-financial-hub'
						)
					);
					setLoading( false );
				}
			} );
	}, [ accountId, page, direction, version, begin ] );

	const undo = useCallback(
		async ( id ) => {
			const response = await apiSend( 'DELETE', `/bank/matches/${ id }` );
			if ( ! response.ok ) {
				const body = await response.json();
				return (
					body.message ||
					__(
						'The match could not be undone.',
						'leftstack-financial-hub'
					)
				);
			}
			setVersion( ( n ) => n + 1 );
			onChanged();
			return '';
		},
		[ onChanged ]
	);

	const setDirection = useCallback( ( value ) => {
		setDirectionState( value );
		setPage( 1 );
	}, [] );

	return {
		...data,
		page,
		setPage,
		direction,
		setDirection,
		loading,
		error,
		undo,
	};
}
