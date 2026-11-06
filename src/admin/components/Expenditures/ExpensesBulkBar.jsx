import { PAYMENT_METHODS } from './constants';
import { methodLabel } from './helpers';

/**
 * The bar that appears when expense rows are ticked: set category, method or Balanced for all of them, or delete them.
 *
 * @param {Object}   props
 * @param {string}   props.bulkBalanced    The Set balanced choice: '', '1' or '0'.
 * @param {string}   props.bulkCategory    The Set category choice (a category id, '0' for none, or '').
 * @param {Function} props.bulkDelete      Deletes the ticked expenses after confirming.
 * @param {string}   props.bulkMethod      The Set method choice, or ''.
 * @param {Function} props.bulkUpdate      Applies the chosen bulk changes to the ticked expenses.
 * @param {boolean}  props.bulkUpdating    True while that request runs.
 * @param {Array}    props.categories      Budget categories.
 * @param {Set}      props.checked         Ids of the ticked rows.
 * @param {Function} props.clearBulkFields Resets the three bulk choices.
 * @param {Function} props.setBulkBalanced Sets the Balanced choice.
 * @param {Function} props.setBulkCategory Sets the category choice.
 * @param {Function} props.setBulkMethod   Sets the method choice.
 * @param {Function} props.setChecked      Replaces the set of ticked rows.
 * @param {boolean}  props.someChecked     Whether any row on this page is ticked.
 */
export function ExpensesBulkBar( {
	bulkBalanced,
	bulkCategory,
	bulkDelete,
	bulkMethod,
	bulkUpdate,
	bulkUpdating,
	categories,
	checked,
	clearBulkFields,
	setBulkBalanced,
	setBulkCategory,
	setBulkMethod,
	setChecked,
	someChecked,
} ) {
	return (
		<>
			{ someChecked && (
				<div className="lsfh-bulk-bar">
					<span className="lsfh-bulk-count">
						{ checked.size } selected
					</span>

					<select
						className="lsfh-input lsfh-bulk-select"
						value={ bulkCategory }
						onChange={ ( e ) => setBulkCategory( e.target.value ) }
					>
						<option value="">Set category…</option>
						<option value="0">— Uncategorized</option>
						{ categories.map( ( c ) => (
							<option key={ c.id } value={ c.id }>
								{ c.name }
							</option>
						) ) }
					</select>
					<select
						className="lsfh-input lsfh-bulk-select"
						value={ bulkMethod }
						onChange={ ( e ) => setBulkMethod( e.target.value ) }
					>
						<option value="">Set method…</option>
						{ PAYMENT_METHODS.map( ( m ) => (
							<option key={ m } value={ m }>
								{ methodLabel( m ) }
							</option>
						) ) }
					</select>
					<select
						className="lsfh-input lsfh-bulk-select"
						value={ bulkBalanced }
						onChange={ ( e ) => setBulkBalanced( e.target.value ) }
					>
						<option value="">Set balanced…</option>
						<option value="1">✓ Balanced</option>
						<option value="0">— Unbalanced</option>
					</select>

					{ ( bulkCategory || bulkMethod || bulkBalanced ) && (
						<button
							className="btn btn-sm btn-primary"
							onClick={ bulkUpdate }
							disabled={ bulkUpdating }
						>
							{ bulkUpdating ? 'Applying…' : 'Apply' }
						</button>
					) }

					<div className="lsfh-flex-spacer" />

					<button
						className="btn btn-sm btn-danger"
						onClick={ bulkDelete }
					>
						Delete { checked.size }
					</button>
					<button
						className="btn btn-ghost btn-sm"
						onClick={ () => {
							setChecked( new Set() );
							clearBulkFields();
						} }
					>
						Clear
					</button>
				</div>
			) }
		</>
	);
}
