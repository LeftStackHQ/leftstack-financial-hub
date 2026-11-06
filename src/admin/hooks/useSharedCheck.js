import { useState, useEffect } from '@wordpress/element';
import { apiGet, readJson } from '../components/shared';
import { useLatestRequest } from './useLatestRequest';

/**
 * The other expenses written on the same check number as the one being typed, so the expense form can say
 * what a check also covers. Looks up a moment after typing stops, and ignores an answer that arrives late.
 *
 * @param {string} number    The check number typed so far.
 * @param {number} excludeId The expense being edited (0 for a new one), left out of the answer.
 * @return {Object} others (expenses on the same number: id, payee, amount, expense_date) and total (their sum).
 */
export function useSharedCheck( number, excludeId ) {
	const [ found, setFound ] = useState( { others: [], total: 0 } );
	const begin = useLatestRequest();

	useEffect( () => {
		const isStale = begin();
		const trimmed = number.trim();
		const timer = setTimeout(
			() => {
				if ( ! trimmed ) {
					setFound( { others: [], total: 0 } );
					return;
				}
				apiGet( '/expenditures/by-check', {
					number: trimmed,
					exclude: excludeId || 0,
				} )
					.then( readJson )
					.then( ( body ) => {
						if ( ! isStale() ) {
							setFound( {
								others: body.data,
								total: body.total,
							} );
						}
					} )
					.catch( () => {
						if ( ! isStale() ) {
							setFound( { others: [], total: 0 } );
						}
					} );
			},
			trimmed ? 350 : 0
		);
		return () => clearTimeout( timer );
	}, [ number, excludeId, begin ] );

	return found;
}
