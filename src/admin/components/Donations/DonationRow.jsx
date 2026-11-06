import { BankMatchedMark, fmtC } from '../shared';
import { fundraisingLabel } from './helpers';
import { refundPrefill, isRefundEntry } from './refundPrefill';
import {
	DonationStatusBadge,
	ElectionBadge,
	ReportBadge,
	SourceBadge,
} from './parts';
import { Check, CornerDownLeft, Pencil, Trash2 } from 'lucide-react';

/**
 * One row of the Donations table: the checkbox, the donor, the amounts and statuses, and the row's action icons.
 *
 * @param {Object}   props
 * @param {Object}   props.cols           Column preferences, cols.show( key ).
 * @param {Object}   props.d              The donation (a row of /donations).
 * @param {Function} props.deleteDon      Deletes a donation after confirming.
 * @param {Set}      props.refundedIds    Ids of donations on this page that already have a refund.
 * @param {Set}      props.selected       Ids of the ticked rows.
 * @param {Object}   props.selectedDon    The donation open in the detail panel, or null.
 * @param {Function} props.setEditDon     Sets the donation being edited.
 * @param {Function} props.setModal       Opens a modal by name.
 * @param {Function} props.setRefundOf    Sets the starting values of a refund form.
 * @param {Function} props.setSelectedDon Opens or closes the detail panel.
 * @param {Function} props.toggleOne      Ticks or unticks one row.
 */
export function DonationRow( {
	cols,
	d,
	deleteDon,
	refundedIds,
	selected,
	selectedDon,
	setEditDon,
	setModal,
	setRefundOf,
	setSelectedDon,
	toggleOne,
} ) {
	return (
		<tr
			className={ `${
				selectedDon?.id === d.id ? 'lsfh-row-active' : ''
			}${ selected.has( d.id ) ? ' lsfh-row-checked' : '' }` }
			onClick={ ( e ) => {
				if ( ! e.target.closest( 'button,input,a' ) ) {
					setSelectedDon( d );
				}
			} }
		>
			<td className="lsfh-td-check">
				<input
					type="checkbox"
					checked={ selected.has( d.id ) }
					onChange={ () => toggleOne( d.id ) }
				/>
			</td>
			<td>
				<div className="lsfh-name-cell">
					<div className="lsfh-avatar">
						{ d.first_name?.[ 0 ] || '' }
						{ d.last_name?.[ 0 ] || '' }
					</div>
					<div>
						<div className="lsfh-name-main">
							{ d.first_name } { d.last_name }
						</div>
						<div className="lsfh-name-sub">
							{ [ d.city, d.state ]
								.filter( Boolean )
								.join( ', ' ) }
						</div>
						{ d.fundraising_page && (
							<div
								className="lsfh-name-sub"
								style={ {
									color: 'var(--p)',
									fontWeight: 500,
								} }
							>
								{ fundraisingLabel( d.fundraising_page ) }
							</div>
						) }
					</div>
				</div>
			</td>
			{ cols.show( 'source' ) && (
				<td>
					<SourceBadge
						source={ d.source }
						paymentType={ d.payment_type }
					/>
				</td>
			) }
			{ cols.show( 'gross' ) && (
				<td
					className={ `lsfh-amount ${
						d.gross_amount < 0 ? 'negative' : 'positive'
					}` }
				>
					{ fmtC( d.gross_amount ) }
				</td>
			) }
			{ cols.show( 'fee' ) && (
				<td className="lsfh-amount-fee">
					{ d.actblue_fee !== 0 &&
					d.actblue_fee !== null &&
					d.actblue_fee !== undefined
						? fmtC( d.actblue_fee )
						: '—' }
				</td>
			) }
			{ cols.show( 'net' ) && (
				<td className="lsfh-amount">{ fmtC( d.net_amount ) }</td>
			) }
			{ cols.show( 'election' ) && (
				<td>
					<ElectionBadge type={ d.election_type } />
				</td>
			) }
			{ cols.show( 'type' ) && (
				<td>
					<ReportBadge
						type={ d.report_type }
						isRefund={ isRefundEntry( d ) }
					/>
				</td>
			) }
			{ cols.show( 'status' ) && (
				<td>
					<DonationStatusBadge status={ d.reporting_status } />
				</td>
			) }
			{ cols.show( 'date' ) && (
				<td className="lsfh-meta-sm">{ d.contribution_date || '—' }</td>
			) }
			{ cols.show( 'balanced' ) && (
				<td
					style={ {
						textAlign: 'center',
					} }
				>
					{ d.balanced ? (
						<>
							<Check
								size={ 14 }
								style={ {
									color: 'var(--p)',
								} }
							/>
							<span className="lsfh-sr-only">Balanced</span>
							{ d.bank_matched && <BankMatchedMark /> }
						</>
					) : (
						<span className="lsfh-subtle">
							—<span className="lsfh-sr-only">Not balanced</span>
						</span>
					) }
				</td>
			) }
			<td>
				<div className="td-actions">
					<button
						className="lsfh-icon-btn"
						title="Edit"
						onClick={ () => {
							setEditDon( d );
							setModal( 'edit' );
						} }
					>
						<Pencil size={ 14 } />
					</button>
					{ parseFloat( d.gross_amount ) >= 0 &&
						! refundedIds.has( d.id ) && (
							<button
								className="lsfh-icon-btn"
								title="Refund this donation"
								onClick={ () => {
									setRefundOf( refundPrefill( d ) );
									setModal( 'refund' );
								} }
							>
								<CornerDownLeft size={ 14 } />
							</button>
						) }
					<button
						className="lsfh-icon-btn lsfh-icon-btn-danger"
						title="Delete"
						onClick={ () => deleteDon( d.id ) }
					>
						<Trash2 size={ 14 } />
					</button>
				</div>
			</td>
		</tr>
	);
}
