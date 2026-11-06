import { useState, useCallback, useEffect } from '@wordpress/element';
import { apiGet, apiSend, confirmAction } from '../components/shared';
import { useLatestRequest } from './useLatestRequest';

/**
 * The disbursement list: loads one page, and holds the actions that change a payout (edit a
 * field, mark it balanced or filed, delete it, rebuild the ledger).
 *
 * @param {Object} options
 * @param {number} options.page       Page to load.
 * @param {string} options.sortBy     Column to sort by.
 * @param {string} options.sortDir    'asc' or 'desc'.
 * @param {number} options.refreshKey Changes when something else (a sync, an import) changed the data.
 * @param {number} options.perPage    Rows per page.
 * @param {string} options.status     '' for all payouts, or needs_attention for those not balanced yet.
 * @param {number} options.periodId   Only payouts of this filing period (0 for all).
 * @return {Object} The rows, the totals, the loading flags, `load` to refetch, and the actions.
 */
export function useDisbursements( {
	page,
	sortBy,
	sortDir,
	refreshKey,
	perPage,
	status = '',
	periodId = 0,
} ) {
	const [ rows, setRows ] = useState( [] );
	const [ loading, setLoading ] = useState( true );
	const [ syncing, setSyncing ] = useState( false );
	const [ total, setTotal ] = useState( 0 );
	const [ totalNet, setTotalNet ] = useState( 0 );
	const [ reconciledNet, setReconciledNet ] = useState( 0 );
	const [ counts, setCounts ] = useState( {
		total: 0,
		balanced: 0,
		matched: 0,
		filed: 0,
	} );

	const begin = useLatestRequest();
	const load = useCallback( () => {
		const isStale = begin();
		setLoading( true );
		const params = new URLSearchParams( {
			per_page: perPage,
			page,
			orderby: sortBy,
			order: sortDir.toUpperCase(),
			_t: Date.now(),
		} );
		if ( status ) {
			params.set( 'status', status );
		}
		if ( periodId ) {
			params.set( 'filing_period_id', periodId );
		}
		apiGet( `/disbursements`, `${ params }` )
			.then( ( r ) => r.json() )
			.then( ( d ) => {
				if ( isStale() ) {
					return;
				}
				setRows( Array.isArray( d.data ) ? d.data : [] );
				setTotal( d.total || 0 );
				setTotalNet( d.total_net || 0 );
				setReconciledNet( d.reconciled_net || 0 );
				setCounts( ( c ) => d.counts || c );
				setLoading( false );
			} )
			.catch( () => {
				if ( ! isStale() ) {
					setLoading( false );
				}
			} );
	}, [ begin, page, sortBy, sortDir, perPage, status, periodId ] );

	useEffect( () => {
		load();
	}, [ load, refreshKey ] );

	const syncLedger = async () => {
		setSyncing( true );
		try {
			const r = await apiSend( 'POST', `/disbursements/sync` );
			const d = await r.json();
			await load();
			window.lsfhToast(
				`Synced ${ d.synced } disbursement${
					d.synced !== 1 ? 's' : ''
				}.`
			);
		} catch {
			window.lsfhToast( 'Sync failed.' );
		}
		setSyncing( false );
	};

	const saveField = async ( id, field, value ) => {
		const body = { [ field ]: value };
		const r = await apiSend( 'PUT', `/disbursements/${ id }`, body );
		const updated = await r.json();
		setRows( ( prev ) =>
			prev.map( ( row ) =>
				row.id === id ? { ...row, ...updated } : row
			)
		);
	};

	const toggleReconciled = async ( row ) => {
		const newVal = ! row.reconciled;
		setRows( ( prev ) =>
			prev.map( ( r ) =>
				r.id === row.id ? { ...r, reconciled: newVal } : r
			)
		);
		// Delta-update the reconciled total optimistically so it's accurate cross-page.
		setReconciledNet(
			( prev ) => prev + ( newVal ? row.live_net : -row.live_net )
		);
		await apiSend( 'PUT', `/disbursements/${ row.id }`, {
			reconciled: newVal,
		} );
		window.lsfhToast( newVal ? 'Marked balanced.' : 'Marked unbalanced.' );
	};

	const toggleFiled = async ( row ) => {
		const newVal = ! row.filed;
		// Filing a payout that is not matched or balanced yet asks first, and says if it holds another period's donations.
		if ( newVal && ! row.reconciled ) {
			const notes = [];
			if ( ! row.reconciled ) {
				notes.push(
					'This payout is not matched to the bank or marked balanced yet.'
				);
			}
			if ( row.other_periods?.length ) {
				notes.push(
					`It also holds donations from ${ row.other_periods
						.map( ( o ) => o.period )
						.join( ', ' ) }, which are filed with it.`
				);
			}
			const ok = await confirmAction(
				`${ notes.join( ' ' ) } File it anyway?`,
				{
					confirmLabel: 'File it',
					title: 'File this payout?',
					danger: false,
				}
			);
			if ( ! ok ) {
				return;
			}
		}
		setRows( ( prev ) =>
			prev.map( ( r ) =>
				r.id === row.id ? { ...r, filed: newVal } : r
			)
		);
		await apiSend( 'PUT', `/disbursements/${ row.id }`, { filed: newVal } );
		window.lsfhToast(
			newVal
				? 'Disbursement marked filed — linked transactions set to Filed.'
				: 'Disbursement unmarked — linked transactions set to Pending.'
		);
	};

	const deleteDisbursement = async ( id ) => {
		const ok = await confirmAction(
			'Delete this disbursement? It has no linked transactions.'
		);
		if ( ! ok ) {
			return;
		}
		const r = await apiSend( 'DELETE', `/disbursements/${ id }` );
		if ( r.ok ) {
			setRows( ( prev ) => prev.filter( ( row ) => row.id !== id ) );
			window.lsfhToast( 'Disbursement deleted.' );
		} else {
			const d = await r.json();
			window.lsfhToast( d.message || 'Cannot delete.' );
		}
	};

	return {
		rows,
		load,
		loading,
		syncing,
		total,
		totalNet,
		reconciledNet,
		counts,
		syncLedger,
		saveField,
		toggleReconciled,
		toggleFiled,
		deleteDisbursement,
	};
}
