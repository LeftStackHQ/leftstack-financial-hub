import { __ } from '@wordpress/i18n';
import { ColumnSelect } from './ColumnSelect';
import { fmtC } from '../shared';

const longDate = ( iso ) =>
	new Date( `${ iso }T00:00:00Z` ).toLocaleDateString( 'en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'UTC',
	} );

/**
 * A labelled drop-down with a fixed list of choices and an optional hint under it.
 *
 * @param {Object}   props
 * @param {string}   props.id       Element id.
 * @param {string}   props.label    Label text.
 * @param {string}   props.value    The chosen value.
 * @param {Array}    props.options  [ value, text ] pairs.
 * @param {Function} props.onChange Called with the chosen value.
 * @param {Node}     [props.hint]   Shown under the drop-down.
 */
function ChoiceSelect( { id, label, value, options, onChange, hint } ) {
	return (
		<div className="lsfh-field">
			<label htmlFor={ id } className="lsfh-label">
				{ label }
			</label>
			<select
				id={ id }
				className="lsfh-input"
				value={ value }
				onChange={ ( e ) => onChange( e.target.value ) }
			>
				{ options.map( ( [ optionValue, text ] ) => (
					<option key={ optionValue } value={ optionValue }>
						{ text }
					</option>
				) ) }
			</select>
			{ hint }
		</div>
	);
}

/**
 * The questions about how a bank lays out its file: which column holds the date, how amounts are given,
 * and where the check number is. The first row is shown as it is read so a wrong answer is easy to see.
 *
 * @param {Object}   props
 * @param {string[]} props.headers The file's column names.
 * @param {Object}   props.layout  The current layout.
 * @param {Object}   props.built   buildLines() under that layout.
 * @param {Function} props.onField Called with a layout field name and its new value.
 */
export function BankLayoutFields( { headers, layout, built, onField } ) {
	const first = built.lines[ 0 ];
	const column = ( id, label, field ) => (
		<ColumnSelect
			id={ id }
			label={ label }
			value={ layout[ field ] }
			headers={ headers }
			onChange={ ( value ) => onField( field, value ) }
		/>
	);
	const reads = ( text ) => (
		<p className="lsfh-meta">
			{ __( 'First row reads as', 'leftstack-financial-hub' ) }:{ ' ' }
			<strong>{ text }</strong>
		</p>
	);
	return (
		<div className="lsfh-bank-layout">
			{ column(
				'lsfh-bank-date-column',
				__( 'Date column', 'leftstack-financial-hub' ),
				'dateColumn'
			) }
			<ChoiceSelect
				id="lsfh-bank-date-format"
				label={ __( 'Date format', 'leftstack-financial-hub' ) }
				value={ layout.dateFormat }
				onChange={ ( value ) => onField( 'dateFormat', value ) }
				options={ [
					[
						'ymd',
						__(
							'Year–month–day (2026–08–17)',
							'leftstack-financial-hub'
						),
					],
					[
						'mdy',
						__(
							'Month/day/year (08/17/2026)',
							'leftstack-financial-hub'
						),
					],
					[
						'dmy',
						__(
							'Day/month/year (17/08/2026)',
							'leftstack-financial-hub'
						),
					],
				] }
				hint={ first && reads( longDate( first.date ) ) }
			/>

			<ChoiceSelect
				id="lsfh-bank-amount-style"
				label={ __(
					'How amounts are given',
					'leftstack-financial-hub'
				) }
				value={ layout.amountStyle }
				onChange={ ( value ) => onField( 'amountStyle', value ) }
				options={ [
					[
						'signed',
						__(
							'One column, money out is negative',
							'leftstack-financial-hub'
						),
					],
					[
						'two',
						__(
							'Separate debit and credit columns',
							'leftstack-financial-hub'
						),
					],
					[
						'typed',
						__(
							'Amount plus a debit/credit type column',
							'leftstack-financial-hub'
						),
					],
				] }
				hint={
					first &&
					reads(
						`${
							first.amount.startsWith( '-' )
								? __( 'money out', 'leftstack-financial-hub' )
								: __( 'money in', 'leftstack-financial-hub' )
						} ${ fmtC( Math.abs( Number( first.amount ) ) ) }`
					)
				}
			/>
			{ 'two' === layout.amountStyle ? (
				<>
					{ column(
						'lsfh-bank-debit',
						__(
							'Debit (money out) column',
							'leftstack-financial-hub'
						),
						'debitColumn'
					) }
					{ column(
						'lsfh-bank-credit',
						__(
							'Credit (money in) column',
							'leftstack-financial-hub'
						),
						'creditColumn'
					) }
				</>
			) : (
				column(
					'lsfh-bank-amount',
					__( 'Amount column', 'leftstack-financial-hub' ),
					'amountColumn'
				)
			) }
			{ 'typed' === layout.amountStyle &&
				column(
					'lsfh-bank-type',
					__( 'Debit/credit type column', 'leftstack-financial-hub' ),
					'typeColumn'
				) }

			<ColumnSelect
				id="lsfh-bank-description"
				label={ __( 'Description column', 'leftstack-financial-hub' ) }
				value={ layout.descriptionColumns[ 0 ] || '' }
				headers={ headers }
				onChange={ ( value ) =>
					onField( 'descriptionColumns', value ? [ value ] : [] )
				}
			/>
			<ChoiceSelect
				id="lsfh-bank-check-source"
				label={ __( 'Check number', 'leftstack-financial-hub' ) }
				value={ layout.checkSource }
				onChange={ ( value ) => onField( 'checkSource', value ) }
				options={ [
					[
						'none',
						__(
							'This bank does not provide it',
							'leftstack-financial-hub'
						),
					],
					[
						'column',
						__(
							'In a column of its own',
							'leftstack-financial-hub'
						),
					],
					[
						'description',
						__(
							'Inside the description (for example CHECK #1015)',
							'leftstack-financial-hub'
						),
					],
				] }
			/>
			{ 'column' === layout.checkSource &&
				column(
					'lsfh-bank-check-column',
					__( 'Check number column', 'leftstack-financial-hub' ),
					'checkColumn'
				) }
		</div>
	);
}
