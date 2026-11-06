import { useState } from '@wordpress/element';
import { apiSend, electionsHidden } from '../shared';
import { SmartDate } from '../SmartDate';

/* ─── General Tab ─────────────────────────────────────────── */
export function GeneralTab( { settings, onChange } ) {
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
			// The election fields are decided when the page loads, so a changed switch needs a fresh page.
			if ( !! d.no_elections !== electionsHidden() ) {
				window.location.reload();
			}
		} catch {
			setMsg( 'Error saving.' );
		}
		setSaving( false );
		setTimeout( () => setMsg( '' ), 3000 );
	};

	return (
		<div className="lsfh-settings-body">
			<div className="lsfh-section-hdr">Campaign</div>
			<div className="lsfh-two-col">
				<div className="lsfh-field">
					<label htmlFor="lsfh-settings-campaign-name">
						Campaign Name
					</label>
					<input
						id="lsfh-settings-campaign-name"
						type="text"
						value={ form.campaign_name }
						onChange={ ( e ) =>
							set( 'campaign_name', e.target.value )
						}
					/>
				</div>
				<div className="lsfh-field">
					<label htmlFor="lsfh-settings-election-date">
						Election Date
					</label>
					<SmartDate
						id="lsfh-settings-election-date"
						value={ form.election_date || '' }
						onChange={ ( e ) =>
							set( 'election_date', e.target.value )
						}
					/>
					<span className="hint">
						Used for the Election Day balance projection in the
						Budget tab.
					</span>
				</div>
			</div>
			<div className="lsfh-two-col">
				<div className="lsfh-field">
					<label htmlFor="lsfh-settings-overall-fundraising-goal">
						Overall Fundraising Goal
					</label>
					<input
						id="lsfh-settings-overall-fundraising-goal"
						type="number"
						step="100"
						min="0"
						value={ form.campaign_goal }
						onChange={ ( e ) =>
							set( 'campaign_goal', e.target.value )
						}
					/>
					<span className="hint">
						Dollar amount your campaign aims to raise total.
					</span>
				</div>
				<div className="lsfh-field">
					<label htmlFor="lsfh-settings-beginning-balance">
						Beginning Balance
					</label>
					<input
						id="lsfh-settings-beginning-balance"
						type="number"
						step="0.01"
						min="0"
						value={ form.beginning_balance }
						onChange={ ( e ) =>
							set( 'beginning_balance', e.target.value )
						}
					/>
					<span className="hint">
						Cash on hand at the start of this campaign cycle.
					</span>
				</div>
			</div>

			<div className="lsfh-section-hdr">Reporting</div>
			<div className="lsfh-two-col">
				<div className="lsfh-field">
					<label htmlFor="lsfh-settings-filing-state">
						Filing State
					</label>
					<select
						id="lsfh-settings-filing-state"
						value={ form.filing_state || '' }
						onChange={ ( e ) =>
							set( 'filing_state', e.target.value )
						}
						className="lsfh-input"
					>
						<option value="">— Select state</option>
						<option value="tn">Tennessee</option>
					</select>
					<span className="hint">
						Pre-selects the state in the Export tool.
					</span>
				</div>
				<div className="lsfh-field">
					<label htmlFor="lsfh-settings-unitemized-threshold">
						Unitemized Threshold
					</label>
					<input
						id="lsfh-settings-unitemized-threshold"
						type="number"
						step="1"
						min="0"
						value={ form.unitemized_threshold }
						onChange={ ( e ) =>
							set( 'unitemized_threshold', e.target.value )
						}
					/>
					<span className="hint">
						Used by Auto-Allocate only — contributions below this
						amount are eligible to be marked unitemized. Common
						values: TN $100, FEC $200. To run Auto-Allocate, go to
						Donations, select a filing period, and click the
						Auto-Allocate button in the toolbar.
					</span>
				</div>
			</div>

			<div className="lsfh-field">
				<label
					htmlFor="lsfh-settings-no-elections"
					className="lsfh-check-row"
				>
					<input
						id="lsfh-settings-no-elections"
						type="checkbox"
						checked={ !! form.no_elections }
						onChange={ ( e ) =>
							set( 'no_elections', e.target.checked )
						}
					/>
					My reports don&apos;t use elections (PAC or party)
				</label>
				<span className="hint">
					Hides the election fields and the contribution limits. New
					contributions and filing periods are marked Local. Records
					you already have are not changed.
				</span>
			</div>

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
