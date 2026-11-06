import { useState } from '@wordpress/element';
import { apiSend } from '../shared';

/* ─────────────── Edit Payee Modal ───────────────────────── */
export function EditPayeeModal( { payee, onClose, onSaved } ) {
	const [ name, setName ] = useState( payee.payee_display || '' );
	const [ address, setAddress ] = useState( payee.address || '' );
	const [ saving, setSaving ] = useState( false );
	const [ msg, setMsg ] = useState( '' );

	const save = async () => {
		if ( ! name.trim() ) {
			setMsg( 'Payee name is required.' );
			return;
		}
		setSaving( true );
		setMsg( '' );
		try {
			const r = await apiSend( 'POST', `/payees/rename`, {
				old_name: payee.payee_display,
				new_name: name.trim(),
				new_address: address.trim(),
			} );
			const d = await r.json();
			if ( r.ok ) {
				window.lsfhToast(
					`Updated ${ d.updated } expense record${
						d.updated !== 1 ? 's' : ''
					}.`
				);
				onSaved();
				onClose();
			} else {
				setMsg( d.message || 'Error saving.' );
			}
		} catch {
			setMsg( 'Network error.' );
		}
		setSaving( false );
	};

	return (
		<div id="lsfh-modal-backdrop">
			<div className="lsfh-modal">
				<div className="lsfh-modal-header">
					<span>Edit Payee</span>
					<button className="lsfh-icon-btn" onClick={ onClose }>
						✕
					</button>
				</div>
				<p className="lsfh-meta lsfh-meta--mb">
					Changes apply to <strong>all</strong> expense records for
					this payee.
				</p>
				<div className="lsfh-field">
					<label htmlFor="lsfh-expenditures-payee-name">
						Payee Name <span className="req">*</span>
					</label>
					<input
						id="lsfh-expenditures-payee-name"
						type="text"
						value={ name }
						onChange={ ( e ) => setName( e.target.value ) }
						ref={ ( node ) => node?.focus() }
					/>
				</div>
				<div className="lsfh-field">
					<label htmlFor="lsfh-address-2">Address</label>
					<input
						id="lsfh-address-2"
						type="text"
						value={ address }
						onChange={ ( e ) => setAddress( e.target.value ) }
						placeholder="Street, City, State ZIP"
					/>
				</div>
				{ msg && <p className="lsfh-form-error">{ msg }</p> }
				<div className="lsfh-modal-footer">
					<button
						className="btn btn-primary"
						onClick={ save }
						disabled={ saving }
					>
						{ saving ? 'Saving…' : 'Save Changes' }
					</button>
					<button className="btn btn-ghost" onClick={ onClose }>
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
}
