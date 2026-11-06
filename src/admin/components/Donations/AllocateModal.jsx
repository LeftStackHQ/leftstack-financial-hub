import { useState, useEffect } from '@wordpress/element';
import { apiSend, fmtC } from '../shared';

/* ── Auto-Allocate Unitemized Modal ────────────────────────────────────── */
export function AllocateModal( { periodId, periodName, onClose, onDone } ) {
	const [ preview, setPreview ] = useState( null );
	const [ loading, setLoading ] = useState( true );
	const [ applying, setApplying ] = useState( false );

	useEffect( () => {
		apiSend( 'POST', `/donations/allocate-unitemized`, {
			filing_period_id: periodId,
			preview: true,
		} )
			.then( ( r ) => r.json() )
			.then( ( d ) => {
				setPreview( d );
				setLoading( false );
			} )
			.catch( () => setLoading( false ) );
	}, [ periodId ] );

	const apply = async () => {
		setApplying( true );
		const r = await apiSend( 'POST', `/donations/allocate-unitemized`, {
			filing_period_id: periodId,
			preview: false,
		} );
		const d = await r.json();
		window.lsfhToast(
			`Allocated: ${ d.unitemized_count } unitemized (${ fmtC(
				d.unitemized_net
			) }), ${ d.itemized_count } itemized.`
		);
		onDone();
	};

	return (
		<div id="lsfh-modal-backdrop">
			<div className="lsfh-modal" style={ { maxWidth: 460 } }>
				<div className="lsfh-modal-header">
					<span>Auto-Allocate Unitemized — { periodName }</span>
					<button className="lsfh-icon-btn" onClick={ onClose }>
						✕
					</button>
				</div>
				<div className="lsfh-modal-body">
					{ loading && (
						<div className="lsfh-loading">Calculating…</div>
					) }
					{ ! loading && ! preview && (
						<div className="lsfh-empty">
							Failed to load preview.
						</div>
					) }
					{ ! loading && preview && (
						<>
							<p
								style={ {
									margin: '0 0 16px',
									color: 'var(--slate)',
									fontSize: 'var(--fs-lg)',
									lineHeight: 1.5,
								} }
							>
								Found{ ' ' }
								<strong>{ preview.eligible_count }</strong>{ ' ' }
								contribution
								{ preview.eligible_count !== 1
									? 's'
									: '' }{ ' ' }
								under { fmtC( preview.threshold ) } in{ ' ' }
								<strong>{ periodName }</strong>. Smallest-first
								selection up to the{ ' ' }
								<strong>{ fmtC( preview.max_total ) }</strong>{ ' ' }
								quarterly cap:
							</p>
							<div className="lsfh-alloc-preview">
								<div className="lsfh-alloc-row unitemized">
									<div className="lsfh-alloc-count">
										{ preview.unitemized_count }
									</div>
									<div>
										<div className="lsfh-alloc-label">
											→ Unitemized
										</div>
										<div className="lsfh-alloc-sub">
											{ fmtC( preview.unitemized_net ) }{ ' ' }
											total
											{ preview.unitemized_refunded > 0 &&
												` (${ fmtC(
													preview.unitemized_total
												) } given, ${ fmtC(
													preview.unitemized_refunded
												) } refunded)` }
										</div>
									</div>
								</div>
								<div className="lsfh-alloc-row itemized">
									<div className="lsfh-alloc-count">
										{ preview.itemized_count }
									</div>
									<div>
										<div className="lsfh-alloc-label">
											→ Itemized
										</div>
										<div className="lsfh-alloc-sub">
											over { fmtC( preview.max_total ) }{ ' ' }
											cap
										</div>
									</div>
								</div>
							</div>
							{ preview.eligible_count === 0 && (
								<p
									style={ {
										color: 'var(--muted)',
										fontSize: 'var(--fs-base)',
										marginTop: 12,
									} }
								>
									No eligible contributions found for this
									period.
								</p>
							) }
						</>
					) }
				</div>
				<div className="lsfh-modal-footer">
					<button className="btn btn-ghost" onClick={ onClose }>
						Cancel
					</button>
					<button
						className="btn btn-primary"
						onClick={ apply }
						disabled={
							applying || loading || ! preview?.eligible_count
						}
					>
						{ applying ? 'Applying…' : 'Apply Allocation' }
					</button>
				</div>
			</div>
		</div>
	);
}
