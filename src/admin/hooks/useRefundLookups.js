import { useState, useEffect } from '@wordpress/element';
import { apiGet } from '../components/shared';

/**
 * What the refund part of the donation form looks up: every disbursement (for the picker) and
 * the original donation a refund points at.
 *
 * @param {Object}  options
 * @param {boolean} options.isRefund   Whether the form is recording a refund.
 * @param {string}  options.refundOfId The id typed in "Original Donation ID".
 * @return {Object} disbursements, originalDon and originalMissing.
 */
export function useRefundLookups( { isRefund, refundOfId } ) {
	const [ disbursements, setDisbursements ] = useState( [] );
	useEffect( () => {
		if ( ! isRefund ) {
			return;
		}
		const loadAll = async () => {
			const all = [];
			let page = 1;
			let pages = 1;
			do {
				const r = await apiGet(
					`/disbursements`,
					`per_page=200&page=${ page }&orderby=disbursement_date&order=DESC`
				);
				const d = await r.json();
				all.push( ...( Array.isArray( d.data ) ? d.data : [] ) );
				pages = d.pages || 1;
				page++;
			} while ( page <= pages && page <= 10 );
			setDisbursements( all );
		};
		loadAll();
	}, [ isRefund ] );
	// The linked original donation; originalMissing is true when the typed id matches nothing.
	const [ originalDon, setOriginalDon ] = useState( null );
	const [ originalMissing, setOriginalMissing ] = useState( false );
	useEffect( () => {
		const id = parseInt( refundOfId );
		setOriginalDon( null );
		setOriginalMissing( false );
		if ( ! id ) {
			return;
		}
		// A slow answer for an id typed earlier must not replace the answer for the current one.
		let ignore = false;
		apiGet( `/donations/${ id }` )
			.then( ( r ) => ( r.ok ? r.json() : null ) )
			.then( ( d ) => {
				if ( ignore ) {
					return;
				}
				setOriginalDon( d?.id ? d : null );
				setOriginalMissing( ! d?.id );
			} )
			.catch( () => ! ignore && setOriginalMissing( true ) );
		return () => {
			ignore = true;
		};
	}, [ refundOfId ] );

	return { disbursements, originalDon, originalMissing };
}
