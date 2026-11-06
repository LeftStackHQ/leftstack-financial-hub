import { useState, useEffect } from '@wordpress/element';
import { apiGet, readJson } from '../components/shared';

/**
 * The categories and filing periods the add-expense and add-donation forms need, loaded once when asked for.
 *
 * @param {boolean} enabled Load them only when this is true (an Add to Hub was clicked).
 * @return {Object} categories, periods, ready (both loaded) and failed.
 */
export function useAddToHubLists( enabled ) {
	const [ lists, setLists ] = useState( {
		categories: [],
		periods: [],
		ready: false,
		failed: false,
	} );

	useEffect( () => {
		if ( ! enabled || lists.ready ) {
			return undefined;
		}
		let current = true;
		Promise.all( [
			apiGet( '/categories' ).then( readJson ),
			apiGet( '/filing-periods' ).then( readJson ),
		] )
			.then( ( [ categories, periods ] ) => {
				if ( current ) {
					setLists( {
						categories: Array.isArray( categories )
							? categories
							: [],
						periods: Array.isArray( periods ) ? periods : [],
						ready: true,
						failed: false,
					} );
				}
			} )
			.catch( () => {
				if ( current ) {
					setLists( ( l ) => ( { ...l, failed: true } ) );
				}
			} );
		return () => {
			current = false;
		};
	}, [ enabled, lists.ready ] );

	return lists;
}
