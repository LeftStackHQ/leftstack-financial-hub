import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * The bank account chooser at the top of the Bank screen, with a small form to add an account.
 *
 * @param {Object}   props
 * @param {Object[]} props.accounts Accounts to choose from.
 * @param {Object}   props.account  The chosen account, or null.
 * @param {Function} props.onSelect Called with an account id.
 * @param {Function} props.onAdd    Called with a label; resolves to the new account, or null if it was refused.
 * @param {string}   props.error    Why the last add was refused.
 */
export function BankAccountBar( {
	accounts,
	account,
	onSelect,
	onAdd,
	error,
} ) {
	const [ adding, setAdding ] = useState( ! accounts.length );
	const [ label, setLabel ] = useState( '' );

	const submit = async ( event ) => {
		event.preventDefault();
		if ( ! label.trim() ) {
			return;
		}
		if ( await onAdd( label.trim() ) ) {
			setLabel( '' );
			setAdding( false );
		}
	};

	return (
		<div className="lsfh-toolbar">
			{ accounts.length > 0 && (
				<>
					<label htmlFor="lsfh-bank-account" className="lsfh-meta">
						{ __( 'Bank account', 'leftstack-financial-hub' ) }
					</label>
					<select
						id="lsfh-bank-account"
						className="lsfh-input"
						value={ account?.id || '' }
						onChange={ ( e ) =>
							onSelect( Number( e.target.value ) )
						}
					>
						{ accounts.map( ( a ) => (
							<option key={ a.id } value={ a.id }>
								{ a.label }
							</option>
						) ) }
					</select>
				</>
			) }
			{ adding ? (
				<form className="lsfh-toolbar-right" onSubmit={ submit }>
					<label htmlFor="lsfh-bank-new-label" className="lsfh-meta">
						{ __( 'Name this account', 'leftstack-financial-hub' ) }
					</label>
					<input
						id="lsfh-bank-new-label"
						className="lsfh-input"
						value={ label }
						maxLength={ 100 }
						placeholder={ __(
							'For example: US Bank checking',
							'leftstack-financial-hub'
						) }
						onChange={ ( e ) => setLabel( e.target.value ) }
					/>
					<button type="submit" className="btn btn-primary btn-sm">
						{ __( 'Add account', 'leftstack-financial-hub' ) }
					</button>
					{ accounts.length > 0 && (
						<button
							type="button"
							className="btn btn-ghost btn-sm"
							onClick={ () => setAdding( false ) }
						>
							{ __( 'Cancel', 'leftstack-financial-hub' ) }
						</button>
					) }
					{ error && (
						<span className="lsfh-import-error" role="alert">
							{ error }
						</span>
					) }
				</form>
			) : (
				<button
					type="button"
					className="btn btn-ghost btn-sm lsfh-toolbar-right"
					onClick={ () => setAdding( true ) }
				>
					{ __( '+ Add a bank account', 'leftstack-financial-hub' ) }
				</button>
			) }
		</div>
	);
}
