import { ELECTION_TYPES, electionLabels } from '../shared';

/**
 * The election a period name points to ("Pre-General" is General), or an empty string when it does not say.
 *
 * @param {string} name The period's name.
 * @return {string} primary, general, runoff, special, or ''.
 */
export function electionFromName( name ) {
	const found = [
		[ /general/i, 'general' ],
		[ /primary/i, 'primary' ],
		[ /run-?off/i, 'runoff' ],
		[ /special/i, 'special' ],
	].find( ( [ pattern ] ) => pattern.test( name ) );
	return found ? found[ 1 ] : '';
}

const electionOptions = () =>
	ELECTION_TYPES.map( ( t ) => ( {
		value: t,
		label: electionLabels()[ t ],
	} ) );

/**
 * The election type of a filing period: one of the elections in the list. A period saved long ago with a name of its
 * own shows as not chosen, so the person picks one of the list.
 *
 * @param {Object}   props
 * @param {string}   props.id       The select's id.
 * @param {string}   props.value    The chosen election type.
 * @param {Function} props.onChange Called with the new choice.
 */
export function ElectionTypeSelect( { id, value, onChange } ) {
	const chosen = ELECTION_TYPES.includes( value );
	return (
		<select
			id={ id }
			value={ chosen ? value : '' }
			onChange={ ( e ) => onChange( e.target.value ) }
		>
			{ ! chosen && (
				<option value="" disabled>
					Choose…
				</option>
			) }
			{ electionOptions().map( ( o ) => (
				<option key={ o.value } value={ o.value }>
					{ o.label }
				</option>
			) ) }
		</select>
	);
}
