// ── FilterChip ────────────────────────────────────────────────────────────────

export function FilterChip( { icon, label, onRemove } ) {
	return (
		<span
			style={ {
				display: 'inline-flex',
				alignItems: 'center',
				gap: 5,
				height: 26,
				padding: '0 8px',
				background: 'var(--p-xlt)',
				border: '1px solid var(--p-lt)',
				borderRadius: 'var(--radius-sm)',
				fontSize: 'var(--fs-cmp)',
				color: 'var(--p)',
				whiteSpace: 'nowrap',
			} }
		>
			{ icon }
			{ label }
			<button
				style={ {
					border: 'none',
					background: 'none',
					cursor: 'pointer',
					color: 'var(--p)',
					fontSize: 'var(--fs-lg)',
					lineHeight: 1,
					padding: 0,
					display: 'flex',
					alignItems: 'center',
				} }
				onClick={ onRemove }
				aria-label={ `Remove ${ label } filter` }
			>
				×
			</button>
		</span>
	);
}
