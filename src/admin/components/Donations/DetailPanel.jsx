import { onKeyActivate, Field, fmtC, electionsHidden } from '../shared';
import { Scissors } from 'lucide-react';
import {
	ElectionBadge,
	ReportBadge,
	SourceBadge,
	DonationStatusBadge,
} from './parts';
import { fundraisingLabel } from './helpers';

const fundraisingHref = ( v ) => ( /^https?:\/\//.test( v || '' ) ? v : null );

/* ─────────────── Detail Drawer ──────────────────────────────── */
export function DetailPanel( {
	donation: d,
	periods,
	onClose,
	onEdit,
	onDelete,
	onShowSplit,
} ) {
	const fd = ( v ) => ( v ? String( v ).slice( 0, 10 ) : '—' );
	const periodName =
		periods?.find( ( p ) => p.id === Number( d.filing_period_id ) )?.name ||
		null;
	const hasActBlue =
		d.actblue_id ||
		d.disbursement_id ||
		d.refund_of_id ||
		d.fundraising_page ||
		d.reference_code ||
		d.disbursement_date ||
		d.payment_date;
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
					<div style={ { flex: 1 } }>
						<div
							style={ {
								fontWeight: 700,
								fontSize: 'var(--fs-xl)',
								color: 'var(--ink)',
							} }
						>
							{ d.first_name } { d.last_name }
						</div>
						<div
							className="lsfh-meta-sm"
							style={ { marginTop: 2 } }
						>
							{ [ d.city, d.state ]
								.filter( Boolean )
								.join( ', ' ) || '—' }
						</div>
					</div>
					<button className="lsfh-icon-btn" onClick={ onClose }>
						✕
					</button>
				</div>

				<div className="lsfh-drawer-body">
					{ /* ── Donor ── */ }
					<div className="lsfh-drawer-section">
						<div className="lsfh-drawer-section-title">Donor</div>
						{ d.address && (
							<Field label="Address" value={ d.address } />
						) }
						<Field
							label="City / State / ZIP"
							value={
								[ d.city, d.state, d.zip ]
									.filter( Boolean )
									.join( ', ' ) || '—'
							}
						/>
						{ d.occupation && (
							<Field label="Occupation" value={ d.occupation } />
						) }
						{ d.employer && (
							<Field label="Employer" value={ d.employer } />
						) }
						{ d.email && (
							<Field
								label="Email"
								value={
									<a href={ `mailto:${ d.email }` }>
										{ d.email }
									</a>
								}
							/>
						) }
						{ d.phone && (
							<Field
								label="Phone"
								value={
									<a href={ `tel:${ d.phone }` }>
										{ d.phone }
									</a>
								}
							/>
						) }
					</div>

					{ /* ── Contribution ── */ }
					<div className="lsfh-drawer-section">
						<div className="lsfh-drawer-section-title">
							Contribution
						</div>
						<Field
							label="Gross Amount"
							value={
								<span
									className={ `lsfh-amount ${
										d.gross_amount < 0
											? 'negative'
											: 'positive'
									}` }
								>
									{ fmtC( d.gross_amount ) }
								</span>
							}
						/>
						{ d.actblue_fee !== 0 && (
							<Field
								label="Fee"
								value={
									<span className="lsfh-amount-fee">
										{ fmtC( d.actblue_fee ) }
									</span>
								}
							/>
						) }
						<Field
							label="Net Amount"
							value={
								<span className="lsfh-amount">
									{ fmtC( d.net_amount ) }
								</span>
							}
						/>
						<Field
							label="Contribution Date"
							value={ fd( d.contribution_date ) }
						/>
						{ d.date_deposited && (
							<Field
								label="Date Deposited"
								value={ fd( d.date_deposited ) }
							/>
						) }
						<Field
							label="Payment Method"
							value={
								<SourceBadge
									source={ d.source }
									paymentType={ d.payment_type }
								/>
							}
						/>
						{ d.check_number && (
							<Field label="Check #" value={ d.check_number } />
						) }
						{ d.recurring && (
							<Field label="Recurring" value="Yes" />
						) }
					</div>

					{ /* ── Reporting ── */ }
					<div className="lsfh-drawer-section">
						<div className="lsfh-drawer-section-title">
							Reporting
						</div>
						{ ! electionsHidden() && (
							<Field
								label="Election"
								value={
									<ElectionBadge type={ d.election_type } />
								}
							/>
						) }
						<Field
							label="Report Type"
							value={ <ReportBadge type={ d.report_type } /> }
						/>
						<Field
							label="Filing Status"
							value={
								<DonationStatusBadge
									status={ d.reporting_status }
								/>
							}
						/>
						{ periodName && (
							<Field label="Filing Period" value={ periodName } />
						) }
						<Field
							label="Balanced to Bank"
							value={ d.balanced ? '✓ Yes' : 'No' }
						/>
					</div>

					{ /* ── ActBlue / Disbursement ── */ }
					{ hasActBlue && (
						<div className="lsfh-drawer-section">
							<div className="lsfh-drawer-section-title">
								Disbursement
							</div>
							{ d.fundraising_page && (
								<Field
									label="Fundraising Page"
									value={
										fundraisingHref(
											d.fundraising_page
										) ? (
											<a
												href={ fundraisingHref(
													d.fundraising_page
												) }
												target="_blank"
												rel="noreferrer noopener"
												style={ {
													fontSize: 'var(--fs-cmp)',
												} }
											>
												{ fundraisingLabel(
													d.fundraising_page
												) }
											</a>
										) : (
											<code
												style={ {
													fontSize: 'var(--fs-cmp)',
												} }
											>
												{ d.fundraising_page }
											</code>
										)
									}
								/>
							) }
							{ d.reference_code && (
								<Field
									label="Reference Code"
									value={
										<code
											style={ {
												fontSize: 'var(--fs-cmp)',
											} }
										>
											{ d.reference_code }
										</code>
									}
								/>
							) }
							{ d.actblue_id && (
								<Field
									label="Receipt"
									value={
										<code
											style={ {
												fontSize: 'var(--fs-cmp)',
											} }
										>
											{ d.actblue_id }
										</code>
									}
								/>
							) }
							{ d.disbursement_id && (
								<Field
									label="Disbursement ID"
									value={
										<code
											style={ {
												fontSize: 'var(--fs-cmp)',
											} }
										>
											{ d.disbursement_id }
										</code>
									}
								/>
							) }
							{ d.disbursement_date && (
								<Field
									label="Disbursement Date"
									value={ fd( d.disbursement_date ) }
								/>
							) }
							{ d.payment_date && (
								<Field
									label="Payment Date"
									value={ fd( d.payment_date ) }
								/>
							) }
							{ d.refund_of_id && (
								<Field
									label="Refund of"
									value={
										<span
											style={ {
												display: 'flex',
												alignItems: 'center',
												gap: 6,
											} }
										>
											<code
												style={ {
													fontSize: 'var(--fs-cmp)',
												} }
											>
												#{ d.refund_of_id }
											</code>
											<span
												className="badge"
												style={ {
													background:
														'var(--alert-lt)',
													color: 'var(--alert)',
													fontSize: 'var(--fs-micro)',
													padding: '1px 6px',
													borderRadius:
														'var(--radius-full)',
												} }
											>
												Refund
											</span>
										</span>
									}
								/>
							) }
						</div>
					) }

					{ /* ── Notes ── */ }
					{ d.notes && (
						<div className="lsfh-drawer-section">
							<div className="lsfh-drawer-section-title">
								Notes
							</div>
							<div
								className="lsfh-meta"
								style={ { lineHeight: 1.6 } }
							>
								{ d.notes }
							</div>
						</div>
					) }
				</div>

				<div className="lsfh-drawer-footer">
					<button
						className="btn btn-primary btn-sm"
						onClick={ () => onEdit( d ) }
					>
						Edit
					</button>
					{ ! electionsHidden() && (
						<button
							className="btn btn-ghost btn-sm"
							style={ {
								display: 'flex',
								alignItems: 'center',
								gap: 5,
							} }
							onClick={ () => onShowSplit( d ) }
							title="Split between elections"
						>
							<Scissors size={ 13 } /> Split
						</button>
					) }
					<button
						className="btn btn-ghost btn-sm"
						style={ { color: 'var(--alert)', marginLeft: 'auto' } }
						onClick={ () => onDelete( d.id ) }
					>
						Delete
					</button>
				</div>
			</div>
		</>
	);
}
