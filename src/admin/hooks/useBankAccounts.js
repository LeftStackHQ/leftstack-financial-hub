import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { apiGet, apiSend, readJson } from '../components/shared';

/**
 * The bank accounts of the tie-out screen, and which one is showing.
 *
 * @return {Object} accounts, the chosen account (or null), loading, an error message, select(id),
 *                  addAccount(label) and saveFormat(id, format), which return the saved account (or null on failure).
 */
export function useBankAccounts() {
	const [ accounts, setAccounts ] = useState( [] );
	const [ selectedId, setSelectedId ] = useState( 0 );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( '' );

	useEffect( () => {
		let current = true;
		apiGet( '/bank/accounts' )
			.then( readJson )
			.then( ( list ) => {
				if ( ! current ) {
					return;
				}
				const rows = Array.isArray( list ) ? list : [];
				setAccounts( rows );
				setSelectedId( ( id ) => id || rows[ 0 ]?.id || 0 );
				setLoading( false );
			} )
			.catch( () => {
				if ( current ) {
					setError(
						__(
							'The bank accounts could not be loaded.',
							'leftstack-financial-hub'
						)
					);
					setLoading( false );
				}
			} );
		return () => {
			current = false;
		};
	}, [] );

	const addAccount = useCallback( async ( label ) => {
		setError( '' );
		const response = await apiSend( 'POST', '/bank/accounts', { label } );
		const body = await response.json();
		if ( ! response.ok ) {
			setError( body.message || '' );
			return null;
		}
		setAccounts( ( list ) => [ ...list, body ] );
		setSelectedId( body.id );
		return body;
	}, [] );

	const saveFormat = useCallback( async ( id, format ) => {
		setError( '' );
		const response = await apiSend( 'PUT', `/bank/accounts/${ id }`, {
			format,
		} );
		const body = await response.json();
		if ( ! response.ok ) {
			setError( body.message || '' );
			return null;
		}
		setAccounts( ( list ) =>
			list.map( ( a ) => ( a.id === id ? body : a ) )
		);
		return body;
	}, [] );

	return {
		accounts,
		account: accounts.find( ( a ) => a.id === selectedId ) || null,
		loading,
		error,
		select: setSelectedId,
		addAccount,
		saveFormat,
	};
}
