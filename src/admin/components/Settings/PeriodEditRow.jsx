import { Check, X } from 'lucide-react';
import { SmartDate } from '../SmartDate';
import { ElectionTypeSelect } from './ElectionTypeSelect';

/**
 * A filing period row while it is being edited.
 *
 * @param {Object}   props
 * @param {Object}   props.editForm    The values being edited.
 * @param {Function} props.setEditForm Updates them.
 * @param {boolean}  props.noElec      True when the site has elections turned off.
 * @param {Function} props.onSave      Save the edit.
 * @param {Function} props.onCancel    Close the row without saving.
 */
export function PeriodEditRow( {
	editForm,
	setEditForm,
	noElec,
	onSave,
	onCancel,
} ) {
	return (
		<tr className="lsfh-table-tr--edit">
			<td>
				<input
					className="lsfh-input lsfh-table-input"
					style={ { width: '100%' } }
					value={ editForm.name }
					onChange={ ( e ) =>
						setEditForm( ( f ) => ( {
							...f,
							name: e.target.value,
						} ) )
					}
				/>
			</td>
			{ ! noElec && (
				<td>
					<ElectionTypeSelect
						value={ editForm.election_type }
						onChange={ ( v ) =>
							setEditForm( ( f ) => ( {
								...f,
								election_type: v,
							} ) )
						}
					/>
				</td>
			) }
			<td>
				<SmartDate
					className="lsfh-input lsfh-table-input"
					style={ { width: '100%' } }
					value={ editForm.start_date }
					onChange={ ( e ) =>
						setEditForm( ( f ) => ( {
							...f,
							start_date: e.target.value,
						} ) )
					}
				/>
			</td>
			<td>
				<SmartDate
					className="lsfh-input lsfh-table-input"
					style={ { width: '100%' } }
					value={ editForm.end_date }
					onChange={ ( e ) =>
						setEditForm( ( f ) => ( {
							...f,
							end_date: e.target.value,
						} ) )
					}
				/>
			</td>
			<td>
				<input
					type="number"
					className="lsfh-input lsfh-table-input lsfh-table-input--right"
					style={ { width: '100%' } }
					step="0.01"
					value={ editForm.beginning_balance }
					onChange={ ( e ) =>
						setEditForm( ( f ) => ( {
							...f,
							beginning_balance: e.target.value,
						} ) )
					}
				/>
			</td>
			<td className="lsfh-nowrap">
				<div className="td-actions">
					<button
						className="lsfh-icon-btn lsfh-icon-btn--save"
						onClick={ onSave }
						title="Save"
					>
						<Check size={ 14 } />
					</button>
					<button
						className="lsfh-icon-btn"
						onClick={ () => onCancel() }
						title="Cancel"
					>
						<X size={ 14 } />
					</button>
				</div>
			</td>
		</tr>
	);
}
