import { useState } from '@wordpress/element';
import { apiSend } from '../shared';

/* ─── Contribution Limits Tab ─────────────────────────────── */
export function LimitsTab( { settings, onChange } ) {
	const [ form, setForm ] = useState( { ...settings } );
	const [ saving, setSaving ] = useState( false );
	const [ msg, setMsg ] = useState( '' );
	const set = ( k, v ) => setForm( ( f ) => ( { ...f, [ k ]: v } ) );

	const save = async () => {
		setSaving( true );
		setMsg( '' );
		try {
			const r = await apiSend( 'POST', `/settings`, form );
			const d = await r.json();
			onChange( d );
			setMsg( '✓ Saved' );
		} catch {
			setMsg( 'Error saving.' );
		}
		setSaving( false );
		setTimeout( () => setMsg( '' ), 3000 );
	};

	return (
		<div className="lsfh-settings-body">
			<p className="page-desc">
				Set per-election contribution limits. These drive the maxed-out
				and near-limit warnings on the Donors view. Configure for your
				state and office type.
			</p>

			<div className="lsfh-section-hdr">Per-Election Limits</div>
			<label
				htmlFor="lsfh-settings-set-no-limit-e-target-checked"
				className="lsfh-check-row lsfh-check-row--mb"
			>
				<input
					id="lsfh-settings-set-no-limit-e-target-checked"
					type="checkbox"
					checked={ !! form.no_limit }
					onChange={ ( e ) => set( 'no_limit', e.target.checked ) }
				/>
				<span>
					<strong>No contribution limits</strong> — disable all limit
					warnings (e.g. Virginia)
				</span>
			</label>

			{ ! form.no_limit && (
				<>
					<div className="lsfh-three-col">
						<div className="lsfh-field">
							<label htmlFor="lsfh-settings-primary-limit">
								Primary Limit
							</label>
							<input
								id="lsfh-settings-primary-limit"
								type="number"
								step="100"
								min="0"
								value={ form.limit_primary }
								onChange={ ( e ) =>
									set( 'limit_primary', e.target.value )
								}
							/>
						</div>
						<div className="lsfh-field">
							<label htmlFor="lsfh-settings-general-limit">
								General Limit
							</label>
							<input
								id="lsfh-settings-general-limit"
								type="number"
								step="100"
								min="0"
								value={ form.limit_general }
								onChange={ ( e ) =>
									set( 'limit_general', e.target.value )
								}
							/>
						</div>
						<div className="lsfh-field">
							<label htmlFor="lsfh-settings-runoff-limit">
								Runoff Limit
							</label>
							<input
								id="lsfh-settings-runoff-limit"
								type="number"
								step="100"
								min="0"
								value={ form.limit_runoff }
								onChange={ ( e ) =>
									set( 'limit_runoff', e.target.value )
								}
							/>
						</div>
					</div>
					<div className="lsfh-field lsfh-field--narrow">
						<label htmlFor="lsfh-settings-near-limit-warning">
							Near-Limit Warning (%)
						</label>
						<input
							id="lsfh-settings-near-limit-warning"
							type="number"
							step="5"
							min="1"
							max="99"
							value={ form.near_limit_pct }
							onChange={ ( e ) =>
								set( 'near_limit_pct', e.target.value )
							}
						/>
						<span className="hint">
							Show warning when a donor reaches this % of the
							limit.
						</span>
					</div>
				</>
			) }

			<div className="lsfh-section-hdr lsfh-section-hdr--mt">
				PAC / Organization Limits
			</div>
			<p className="page-desc page-desc--flush">
				Organizations often have different per-election contribution
				limits than individuals. These apply to donors marked as an
				organization, except PACs and party committees, which have no
				limit. Choose the type of organization on the donation form.
			</p>
			{ ! form.no_limit && (
				<>
					<label
						htmlFor="lsfh-settings-set-org-no-limit-e-target-checked"
						className="lsfh-check-row lsfh-check-row--mb"
					>
						<input
							id="lsfh-settings-set-org-no-limit-e-target-checked"
							type="checkbox"
							checked={ !! form.org_no_limit }
							onChange={ ( e ) =>
								set( 'org_no_limit', e.target.checked )
							}
						/>
						<span>
							<strong>No limits for organizations</strong> —
							disable limit warnings for all organizations
						</span>
					</label>
					{ ! form.org_no_limit && (
						<div className="lsfh-three-col">
							<div className="lsfh-field">
								<label htmlFor="lsfh-settings-org-primary-limit">
									Org Primary Limit
								</label>
								<input
									id="lsfh-settings-org-primary-limit"
									type="number"
									step="100"
									min="0"
									value={ form.org_limit_primary }
									onChange={ ( e ) =>
										set(
											'org_limit_primary',
											e.target.value
										)
									}
								/>
							</div>
							<div className="lsfh-field">
								<label htmlFor="lsfh-settings-org-general-limit">
									Org General Limit
								</label>
								<input
									id="lsfh-settings-org-general-limit"
									type="number"
									step="100"
									min="0"
									value={ form.org_limit_general }
									onChange={ ( e ) =>
										set(
											'org_limit_general',
											e.target.value
										)
									}
								/>
							</div>
							<div className="lsfh-field">
								<label htmlFor="lsfh-settings-org-runoff-limit">
									Org Runoff Limit
								</label>
								<input
									id="lsfh-settings-org-runoff-limit"
									type="number"
									step="100"
									min="0"
									value={ form.org_limit_runoff }
									onChange={ ( e ) =>
										set(
											'org_limit_runoff',
											e.target.value
										)
									}
								/>
							</div>
						</div>
					) }
				</>
			) }
			{ form.no_limit && (
				<p className="hint hint--flush">
					No-limits mode is enabled globally — org limits are also
					disabled.
				</p>
			) }

			<div className="lsfh-edit-footer">
				<button
					className="btn btn-primary"
					onClick={ save }
					disabled={ saving }
				>
					{ saving ? 'Saving…' : 'Save' }
				</button>
				{ msg && (
					<span
						className={ `form-msg ${
							msg.startsWith( '✓' )
								? 'form-msg--ok'
								: 'form-msg--err'
						}` }
					>
						{ msg }
					</span>
				) }
			</div>
		</div>
	);
}
