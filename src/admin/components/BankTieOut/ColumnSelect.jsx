import { __ } from '@wordpress/i18n';

/**
 * A labelled drop-down that picks one column of the bank file.
 *
 * @param {Object}   props
 * @param {string}   props.id       Element id.
 * @param {string}   props.label    What the column holds.
 * @param {string}   props.value    The chosen column name, or an empty string.
 * @param {string[]} props.headers  The file's column names.
 * @param {Function} props.onChange Called with the chosen column name.
 */
export function ColumnSelect( { id, label, value, headers, onChange } ) {
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
				<option value="">
					{ __( 'Choose a column', 'leftstack-financial-hub' ) }
				</option>
				{ headers.map( ( header ) => (
					<option key={ header } value={ header }>
						{ header }
					</option>
				) ) }
			</select>
		</div>
	);
}
