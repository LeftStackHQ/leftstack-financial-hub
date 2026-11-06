// ── Table totals bar ───────────────────────────────────────────
// The summary under every list: how many rows, and any money totals that go
// with them. One component so every table reads the same.
//   stats: [ { label, value, tone } ]  tone: 'positive' | 'alert' | 'warn'
export function TableTotals( { count, stats = [] } ) {
	return (
		<div className="lsfh-table-totals">
			<span className="lsfh-totals-count">{ count }</span>
			{ stats.length > 0 && (
				<div className="lsfh-totals-stats">
					{ stats.map( ( stat ) => (
						<div
							key={ stat.label }
							className={ `lsfh-totals-stat${
								stat.tone
									? ` lsfh-totals-stat--${ stat.tone }`
									: ''
							}` }
						>
							<span className="lsfh-totals-label">
								{ stat.label }
							</span>
							<span className="lsfh-totals-value">
								{ stat.value }
							</span>
						</div>
					) ) }
				</div>
			) }
		</div>
	);
}
