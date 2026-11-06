import { useState, useEffect, useCallback } from '@wordpress/element';
import { apiGet, apiSend } from '../components/shared';

const NO_RANGE = { from: '', to: '', label: '' };

/**
 * The vendor report (spend against money raised for each group of payees and fundraising pages) for a date range, and
 * the way to change the groups.
 *
 * The lists of pages and payees to pick from always cover every date, so groups can be edited while a range is chosen.
 *
 * @return {Object} report ({ groups, pages, payees } or null while loading), loading, failed, range ({ from, to,
 *                  label }), setRange(from, to, label), clearRange(), and saveGroups(groups), which saves the whole
 *                  list of groups and resolves to true when it was saved.
 */
export function useVendorReport() {
	const [ report, setReport ] = useState( null );
	const [ choices, setChoices ] = useState( null );
	const [ loading, setLoading ] = useState( true );
	const [ failed, setFailed ] = useState( false );
	const [ range, setRangeState ] = useState( NO_RANGE );

	const take = useCallback(
		( d ) => {
			setReport( d );
			if ( ! range.from && ! range.to ) {
				setChoices( { pages: d.pages, payees: d.payees } );
			}
		},
		[ range ]
	);

	useEffect( () => {
		let ignore = false;
		setLoading( true );
		apiGet(
			'/vendors/report',
			`date_from=${ range.from }&date_to=${ range.to }&_t=${ Date.now() }`
		)
			.then( ( r ) => ( r.ok ? r.json() : Promise.reject( r ) ) )
			.then( ( d ) => {
				if ( ! ignore ) {
					take( d );
					setFailed( false );
					setLoading( false );
				}
			} )
			.catch( () => {
				if ( ! ignore ) {
					setFailed( true );
					setLoading( false );
				}
			} );
		return () => {
			ignore = true;
		};
	}, [ range, take ] );

	const saveGroups = useCallback(
		async ( groups ) => {
			const r = await apiSend( 'POST', '/vendors/groups', {
				groups,
				date_from: range.from,
				date_to: range.to,
			} );
			if ( ! r.ok ) {
				return false;
			}
			take( await r.json() );
			return true;
		},
		[ range, take ]
	);

	const setRange = useCallback(
		( from, to, label ) => setRangeState( { from, to, label } ),
		[]
	);
	const clearRange = useCallback( () => setRangeState( NO_RANGE ), [] );

	return {
		report: report && choices ? { ...report, ...choices } : report,
		loading,
		failed,
		range,
		setRange,
		clearRange,
		saveGroups,
	};
}
