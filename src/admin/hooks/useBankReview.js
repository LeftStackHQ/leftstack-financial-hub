import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { apiGet, apiSend, readJson } from '../components/shared';
import { useLatestRequest } from './useLatestRequest';

const EMPTY = {
	matches: [],
	needs_you: [],
	todos: [],
	hub_open: [],
	skipped: [],
	bank: {},
	hub: {},
};

/**
 * The review of one bank account: what the matcher suggests, what needs a person, and what is still open.
 *
 * @param {number} accountId The bank account.
 * @return {Object} review (matches, needs_you, hub_open, skipped, bank and hub by id), loading, error, reload(),
 *                  confirm(groups), which saves groups of matches (marking them balanced) and reloads, resolving to an error
 *                  message or '', and fillDates with setFillDates, whether blank dates are filled from the bank.
 */
export function useBankReview( accountId ) {
	const [ review, setReview ] = useState( EMPTY );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( '' );
	const [ version, setVersion ] = useState( 0 );
	const [ fillDates, setFillDates ] = useState( true );
	const begin = useLatestRequest();

	useEffect( () => {
		const isStale = begin();
		setLoading( true );
		apiGet( `/bank/accounts/${ accountId }/review` )
			.then( readJson )
			.then( ( data ) => {
				if ( isStale() ) {
					return;
				}
				setReview( { ...EMPTY, ...data } );
				setError( '' );
				setLoading( false );
			} )
			.catch( () => {
				if ( ! isStale() ) {
					setError(
						__(
							'The review could not be loaded.',
							'leftstack-financial-hub'
						)
					);
					setLoading( false );
				}
			} );
	}, [ accountId, version, begin ] );

	const reload = useCallback( () => setVersion( ( n ) => n + 1 ), [] );

	const confirm = useCallback(
		async ( groups ) => {
			const response = await apiSend(
				'POST',
				`/bank/accounts/${ accountId }/matches`,
				{ matches: groups, fill_dates: fillDates }
			);
			const body = await response.json();
			reload();
			return response.ok
				? ''
				: body.message ||
						__(
							'The matches could not be saved.',
							'leftstack-financial-hub'
						);
		},
		[ accountId, reload, fillDates ]
	);

	return { review, loading, error, reload, confirm, fillDates, setFillDates };
}
