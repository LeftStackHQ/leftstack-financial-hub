import { useState } from '@wordpress/element';
import { apiGet, apiSend, confirmAction, saveFile } from '../components/shared';

/**
 * What can be done to donations from the transactions list: select every row that matches the
 * filters, delete one, run a bulk action on the ticked rows, and export the matching rows.
 *
 * @param {Object}   options
 * @param {Function} options.buildFilterParams Builds the query parameters for the active filters.
 * @param {Set}      options.selected          Ids of the ticked rows.
 * @param {Function} options.setSel            Replaces the set of ticked rows.
 * @param {Function} options.load              Reloads the list.
 * @param {Function} options.setDon            Replaces the rows on the page.
 * @param {Function} options.setTotal          Replaces the number of matching rows.
 * @param {Object}   options.selectedDon       The donation open in the detail panel, or null.
 * @param {Function} options.setSelectedDon    Opens or closes the detail panel.
 * @return {Object} selectingAll, selectAllMatching, deleteDon, bulk and exportAll.
 */
export function useDonationActions( {
	buildFilterParams,
	selected,
	setSel,
	load,
	setDon,
	setTotal,
	selectedDon,
	setSelectedDon,
} ) {
	// Selecting the header checkbox only grabs the current page (PER_PAGE=50) — this
	// walks every page matching the active filters so bulk actions (e.g. Set Election)
	// can apply to the whole result set, not just what's currently rendered.
	const [ selectingAll, setSelectingAll ] = useState( false );
	const selectAllMatching = async () => {
		setSelectingAll( true );
		try {
			const ids = [];
			const CHUNK = 500;
			for ( let p = 1; ; p++ ) {
				const params = buildFilterParams();
				params.set( 'per_page', CHUNK );
				params.set( 'page', p );
				params.set( 'orderby', 'id' );
				params.set( 'order', 'ASC' );
				const r = await apiGet( `/donations`, `${ params }` );
				const d = await r.json();
				const rows = Array.isArray( d.data ) ? d.data : [];
				rows.forEach( ( row ) => ids.push( row.id ) );
				if ( rows.length < CHUNK || ids.length >= ( d.total || 0 ) ) {
					break;
				}
			}
			setSel( new Set( ids ) );
		} catch {
			window.lsfhToast( 'Failed to select all matching rows.' );
		}
		setSelectingAll( false );
	};

	const deleteDon = async ( id ) => {
		const ok = await confirmAction( 'Delete this donation?' );
		if ( ! ok ) {
			return;
		}
		await apiSend( 'DELETE', `/donations/${ id }` );
		setDon( ( prev ) => prev.filter( ( d ) => d.id !== id ) );
		setTotal( ( t ) => t - 1 );
		if ( selectedDon?.id === id ) {
			setSelectedDon( null );
		}
		window.lsfhToast( 'Donation deleted.' );
	};

	const bulk = async ( action ) => {
		if ( ! selected.size ) {
			return;
		}
		if ( action === 'delete' ) {
			const ok = await confirmAction(
				`Delete ${ selected.size } donation(s)?`
			);
			if ( ! ok ) {
				return;
			}
		}
		await apiSend( 'POST', `/donations/bulk`, {
			ids: [ ...selected ],
			action,
		} );
		setSel( new Set() );
		load();
		window.lsfhToast( 'Done.' );
	};

	const exportAll = async () => {
		const params = buildFilterParams();
		const r = await apiGet( `/export/donations`, `${ params }` );
		saveFile( await r.blob(), 'donations.csv' );
	};

	return { selectingAll, selectAllMatching, deleteDon, bulk, exportAll };
}
