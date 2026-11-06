import { SyncChanges } from './SyncChanges';

/**
 * Step 3 of the donations CSV import: what was imported, updated and skipped, and why.
 *
 * @param {Object}   props
 * @param {Object}   props.result  The import response (imported, updated, skipped_*, errors).
 * @param {Function} props.onClose Closes the pop-up.
 */
export function ImportResultStep( { result, onClose } ) {
	return (
		<>
			<div
				style={ {
					display: 'flex',
					gap: 24,
					justifyContent: 'center',
					padding: '20px 0 8px',
					flexWrap: 'wrap',
				} }
			>
				<div style={ { textAlign: 'center' } }>
					<div
						style={ {
							fontSize: 'var(--fs-4xl)',
							fontWeight: 800,
							color: 'var(--p)',
							lineHeight: 1,
						} }
					>
						{ result.imported }
					</div>
					<div
						style={ {
							fontSize: 'var(--fs-lg)',
							color: 'var(--muted)',
						} }
					>
						imported
					</div>
				</div>
				{ result.updated > 0 && (
					<div style={ { textAlign: 'center' } }>
						<div
							style={ {
								fontSize: 'var(--fs-4xl)',
								fontWeight: 800,
								color: 'var(--slate)',
								lineHeight: 1,
							} }
						>
							{ result.updated }
						</div>
						<div
							style={ {
								fontSize: 'var(--fs-lg)',
								color: 'var(--muted)',
							} }
						>
							updated
						</div>
					</div>
				) }
			</div>
			<div style={ { marginBottom: 20 } } />
			<SyncChanges result={ result } />
			{ result.no_period > 0 && (
				<div
					style={ {
						textAlign: 'left',
						margin: '0 0 12px',
						padding: '10px 14px',
						background: 'var(--alert-lt)',
						borderRadius: 'var(--radius-sm)',
						fontSize: 'var(--fs-base)',
						color: 'var(--alert)',
					} }
				>
					⚠ { result.no_period } row
					{ result.no_period !== 1 ? 's' : '' } fall outside every
					filing period, so they have no election yet. Add the period
					in Settings, or set the election by hand.
				</div>
			) }
			{ ( result.skipped_dup > 0 || result.skipped_amount > 0 ) && (
				<div
					style={ {
						margin: '0 0 12px',
						padding: '10px 14px',
						background: 'var(--gold-lt)',
						borderRadius: 'var(--radius-sm)',
						fontSize: 'var(--fs-base)',
						color: 'var(--gold)',
					} }
				>
					{ result.skipped_dup > 0 && (
						<div>
							⚠ { result.skipped_dup } row
							{ result.skipped_dup !== 1 ? 's' : '' } skipped —
							already in your database (duplicate Receipt ID)
						</div>
					) }
					{ result.skipped_amount > 0 && (
						<div>
							⚠ { result.skipped_amount } row
							{ result.skipped_amount !== 1 ? 's' : '' } skipped —
							no amount found (check column mapping)
						</div>
					) }
				</div>
			) }
			{ result.errors?.length > 0 && (
				<div
					style={ {
						textAlign: 'left',
						margin: '0 0 12px',
						padding: '10px 14px',
						background: 'var(--alert-lt)',
						borderRadius: 'var(--radius-sm)',
						fontSize: 'var(--fs-cmp)',
						color: 'var(--alert)',
						maxHeight: 180,
						overflowY: 'auto',
					} }
				>
					<div
						style={ {
							fontWeight: 600,
							marginBottom: 4,
						} }
					>
						Details:
					</div>
					{ result.errors.map( ( e, i ) => (
						<div key={ i } style={ { marginBottom: 2 } }>
							{ e }
						</div>
					) ) }
				</div>
			) }
			<div className="lsfh-edit-footer">
				<button className="btn btn-primary" onClick={ onClose }>
					Done
				</button>
			</div>
		</>
	);
}
