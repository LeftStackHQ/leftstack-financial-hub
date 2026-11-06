import { useState } from '@wordpress/element';
import { apiSend } from '../shared';
import { RefreshCw } from 'lucide-react';

/* ─── Integrations Tab ────────────────────────────────────── */
export function IntegrationsTab( { settings, onChange } ) {
	const hasCredentials = !! (
		settings.actblue_username && settings.actblue_password
	);
	const [ form, setForm ] = useState( {
		actblue_username: settings.actblue_username || '',
		actblue_password: settings.actblue_password || '',
		actblue_committee_id: settings.actblue_committee_id || '',
	} );
	const [ saving, setSaving ] = useState( false );
	const [ testing, setTest ] = useState( false );
	const [ status, setStatus ] = useState( null ); // null | 'connected' | 'failed'
	const [ msg, setMsg ] = useState( '' );
	const set = ( k, v ) => setForm( ( f ) => ( { ...f, [ k ]: v } ) );

	const save = async () => {
		setSaving( true );
		setMsg( '' );
		setStatus( null );
		const r = await apiSend( 'POST', `/settings`, form );
		const d = await r.json();
		onChange( d );
		setMsg( '✓ Saved' );
		setSaving( false );
		setTimeout( () => setMsg( '' ), 3000 );
	};

	const test = async () => {
		setTest( true );
		setMsg( '' );
		setStatus( null );
		const r = await apiSend( 'POST', `/actblue/test` );
		const d = await r.json();
		setStatus( d.ok ? 'connected' : 'failed' );
		setMsg( d.ok ? '✓ ' + d.message : '✗ ' + d.message );
		setTest( false );
	};

	const badgeClass = () => {
		if ( status === 'connected' ) {
			return 'lsfh-conn-badge lsfh-conn-badge--ok';
		}
		if ( status === 'failed' ) {
			return 'lsfh-conn-badge lsfh-conn-badge--fail';
		}
		if ( ! hasCredentials ) {
			return 'lsfh-conn-badge lsfh-conn-badge--none';
		}
		return 'lsfh-conn-badge lsfh-conn-badge--saved';
	};

	const badgeLabel = () => {
		if ( status === 'connected' ) {
			return 'Connected';
		}
		if ( status === 'failed' ) {
			return 'Connection failed';
		}
		if ( ! hasCredentials ) {
			return 'Not configured';
		}
		return 'Configured';
	};

	return (
		<div className="lsfh-settings-body--md">
			<div className="lsfh-section-hdr">ActBlue</div>
			<div className="lsfh-integration-hdr">
				<p className="page-desc">
					Connect to the ActBlue API to automatically sync donations.
					If you don&apos;t have API access, you can still import
					donations manually via CSV on the Donations page.
				</p>
			</div>
			<div className="lsfh-conn-badge-wrap">
				<span className={ badgeClass() }>
					<span className="lsfh-conn-badge__dot" />
					{ badgeLabel() }
				</span>
			</div>
			<div className="lsfh-field">
				<label htmlFor="lsfh-settings-client-uuid">Client UUID</label>
				<input
					id="lsfh-settings-client-uuid"
					type="text"
					value={ form.actblue_username }
					onChange={ ( e ) =>
						set( 'actblue_username', e.target.value )
					}
					placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
				/>
			</div>
			<div className="lsfh-field">
				<label htmlFor="lsfh-settings-client-secret">
					Client Secret
				</label>
				<input
					id="lsfh-settings-client-secret"
					type="password"
					value={ form.actblue_password }
					onChange={ ( e ) =>
						set( 'actblue_password', e.target.value )
					}
				/>
			</div>
			<div className="lsfh-field">
				<label htmlFor="lsfh-settings-committee-id-optional">
					Committee ID <span className="hint">(optional)</span>
				</label>
				<input
					id="lsfh-settings-committee-id-optional"
					type="text"
					value={ form.actblue_committee_id }
					onChange={ ( e ) =>
						set( 'actblue_committee_id', e.target.value )
					}
				/>
			</div>
			<div className="lsfh-edit-footer">
				<button
					className="btn btn-primary"
					onClick={ save }
					disabled={ saving }
				>
					{ saving ? 'Saving…' : 'Save Credentials' }
				</button>
				<button
					className="btn btn-ghost"
					onClick={ test }
					disabled={
						testing ||
						! form.actblue_username ||
						! form.actblue_password
					}
				>
					<RefreshCw size={ 14 } />{ ' ' }
					{ testing ? 'Testing…' : 'Test Connection' }
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
