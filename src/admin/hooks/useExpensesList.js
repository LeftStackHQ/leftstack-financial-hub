import { useState, useEffect, useCallback } from '@wordpress/element';
import { apiGet } from '../components/shared';
import { buildExpenditureFilterParams } from '../components/Expenditures/helpers';
import { useLatestRequest } from './useLatestRequest';

/**
 * The Expenditures transactions list: loads one page for the current search, filters and sort,
 * and keeps the page's rows and the total amount of everything that matches.
 *
 * @param {Object}   options
 * @param {string}   options.search   Search text.
 * @param {Object}   options.filters  Filter values (fCat, fMethod, fStatus, fPeriod, fDateFrom, fDateTo).
 * @param {number}   options.page     Page to load.
 * @param {string}   options.sortBy   Column to sort by.
 * @param {string}   options.sortDir  'asc' or 'desc'.
 * @param {number}   options.perPage  Rows per page.
 * @param {Function} options.onLoaded Called each time a page has loaded (the screen clears its ticked rows).
 * @return {Object} The rows, setExp, total, setTotal, totalAmt, loading and load().
 */
export function useExpensesList( {
	search,
	filters,
	page,
	sortBy,
	sortDir,
	perPage,
	onLoaded,
} ) {
	const [ expenses, setExp ] = useState( [] );
	const [ total, setTotal ] = useState( 0 );
	const [ totalAmt, setTotalAmt ] = useState( 0 );
	const [ loading, setLoading ] = useState( true );
	const { fCat, fMethod, fStatus, fPeriod, fDateFrom, fDateTo } = filters;

	const begin = useLatestRequest();
	const load = useCallback( () => {
		const isStale = begin();
		setLoading( true );
		const params = buildExpenditureFilterParams( {
			search,
			fCat,
			fMethod,
			fStatus,
			fPeriod,
			fDateFrom,
			fDateTo,
		} );
		params.set( 'per_page', perPage );
		params.set( 'page', page );
		params.set( 'orderby', sortBy );
		params.set( 'order', sortDir.toUpperCase() );
		params.set( '_t', Date.now() );
		apiGet( `/expenditures`, `${ params }` )
			.then( ( r ) => r.json() )
			.then( ( d ) => {
				if ( isStale() ) {
					return;
				}
				const rows = d.data || [];
				setExp( rows );
				setTotal( d.total || 0 );
				setTotalAmt( parseFloat( d.total_amount ) || 0 );
				onLoaded();
				setLoading( false );
			} )
			.catch( () => {
				if ( ! isStale() ) {
					setLoading( false );
				}
			} );
	}, [
		begin,
		page,
		search,
		fCat,
		fMethod,
		fStatus,
		fPeriod,
		fDateFrom,
		fDateTo,
		sortBy,
		sortDir,
		perPage,
		onLoaded,
	] );

	useEffect( () => {
		load();
	}, [ load ] );

	return { expenses, setExp, total, setTotal, totalAmt, loading, load };
}
