import { BankMatchedMark, CheckToggle, fmtC } from '../shared';
import { PostedCell } from './PostedCell';
import { CatBadge, ExpenseStatusBadge, MethodBadge } from './parts';
import { Paperclip, Pencil, Trash2 } from 'lucide-react';

/**
 * One row of the Expenditures table: the checkbox, the payee and amounts, the receipt link, the Posted date and Balanced toggle, and the row's action icons.
 *
 * @param {Object}   props
 * @param {Set}      props.checked        Ids of the ticked rows.
 * @param {Function} props.del            Deletes an expense after confirming.
 * @param {Object}   props.e              The expenditure (a row of /expenditures).
 * @param {Object}   props.editing        The Posted cell being edited ({ id }), or null.
 * @param {Object}   props.selectedExp    The expense open in the detail panel, or null.
 * @param {Function} props.setEditExp     Sets the expense being edited.
 * @param {Function} props.setEditing     Opens or closes the Posted date editor.
 * @param {Function} props.setModal       Opens a modal by name.
 * @param {Function} props.setSelExp      Opens or closes the detail panel.
 * @param {Function} props.toggleBalanced Flips Balanced for an expense.
 * @param {Function} props.toggleCheck    Ticks or unticks a row ( id, event ).
 * @param {Function} props.updatePosted   Saves a new Posted date ( expense, date ).
 * @param {Object}   props.xcols          Column preferences, xcols.show( key ).
 */
export function ExpenseRow( {
	checked,
	del,
	e,
	editing,
	selectedExp,
	setEditExp,
	setEditing,
	setModal,
	setSelExp,
	toggleBalanced,
	toggleCheck,
	updatePosted,
	xcols,
} ) {
	return (
		<tr
			className={ `${
				selectedExp?.id === e.id ? 'lsfh-row-active' : ''
			}${ checked.has( e.id ) ? ' lsfh-row-checked' : '' }` }
			onClick={ ( ev ) => {
				if ( ! ev.target.closest( 'button,a,input' ) ) {
					setSelExp( e );
				}
			} }
		>
			<td
				className="lsfh-td-check"
				onClick={ ( ev ) => ev.stopPropagation() }
			>
				<input
					type="checkbox"
					checked={ checked.has( e.id ) }
					onChange={ ( ev ) => toggleCheck( e.id, ev ) }
				/>
			</td>
			<td className="lsfh-meta-sm">{ e.expense_date || '—' }</td>
			<td>
				<div className="lsfh-name-main">{ e.payee }</div>
				{ e.paid_by && (
					<div className="lsfh-name-sub">Paid by: { e.paid_by }</div>
				) }
			</td>
			{ xcols.show( 'category' ) && (
				<td>
					{ e.category_name ? (
						<CatBadge
							name={ e.category_name }
							catColor={ e.category_color || null }
						/>
					) : (
						<span className="lsfh-subtle">—</span>
					) }
				</td>
			) }
			{ xcols.show( 'description' ) && (
				<td className="lsfh-td-desc">{ e.description || '—' }</td>
			) }
			{ xcols.show( 'payout' ) && (
				<td className="lsfh-meta-sm">{ e.disbursement_id || '—' }</td>
			) }
			{ xcols.show( 'method' ) && (
				<td>
					<MethodBadge method={ e.payment_method } />
				</td>
			) }
			{ xcols.show( 'receipt' ) && (
				<td>
					{ e.receipt_url_resolved || e.receipt_url ? (
						<a
							href={ e.receipt_url_resolved || e.receipt_url }
							target="_blank"
							rel="noreferrer"
							className="lsfh-receipt-link"
							aria-label={ `View receipt for ${
								e.payee || 'expenditure'
							}` }
						>
							<Paperclip size={ 13 } />
						</a>
					) : (
						<button
							type="button"
							className="lsfh-add-inline"
							title="Add receipt"
							aria-label={ `Add receipt for ${
								e.payee || 'expenditure'
							}` }
							onClick={ ( ev ) => {
								ev.stopPropagation();
								setEditExp( e );
								setModal( 'edit' );
							} }
						>
							+ Add
						</button>
					) }
				</td>
			) }
			{ xcols.show( 'amount' ) && (
				<td className="lsfh-bold lsfh-amount negative">
					{ fmtC( e.amount ) }
				</td>
			) }
			{ xcols.show( 'status' ) && (
				<td className="lsfh-nowrap">
					<ExpenseStatusBadge row={ e } />
				</td>
			) }
			{ xcols.show( 'posted' ) && (
				<PostedCell
					e={ e }
					editing={ editing }
					setEditing={ setEditing }
					updatePosted={ updatePosted }
				/>
			) }
			{ xcols.show( 'balanced' ) && (
				<td className="lsfh-center">
					<CheckToggle
						on={ !! e.balanced }
						titleOn="Mark unbalanced"
						titleOff="Mark balanced"
						onClick={ ( ev ) => {
							ev.stopPropagation();
							toggleBalanced( e );
						} }
					/>
					{ e.bank_matched && <BankMatchedMark /> }
				</td>
			) }
			<td>
				<div className="td-actions">
					<button
						className="lsfh-icon-btn"
						title="Edit expenditure"
						aria-label={ `Edit expenditure for ${
							e.payee || 'payee'
						}` }
						onClick={ () => {
							setEditExp( e );
							setModal( 'edit' );
						} }
					>
						<Pencil size={ 14 } />
					</button>
					<button
						className="lsfh-icon-btn lsfh-icon-btn-danger"
						title="Delete expenditure"
						aria-label={ `Delete expenditure for ${
							e.payee || 'payee'
						}` }
						onClick={ () => del( e.id ) }
					>
						<Trash2 size={ 14 } />
					</button>
				</div>
			</td>
		</tr>
	);
}
