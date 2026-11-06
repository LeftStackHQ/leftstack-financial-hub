import { useState } from '@wordpress/element';
import { apiSend, confirmAction } from '../components/shared';

/**
 * Bulk changes to the ticked expenses: the category, method and Balanced choices in the bulk
 * bar, applying them, and deleting the ticked rows.
 *
 * @param {Object}   options
 * @param {Set}      options.checked Ids of the ticked rows.
 * @param {Function} options.clear   Clears the ticked rows.
 * @param {Function} options.load    Reloads the list.
 * @return {Object} The three choices and their setters, clearBulkFields, bulkUpdating, bulkUpdate and bulkDelete.
 */
export function useBulkExpenseEdit( { checked, clear, load } ) {
	const [ bulkCategory, setBulkCategory ] = useState( '' );
	const [ bulkMethod, setBulkMethod ] = useState( '' );
	const [ bulkBalanced, setBulkBalanced ] = useState( '' );
	const [ bulkUpdating, setBulkUpdating ] = useState( false );
	const clearBulkFields = () => {
		setBulkCategory( '' );
		setBulkMethod( '' );
		setBulkBalanced( '' );
	};

	const bulkDelete = async () => {
		if ( ! checked.size ) {
			return;
		}
		const ok = await confirmAction(
			`Delete ${ checked.size } expense${
				checked.size > 1 ? 's' : ''
			}? This cannot be undone.`
		);
		if ( ! ok ) {
			return;
		}
		await apiSend( 'POST', `/expenditures/bulk-delete`, {
			ids: [ ...checked ],
		} );
		window.lsfhToast(
			`Deleted ${ checked.size } expense${ checked.size > 1 ? 's' : '' }.`
		);
		load();
	};

	const bulkUpdate = async () => {
		if ( ! checked.size ) {
			return;
		}
		setBulkUpdating( true );
		const body = { ids: [ ...checked ] };
		if ( bulkCategory !== '' ) {
			body.category_id =
				bulkCategory === '0' ? 0 : parseInt( bulkCategory, 10 );
		}
		if ( bulkMethod !== '' ) {
			body.payment_method = bulkMethod;
		}
		if ( bulkBalanced !== '' ) {
			body.balanced = bulkBalanced === '1';
		}
		const r = await apiSend( 'POST', `/expenditures/bulk-update`, body );
		const d = await r.json();
		setBulkUpdating( false );
		clearBulkFields();
		clear();
		window.lsfhToast(
			`Updated ${ d.updated ?? checked.size } expense${
				( d.updated ?? checked.size ) !== 1 ? 's' : ''
			}.`
		);
		load();
	};

	return {
		bulkCategory,
		setBulkCategory,
		bulkMethod,
		setBulkMethod,
		bulkBalanced,
		setBulkBalanced,
		clearBulkFields,
		bulkUpdating,
		bulkUpdate,
		bulkDelete,
	};
}
