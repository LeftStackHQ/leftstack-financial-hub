import { useState, useEffect } from '@wordpress/element';
import { apiGet } from '../components/shared';

const MIN_CHARS = 2;
const WAIT_MS = 250;

/**
 * Find the donation a refund belongs to by what is printed on the platform's refund screen: the donor's name, the
 * order (receipt) number, or the amount. Only gifts are listed, never refund rows. It reuses the donations search.
 *
 * @param {string} query What was typed.
 * @return {Object} results (donations, newest first, as the donations list sorts them) and searching (whether an answer is on its way).
 */
export function useOriginalSearch( query ) {
	const [ results, setResults ] = useState( [] );
	const [ searching, setSearching ] = useState( false );
	useEffect( () => {
		const text = query.trim();
		if ( text.length < MIN_CHARS ) {
			setResults( [] );
			setSearching( false );
			return;
		}
		// A slow answer for an earlier entry must not replace the answer for the current one.
		let ignore = false;
		setSearching( true );
		const timer = setTimeout( () => {
			const params = new URLSearchParams( {
				search: text,
				amount_min: '0',
				per_page: '8',
			} );
			apiGet( '/donations', params.toString() )
				.then( ( r ) => ( r.ok ? r.json() : Promise.reject() ) )
				.then( ( d ) => {
					if ( ! ignore ) {
						setResults( Array.isArray( d.data ) ? d.data : [] );
						setSearching( false );
					}
				} )
				.catch( () => {
					if ( ! ignore ) {
						setResults( [] );
						setSearching( false );
					}
				} );
		}, WAIT_MS );
		return () => {
			ignore = true;
			clearTimeout( timer );
		};
	}, [ query ] );
	return { results, searching };
}
