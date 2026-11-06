import { useState, useEffect } from '@wordpress/element';
import { apiGet } from '../components/shared';

/**
 * The Dashboard's data: the filing periods and months for the filters, and the dashboard
 * figures for the chosen period or date range.
 *
 * @param {Object} options
 * @param {string} options.period    Filing period id, or ''.
 * @param {string} options.fDateFrom Start of the date range, or ''.
 * @param {string} options.fDateTo   End of the date range, or ''.
 * @return {Object} data, periods, months and loading.
 */
export function useDashboard( { period, fDateFrom, fDateTo } ) {
	const [ data, setData ] = useState( null );
	const [ periods, setPeriods ] = useState( [] );
	const [ months, setMonths ] = useState( [] );
	const [ loading, setLoading ] = useState( true );

	useEffect( () => {
		apiGet( `/filing-periods` )
			.then( ( r ) => r.json() )
			.then( setPeriods )
			.catch( () => {} );
		apiGet( `/months` )
			.then( ( r ) => r.json() )
			.then( ( d ) => {
				// Union of all months with any data across donations, expenditures, inkind
				const all = [
					...new Set( [
						...( d.donations || [] ),
						...( d.expenditures || [] ),
						...( d.inkind || [] ),
					] ),
				];
				all.sort( ( a, b ) => b.localeCompare( a ) );
				setMonths( all );
			} )
			.catch( () => {} );
	}, [] );

	useEffect( () => {
		setLoading( true );
		let ignore = false;
		const params = new URLSearchParams( { _t: Date.now() } );
		if ( period ) {
			params.set( 'filing_period_id', period );
		}
		if ( fDateFrom ) {
			params.set( 'date_from', fDateFrom );
		}
		if ( fDateTo ) {
			params.set( 'date_to', fDateTo );
		}
		apiGet( `/dashboard`, `${ params }` )
			.then( ( r ) => r.json() )
			.then( ( d ) => {
				if ( ignore ) {
					return;
				}
				setData( d );
				setLoading( false );
			} )
			.catch( () => {
				if ( ! ignore ) {
					setLoading( false );
				}
			} );
		return () => {
			ignore = true;
		};
	}, [ period, fDateFrom, fDateTo ] );

	return { data, periods, months, loading };
}
