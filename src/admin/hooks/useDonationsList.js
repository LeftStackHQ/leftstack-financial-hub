import { useState, useEffect, useCallback } from '@wordpress/element';
import { apiGet } from '../components/shared';
import { buildDonationFilterParams } from '../components/Donations/helpers';
import { useLatestRequest } from './useLatestRequest';

/**
 * The Donations transactions list: loads one page for the current search, filters and sort, and
 * keeps the page's rows and the totals for everything that matches.
 *
 * @param {Object} options
 * @param {string} options.search  Search text.
 * @param {Object} options.filters Filter values (fElec, fReport, ... fPage).
 * @param {number} options.page    Page to load.
 * @param {string} options.sortBy  Column to sort by.
 * @param {string} options.sortDir 'asc' or 'desc'.
 * @param {number} options.perPage Rows per page.
 * @return {Object} The rows, setDon, the totals, loading, load() and buildFilterParams().
 */
export function useDonationsList( {
	search,
	filters,
	page,
	sortBy,
	sortDir,
	perPage,
} ) {
	const [ donations, setDon ] = useState( [] );
	const [ total, setTotal ] = useState( 0 );
	const [ totalContributions, setTotalContributions ] = useState( 0 );
	const [ loading, setLoading ] = useState( true );
	// Filter totals
	const [ totalGross, setTotalGross ] = useState( 0 );
	const [ totalNet, setTotalNet ] = useState( 0 );
	const [ totalFees, setTotalFees ] = useState( 0 );
	const {
		fElec,
		fReport,
		fStatus,
		fSource,
		fPeriod,
		fState,
		fCity,
		fZip,
		fAmountMin,
		fAmountMax,
		fDateFrom,
		fDateTo,
		fPage,
		fDisbId,
		fHasRefund,
	} = filters;

	// Filter params shared between the paginated list fetch and "select all matching" below.
	const buildFilterParams = useCallback( () => {
		return buildDonationFilterParams( {
			search,
			fElec,
			fReport,
			fStatus,
			fSource,
			fPeriod,
			fState,
			fCity,
			fZip,
			fAmountMin,
			fAmountMax,
			fDateFrom,
			fDateTo,
			fDisbId,
			fHasRefund,
			fPage,
		} );
	}, [
		search,
		fElec,
		fReport,
		fStatus,
		fSource,
		fPeriod,
		fState,
		fCity,
		fZip,
		fAmountMin,
		fAmountMax,
		fDateFrom,
		fDateTo,
		fDisbId,
		fHasRefund,
		fPage,
	] );

	const begin = useLatestRequest();
	const load = useCallback( () => {
		const isStale = begin();
		setLoading( true );
		const params = buildFilterParams();
		params.set( 'per_page', perPage );
		params.set( 'page', page );
		params.set( 'orderby', sortBy );
		params.set( 'order', sortDir.toUpperCase() );
		params.set( '_t', Date.now() );
		apiGet( `/donations`, `${ params }` )
			.then( ( r ) => r.json() )
			.then( ( d ) => {
				if ( isStale() ) {
					return;
				}
				setDon( d.data || [] );
				setTotal( d.total || 0 );
				setTotalContributions( d.contribution_count ?? d.total ?? 0 );
				setTotalGross( d.total_gross || 0 );
				setTotalNet( d.total_net || 0 );
				setTotalFees( d.total_fees || 0 );
				setLoading( false );
			} )
			.catch( () => {
				if ( ! isStale() ) {
					setLoading( false );
				}
			} );
	}, [ begin, buildFilterParams, page, sortBy, sortDir, perPage ] );

	useEffect( () => {
		load();
	}, [ load ] );

	return {
		donations,
		setDon,
		total,
		setTotal,
		totalContributions,
		totalGross,
		totalNet,
		totalFees,
		loading,
		load,
		buildFilterParams,
	};
}
