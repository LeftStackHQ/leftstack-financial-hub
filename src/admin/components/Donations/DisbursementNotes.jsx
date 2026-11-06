/**
 * The note on a payout (why it differs from the bank, who to ask). Click it to type; it is saved when you leave the field.
 *
 * @param {Object}   props
 * @param {Object}   props.row   The payout row from the disbursements list.
 * @param {Object}   props.field The notes cell from inlineField(): active, keys and trigger.
 * @param {Function} props.save  Saves one field and closes the editor.
 */
export function DisbursementNotes( { row, field, save } ) {
	return field.active ? (
		<input
			type="text"
			ref={ ( node ) => node?.focus() }
			defaultValue={ row.notes || '' }
			className="lsfh-input"
			style={ {
				width: 240,
				padding: '2px 6px',
				fontSize: 'var(--fs-cmp)',
			} }
			maxLength={ 500 }
			placeholder="Why it differs, who to ask…"
			onBlur={ ( e ) => save( row.id, 'notes', e.target.value ) }
			onKeyDown={ field.keys }
		/>
	) : (
		<span
			className="lsfh-payout-note"
			style={ {
				color: row.notes ? 'var(--ink)' : 'var(--subtle)',
			} }
			title={ row.notes || 'Click to add a note' }
			{ ...field.trigger }
		>
			{ row.notes || '+ Add note' }
		</span>
	);
}
