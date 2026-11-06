import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useAddToHubLists } from '../../hooks/useAddToHubLists';
import { expenseStart, donationStart } from './hubFormStart';

/**
 * Opens the usual add-expense form (for a payment) or add-donation form (for a deposit), already filled in from a
 * bank line. The forms are loaded only when this is first used, because most visits never need them.
 *
 * @param {Object}   props
 * @param {Object}   props.line    The bank line to add: date, amount, description, check_number.
 * @param {Function} props.onSaved Called after the new record was saved.
 * @param {Function} props.onClose Closes the form.
 */
export function BankAddToHub( { line, onSaved, onClose } ) {
	const lists = useAddToHubLists( true );
	const [ Form, setForm ] = useState( null );
	const paying = line.amount < 0;

	useEffect( () => {
		let current = true;
		const load = paying
			? import( '../Expenditures/ExpenseModal' ).then(
					( m ) => m.ExpenseModal
			  )
			: import( '../Donations/DonationModal' ).then(
					( m ) => m.DonationModal
			  );
		load.then( ( component ) => {
			if ( current ) {
				setForm( () => component );
			}
		} );
		return () => {
			current = false;
		};
	}, [ paying ] );

	if ( lists.failed ) {
		return (
			<div id="lsfh-modal-backdrop">
				<div
					className="lsfh-modal"
					role="alertdialog"
					aria-modal="true"
				>
					<div className="lsfh-modal-body">
						{ __(
							'The form could not be opened. Reload the page and try again.',
							'leftstack-financial-hub'
						) }
					</div>
					<div className="lsfh-modal-footer">
						<button className="btn btn-ghost" onClick={ onClose }>
							{ __( 'Close', 'leftstack-financial-hub' ) }
						</button>
					</div>
				</div>
			</div>
		);
	}
	if ( ! Form || ! lists.ready ) {
		return null;
	}
	return paying ? (
		<Form
			initData={ expenseStart( line ) }
			categories={ lists.categories }
			periods={ lists.periods }
			onClose={ onClose }
			onSaved={ onSaved }
		/>
	) : (
		<Form
			initData={ donationStart( line ) }
			periods={ lists.periods }
			onClose={ onClose }
			onSaved={ onSaved }
		/>
	);
}
