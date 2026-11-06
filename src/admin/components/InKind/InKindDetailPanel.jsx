import { onKeyActivate, Field, fmtC } from '../shared';

export function InKindDetailPanel( {
	item: d,
	periods,
	onClose,
	onEdit,
	onDelete,
} ) {
	const periodName =
		periods?.find( ( p ) => p.id === Number( d.filing_period_id ) )?.name ||
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
					<div style={ { flex: 1 } }>
						<div
							style={ {
								fontWeight: 700,
								fontSize: 'var(--fs-xl)',
								color: 'var(--ink)',
							} }
						>
							{ d.donor_name }
						</div>
						<div
							className="lsfh-meta-sm"
							style={ { marginTop: 2 } }
						>
							{ d.donation_date || '—' }
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
						{ d.occupation && (
							<Field label="Occupation" value={ d.occupation } />
						) }
						{ d.employer && (
							<Field label="Employer" value={ d.employer } />
						) }
					</div>

					{ /* ── Contribution ── */ }
					<div className="lsfh-drawer-section">
						<div className="lsfh-drawer-section-title">
							Contribution
						</div>
						<Field
							label="Fair Market Value"
							value={
								<span className="lsfh-amount positive">
									{ fmtC( d.value ) }
								</span>
							}
						/>
						<Field
							label="Donation Date"
							value={ d.donation_date || '—' }
						/>
						{ d.description && (
							<Field
								label="Description"
								value={ d.description }
							/>
						) }
						{ d.fec_report_date && (
							<Field
								label="FEC Report Date"
								value={ d.fec_report_date }
							/>
						) }
					</div>

					{ /* ── Filing ── */ }
					{ periodName && (
						<div className="lsfh-drawer-section">
							<div className="lsfh-drawer-section-title">
								Filing
							</div>
							<Field label="Filing Period" value={ periodName } />
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
					<button
						className="btn btn-ghost btn-sm"
						style={ { color: 'var(--alert)' } }
						onClick={ () => onDelete( d.id ) }
					>
						Delete
					</button>
				</div>
			</div>
		</>
	);
}
