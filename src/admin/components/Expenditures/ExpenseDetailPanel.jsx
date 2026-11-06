import { onKeyActivate, Field, fmtC } from '../shared';
import { Paperclip } from 'lucide-react';
import { MethodBadge } from './parts';

export function ExpenseDetailPanel( {
	expense: e,
	periods,
	onClose,
	onEdit,
	onDelete,
} ) {
	const periodName =
		periods?.find( ( p ) => p.id === Number( e.filing_period_id ) )?.name ||
		null;
	return (
		<>
			<div
				className="lsfh-drawer-backdrop"
				onClick={ onClose }
				onKeyDown={ onKeyActivate( onClose ) }
				role="button"
				tabIndex={ 0 }
				aria-label="Close"
			/>
			<div className="lsfh-drawer">
				<div className="lsfh-drawer-header">
					<div className="lsfh-drawer-header-info">
						<div className="lsfh-drawer-payee">{ e.payee }</div>
						{ e.address && (
							<div className="lsfh-meta-sm">{ e.address }</div>
						) }
					</div>
					<button className="lsfh-icon-btn" onClick={ onClose }>
						✕
					</button>
				</div>
				<div className="lsfh-drawer-body">
					{ /* ── Payment ── */ }
					<div className="lsfh-drawer-section">
						<div className="lsfh-drawer-section-title">Payment</div>
						<Field
							label="Amount"
							value={
								<span className="lsfh-amount negative">
									{ fmtC( e.amount ) }
								</span>
							}
						/>
						<Field
							label="Method"
							value={
								<MethodBadge method={ e.payment_method } />
							}
						/>
						{ e.check_number && (
							<Field label="Check #" value={ e.check_number } />
						) }
						<Field
							label="Expense Date"
							value={ e.expense_date || '—' }
						/>
						{ e.date_posted && (
							<Field
								label="Date Posted"
								value={ e.date_posted }
							/>
						) }
						{ e.paid_by && (
							<Field label="Paid By" value={ e.paid_by } />
						) }
					</div>

					{ /* ── Details ── */ }
					<div className="lsfh-drawer-section">
						<div className="lsfh-drawer-section-title">Details</div>
						{ e.category_name && (
							<Field
								label="Category"
								value={
									<span className="badge badge-slate">
										{ e.category_name }
									</span>
								}
							/>
						) }
						{ e.description && (
							<Field
								label="Description"
								value={ e.description }
							/>
						) }
						{ e.disbursement_id && (
							<Field label="Payout" value={ e.disbursement_id } />
						) }
					</div>

					{ /* ── Filing ── */ }
					<div className="lsfh-drawer-section">
						<div className="lsfh-drawer-section-title">Filing</div>
						{ periodName && (
							<Field label="Filing Period" value={ periodName } />
						) }
						<Field
							label="Balanced to Bank"
							value={ e.balanced ? '✓ Yes' : 'No' }
						/>
					</div>

					{ /* ── Receipt ── */ }
					{ ( e.receipt_url_resolved || e.receipt_url ) && (
						<div className="lsfh-drawer-section">
							<div className="lsfh-drawer-section-title">
								Receipt
							</div>
							<a
								href={ e.receipt_url_resolved || e.receipt_url }
								target="_blank"
								rel="noreferrer"
								className="lsfh-receipt-link"
							>
								<Paperclip size={ 12 } /> View receipt
							</a>
						</div>
					) }

					{ /* ── Notes ── */ }
					{ e.notes && (
						<div className="lsfh-drawer-section">
							<div className="lsfh-drawer-section-title">
								Notes
							</div>
							<div className="lsfh-meta lsfh-notes-text">
								{ e.notes }
							</div>
						</div>
					) }
				</div>
				<div className="lsfh-drawer-footer">
					<button
						className="btn btn-primary btn-sm"
						onClick={ () => onEdit( e ) }
					>
						Edit
					</button>
					<button
						className="btn btn-ghost btn-sm btn-ghost--danger"
						onClick={ () => onDelete( e.id ) }
					>
						Delete
					</button>
				</div>
			</div>
		</>
	);
}
