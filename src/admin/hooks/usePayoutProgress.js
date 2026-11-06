import { useState, useEffect } from '@wordpress/element';
import { apiGet } from '../components/shared';
import { useLatestRequest } from './useLatestRequest';

/**
 * How far along the payouts of one filing period are (total, balanced, matched, filed), or null until known or when no
 * period is chosen.
 *
 * @param {number|string} periodId The filing period, or empty for none.
 * @return {Object|null} The counts.
 */
export function usePayoutProgress( periodId ) {
	const [ counts, setCounts ] = useState( null );
	const begin = useLatestRequest();

	useEffect( () => {
		setCounts( null );
		if ( ! periodId ) {
			return;
		}
		const isStale = begin();
		apiGet( '/disbursements/progress', `filing_period_id=${ periodId }` )
			.then( ( r ) => r.json() )
			.then( ( d ) => {
				if ( ! isStale() && Number.isInteger( d?.total ) ) {
					setCounts( d );
				}
			} )
			.catch( () => {} );
	}, [ periodId, begin ] );

	return counts;
}
