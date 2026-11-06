import { __ } from '@wordpress/i18n';
import { PROCESSORS } from './constants';

/**
 * The names a bank prints on deposits from each payment processor, so a deposit can be recognized.
 *
 * @param {Object}   props
 * @param {Object}   props.depositors Comma-separated names by processor.
 * @param {Function} props.onChange   Called with the processor and the new text.
 */
export function BankDepositors( { depositors, onChange } ) {
	const labels = {
		actblue: __( 'ActBlue payouts', 'leftstack-financial-hub' ),
		stripe: __( 'Stripe payouts', 'leftstack-financial-hub' ),
		manual: __(
			'Other payouts, such as Democracy Engine',
			'leftstack-financial-hub'
		),
	};
	return (
		<fieldset className="lsfh-bank-fieldset">
			<legend>
				{ __(
					'Deposits from these names are recognized in the description (separate names with commas):',
					'leftstack-financial-hub'
				) }
			</legend>
			{ PROCESSORS.map( ( key ) => (
				<div className="lsfh-field" key={ key }>
					<label
						htmlFor={ `lsfh-bank-depositor-${ key }` }
						className="lsfh-label"
					>
						{ labels[ key ] }
					</label>
					<input
						id={ `lsfh-bank-depositor-${ key }` }
						className="lsfh-input"
						value={ depositors[ key ] || '' }
						placeholder={ __(
							'Name as the bank prints it',
							'leftstack-financial-hub'
						) }
						onChange={ ( e ) => onChange( key, e.target.value ) }
					/>
				</div>
			) ) }
		</fieldset>
	);
}
