import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { fmtC } from '../shared';
import { VendorPicker } from './VendorPicker';

const EMPTY = { name: '', payees: [], pages: [] };

/**
 * Where the pickers' lists come from: everything seen in the data, plus a saved name that has no data any more.
 *
 * @param {Object[]} seen   The names seen: { name, ... }.
 * @param {string[]} saved  The names saved in the groups.
 * @param {Function} noteOf Given a seen entry, its short note.
 * @return {Object[]} { name, note } for each.
 */
function withSaved( seen, saved, noteOf ) {
	const known = new Set( seen.map( ( s ) => s.name.toLowerCase() ) );
	return [
		...seen.map( ( s ) => ( { name: s.name, note: noteOf( s ) } ) ),
		...saved
			.filter( ( n ) => ! known.has( n.toLowerCase() ) )
			.map( ( n ) => ( { name: n, note: '' } ) ),
	];
}

/**
 * Pop-up to set up the vendor groups: each has a name, the payees it is paid under and the fundraising pages it raises
 * money on. A payee or page can be in one group only.
 *
 * @param {Object}   props
 * @param {Object}   props.report  The vendor report (groups, pages, payees).
 * @param {Function} props.onSave  Called with the groups; resolves to true when they were saved.
 * @param {Function} props.onClose Closes the pop-up.
 */
export function VendorGroupsModal( { report, onSave, onClose } ) {
	const [ groups, setGroups ] = useState( () =>
		report.groups.length
			? report.groups.map( ( g ) => ( {
					name: g.name,
					payees: g.payees,
					pages: g.pages,
			  } ) )
			: [ { ...EMPTY } ]
	);
	const [ saving, setSaving ] = useState( false );
	const [ failed, setFailed ] = useState( false );

	const change = ( i, patch ) =>
		setGroups(
			groups.map( ( g, j ) => ( j === i ? { ...g, ...patch } : g ) )
		);
	const takenBy = ( i, key ) => ( name ) => {
		const other = groups.find(
			( g, j ) =>
				j !== i &&
				g[ key ].some( ( n ) => n.toLowerCase() === name.toLowerCase() )
		);
		return other
			? other.name || __( 'another group', 'leftstack-financial-hub' )
			: '';
	};

	const save = async () => {
		setSaving( true );
		setFailed( false );
		const ok = await onSave( groups.filter( ( g ) => g.name.trim() ) );
		setSaving( false );
		if ( ok ) {
			onClose();
		} else {
			setFailed( true );
		}
	};

	return (
		<div id="lsfh-modal-backdrop">
			<div className="lsfh-modal" style={ { maxWidth: 720 } }>
				<div className="lsfh-modal-header">
					<span>
						{ __( 'Vendor groups', 'leftstack-financial-hub' ) }
					</span>
					<button
						className="lsfh-icon-btn"
						onClick={ onClose }
						aria-label={ __( 'Close', 'leftstack-financial-hub' ) }
					>
						✕
					</button>
				</div>
				<div className="lsfh-modal-body">
					<p className="lsfh-meta lsfh-meta--mb">
						{ __(
							'A vendor is often paid under more than one name, and raises money on more than one page. Put them in one group to see what was spent on the vendor next to what its pages raised.',
							'leftstack-financial-hub'
						) }
					</p>
					{ groups.map( ( g, i ) => (
						<div key={ i } className="lsfh-vendor-group">
							<div className="lsfh-field">
								<label htmlFor={ `lsfh-vendor-name-${ i }` }>
									{ __(
										'Group name',
										'leftstack-financial-hub'
									) }
								</label>
								<input
									id={ `lsfh-vendor-name-${ i }` }
									className="lsfh-input"
									value={ g.name }
									maxLength={ 100 }
									onChange={ ( e ) =>
										change( i, { name: e.target.value } )
									}
								/>
							</div>
							<VendorPicker
								label={ __(
									'Payees',
									'leftstack-financial-hub'
								) }
								options={ withSaved(
									report.payees,
									g.payees,
									( p ) => fmtC( p.spent )
								) }
								selected={ g.payees }
								takenBy={ takenBy( i, 'payees' ) }
								onChange={ ( payees ) =>
									change( i, { payees } )
								}
							/>
							<VendorPicker
								label={ __(
									'Pages',
									'leftstack-financial-hub'
								) }
								options={ withSaved(
									report.pages,
									g.pages,
									( p ) =>
										sprintf(
											/* translators: 1: amount raised, 2: number of gifts. */
											__(
												'%1$s, %2$d gifts',
												'leftstack-financial-hub'
											),
											fmtC( p.raised ),
											p.gifts
										)
								) }
								selected={ g.pages }
								takenBy={ takenBy( i, 'pages' ) }
								onChange={ ( pages ) => change( i, { pages } ) }
							/>
							<button
								className="btn btn-ghost btn-sm"
								onClick={ () =>
									setGroups(
										groups.filter( ( _, j ) => j !== i )
									)
								}
							>
								{ __(
									'Remove this group',
									'leftstack-financial-hub'
								) }
							</button>
						</div>
					) ) }
					<button
						className="btn btn-ghost btn-sm"
						onClick={ () =>
							setGroups( [ ...groups, { ...EMPTY } ] )
						}
					>
						{ __( 'Add a group', 'leftstack-financial-hub' ) }
					</button>
					{ failed && (
						<p className="lsfh-meta" role="alert">
							{ __(
								'The groups could not be saved.',
								'leftstack-financial-hub'
							) }
						</p>
					) }
				</div>
				<div className="lsfh-modal-footer">
					<button className="btn btn-ghost" onClick={ onClose }>
						{ __( 'Cancel', 'leftstack-financial-hub' ) }
					</button>
					<button
						className="btn btn-primary"
						onClick={ save }
						disabled={ saving }
					>
						{ saving
							? __( 'Saving…', 'leftstack-financial-hub' )
							: __( 'Save', 'leftstack-financial-hub' ) }
					</button>
				</div>
			</div>
		</div>
	);
}
