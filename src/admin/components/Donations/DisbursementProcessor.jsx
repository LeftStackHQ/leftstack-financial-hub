import { __ } from '@wordpress/i18n';

/**
 * The name of the processor that paid a deposit out, as a small subtitle under its id. Click it to change it. A deposit
 * with no name shows nothing until the row is hovered, then a quiet "+ add processor".
 *
 * @param {Object}   props
 * @param {Object}   props.row   The deposit row from the disbursements list.
 * @param {Object}   props.field The processor cell from inlineField(): active, open and keys.
 * @param {Function} props.save  Saves one field and closes the editor.
 */
export function DisbursementProcessor( { row, field, save } ) {
	if ( field.active ) {
		return (
			<input
				type="text"
				ref={ ( node ) => node?.focus() }
				defaultValue={ row.processor }
				className="lsfh-input lsfh-processor-input"
				maxLength={ 100 }
				placeholder={ __(
					'Who pays this out?',
					'leftstack-financial-hub'
				) }
				onBlur={ ( e ) => save( row.id, 'processor', e.target.value ) }
				onKeyDown={ field.keys }
			/>
		);
	}
	return (
		<button
			type="button"
			className={ `lsfh-add-inline lsfh-processor${
				row.processor ? '' : ' lsfh-processor--add'
			}` }
			title={ __(
				'Click to change who pays this out',
				'leftstack-financial-hub'
			) }
			onClick={ field.open }
		>
			{ row.processor ||
				__( '+ add processor', 'leftstack-financial-hub' ) }
		</button>
	);
}
