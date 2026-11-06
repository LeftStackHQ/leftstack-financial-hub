import { __, sprintf } from '@wordpress/i18n';

/**
 * The Filing Period field of a form, with a note when the form's date falls outside the chosen period.
 *
 * @param {Object}   props
 * @param {string}   props.id       Id for the select, so its label points at it.
 * @param {string}   props.value    The chosen period id, or '' for none.
 * @param {Function} props.onChange Called with the new period id.
 * @param {Array}    props.periods  Filing periods from /filing-periods.
 * @param {string}   props.date     The form's date, to check against the chosen period.
 * @param {boolean}  props.disabled Locks the field (a filed record keeps its period).
 */
export function PeriodSelect( {
	id,
	value,
	onChange,
	periods,
	date,
	disabled,
} ) {
	const chosen = periods.find( ( p ) => String( p.id ) === String( value ) );
	const day = String( date || '' ).slice( 0, 10 );
	const outside =
		chosen && day && ( day < chosen.start_date || day > chosen.end_date );
	return (
		<div className="lsfh-field">
			<label htmlFor={ id }>
				{ __( 'Filing Period', 'leftstack-financial-hub' ) }
			</label>
			<select
				id={ id }
				value={ value }
				disabled={ disabled }
				onChange={ ( e ) => onChange( e.target.value ) }
			>
				<option value="">
					{ __( 'None', 'leftstack-financial-hub' ) }
				</option>
				{ periods.map( ( p ) => (
					<option key={ p.id } value={ p.id }>
						{ p.name }
					</option>
				) ) }
			</select>
			{ outside && (
				<p className="lsfh-meta">
					{ sprintf(
						/* translators: 1: period name, 2: first date, 3: last date. */
						__(
							'This date is outside %1$s (%2$s to %3$s).',
							'leftstack-financial-hub'
						),
						chosen.name,
						chosen.start_date,
						chosen.end_date
					) }
				</p>
			) }
		</div>
	);
}
