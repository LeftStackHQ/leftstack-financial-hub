// ── Label and value row (detail panels) ────────────────────────
export function Field( { label, value } ) {
	return (
		<div className="lsfh-drawer-field">
			<span className="lsfh-drawer-label">{ label }</span>
			<span className="lsfh-drawer-value">{ value }</span>
		</div>
	);
}
