import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

/**
 * A searchable list of names to tick, for choosing the payees or pages of a vendor group. A name that another group
 * already has is shown but cannot be ticked here.
 *
 * @param {Object}   props
 * @param {string}   props.label    What the list holds (Payees, Pages), also its accessible name.
 * @param {Object[]} props.options  The names to choose from: { name, note }, note being a short amount or count.
 * @param {string[]} props.selected The names ticked in this group.
 * @param {Function} props.takenBy  Given a name, the name of the other group that has it, or ''.
 * @param {Function} props.onChange Called with the new list of ticked names.
 */
export function VendorPicker( {
	label,
	options,
	selected,
	takenBy,
	onChange,
} ) {
	const [ search, setSearch ] = useState( '' );
	const has = ( name ) =>
		selected.some( ( s ) => s.toLowerCase() === name.toLowerCase() );
	const shown = options.filter( ( o ) =>
		o.name.toLowerCase().includes( search.trim().toLowerCase() )
	);
	const toggle = ( name ) =>
		onChange(
			has( name )
				? selected.filter(
						( s ) => s.toLowerCase() !== name.toLowerCase()
				  )
				: [ ...selected, name ]
		);

	return (
		<div className="lsfh-field">
			<label htmlFor={ `lsfh-picker-${ label }` }>
				{ sprintf(
					/* translators: 1: what the list holds, 2: how many are ticked. */
					__( '%1$s (%2$d chosen)', 'leftstack-financial-hub' ),
					label,
					selected.length
				) }
			</label>
			<input
				id={ `lsfh-picker-${ label }` }
				className="lsfh-input"
				type="search"
				value={ search }
				placeholder={ __( 'Search', 'leftstack-financial-hub' ) }
				onChange={ ( e ) => setSearch( e.target.value ) }
			/>
			<div className="lsfh-picker-list">
				{ shown.map( ( o, n ) => {
					const other = has( o.name ) ? '' : takenBy( o.name );
					return (
						<label
							key={ o.name }
							htmlFor={ `lsfh-picker-${ label }-${ n }` }
							className={ `lsfh-picker-row${
								other ? ' taken' : ''
							}` }
						>
							<input
								id={ `lsfh-picker-${ label }-${ n }` }
								type="checkbox"
								checked={ has( o.name ) }
								disabled={ !! other }
								onChange={ () => toggle( o.name ) }
							/>
							<span>{ o.name }</span>
							<span className="lsfh-picker-note">
								{ other || o.note }
							</span>
						</label>
					);
				} ) }
				{ ! shown.length && (
					<div className="lsfh-picker-row taken">
						{ __( 'Nothing found.', 'leftstack-financial-hub' ) }
					</div>
				) }
			</div>
		</div>
	);
}
