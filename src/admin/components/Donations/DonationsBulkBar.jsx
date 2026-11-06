import { ELECTION_TYPES, electionsHidden } from '../shared';

/**
 * The bar that appears when rows are selected: bulk status changes, Set Election, Delete, and Select all matching.
 *
 * @param {Object}   props
 * @param {Function} props.bulk              Runs a bulk action on the ticked rows.
 * @param {Array}    props.donations         The rows on this page.
 * @param {Function} props.selectAllMatching Selects every row matching the filters, across all pages.
 * @param {Set}      props.selected          Ids of the ticked rows.
 * @param {boolean}  props.selectingAll      True while that is running.
 * @param {Function} props.setSel            Replaces the set of ticked rows.
 * @param {number}   props.total             Number of rows matching the filters.
 */
export function DonationsBulkBar( {
	bulk,
	donations,
	selectAllMatching,
	selected,
	selectingAll,
	setSel,
	total,
} ) {
	return (
		<>
			{ selected.size > 0 && (
				<div className="lsfh-bulk-bar">
					<span>{ selected.size } selected</span>
					{ donations.length > 0 &&
						donations.every( ( d ) => selected.has( d.id ) ) &&
						selected.size < total && (
							<button
								className="btn btn-ghost btn-sm"
								onClick={ selectAllMatching }
								disabled={ selectingAll }
							>
								{ selectingAll
									? 'Selecting…'
									: `Select all ${ total } matching` }
							</button>
						) }
					<button
						className="btn btn-ghost btn-sm"
						onClick={ () => bulk( 'itemized' ) }
					>
						Mark Itemized
					</button>
					<button
						className="btn btn-ghost btn-sm"
						onClick={ () => bulk( 'unitemized' ) }
					>
						Mark Unitemized
					</button>
					<button
						className="btn btn-ghost btn-sm"
						onClick={ () => bulk( 'filed' ) }
					>
						Mark Filed
					</button>
					<button
						className="btn btn-ghost btn-sm"
						onClick={ () => bulk( 'pending' ) }
					>
						Unmark Filed
					</button>
					<button
						className="btn btn-ghost btn-sm"
						onClick={ () => bulk( 'balanced' ) }
					>
						Mark Balanced
					</button>
					<button
						className="btn btn-ghost btn-sm"
						onClick={ () => bulk( 'unbalanced' ) }
					>
						Mark Unbalanced
					</button>
					{ ! electionsHidden() && (
						<select
							className="btn btn-ghost btn-sm"
							defaultValue=""
							onChange={ ( e ) => {
								if ( e.target.value ) {
									bulk( e.target.value );
								}
								e.target.value = '';
							} }
						>
							<option value="" disabled>
								Set Election…
							</option>
							{ ELECTION_TYPES.map( ( t ) => (
								<option key={ t } value={ t }>
									{ t.charAt( 0 ).toUpperCase() +
										t.slice( 1 ) }
								</option>
							) ) }
						</select>
					) }
					<button
						className="btn btn-danger btn-sm"
						onClick={ () => bulk( 'delete' ) }
					>
						Delete
					</button>
					<button
						className="btn btn-ghost btn-sm"
						onClick={ () => setSel( new Set() ) }
						style={ { marginLeft: 'auto' } }
					>
						Clear
					</button>
				</div>
			) }
		</>
	);
}
