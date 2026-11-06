import { onKeyActivate } from '../shared';

/**
 * The pieces every click-to-edit cell of a table row needs, so each cell does not repeat them. Call it once per row with the
 * row and the cell being edited; it returns a function that, given a field name, says whether that cell is open, how to open
 * it from the keyboard or mouse, and what Enter and Escape do inside its editor (Enter saves by leaving the field, Escape
 * closes without saving).
 *
 * @param {Object}   row        The table row (needs id).
 * @param {Object}   editing    The cell being edited ({ id, field }) or null.
 * @param {Function} setEditing Opens or closes an editor.
 * @return {Function} field => { active, open, trigger, keys }.
 */
export function inlineField( row, editing, setEditing ) {
	return ( field ) => {
		const open = () => setEditing( { id: row.id, field } );
		return {
			active: editing?.id === row.id && editing?.field === field,
			open,
			trigger: {
				onClick: open,
				onKeyDown: onKeyActivate( open ),
				role: 'button',
				tabIndex: 0,
			},
			keys: ( e ) => {
				if ( e.key === 'Enter' ) {
					e.target.blur();
				}
				if ( e.key === 'Escape' ) {
					setEditing( null );
				}
			},
		};
	};
}
