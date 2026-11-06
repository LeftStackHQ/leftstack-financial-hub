import { useId } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * The tick box that says whether confirming also fills blank dates on the Hub items from the bank lines.
 * A date someone typed is never changed.
 *
 * @param {Object}   props
 * @param {boolean}  props.checked  Whether blank dates will be filled.
 * @param {Function} props.onChange Called with the new value.
 */
export function BankFillDatesOption( { checked, onChange } ) {
	const id = useId();
	return (
		<label className="lsfh-bank-option" htmlFor={ id }>
			<input
				id={ id }
				type="checkbox"
				checked={ checked }
				onChange={ ( e ) => onChange( e.target.checked ) }
			/>{ ' ' }
			{ __(
				'Fill blank dates from the bank (Date Received, Posted date, Date Deposited). A date you typed is never changed.',
				'leftstack-financial-hub'
			) }
		</label>
	);
}
