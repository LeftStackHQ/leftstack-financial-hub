import { useState } from '@wordpress/element';
import { apiSend, todayISO, overLimitText } from '../shared';
import { __, _n, sprintf } from '@wordpress/i18n';
import { SmartDate } from '../SmartDate';
import { SyncChanges } from './SyncChanges';

/* ─────────────── ActBlue Sync Modal ──────────────────────── */
export function SyncModal( { onClose, onDone } ) {
	const [ dateFrom, setDateFrom ] = useState(
		() => todayISO().slice( 0, 8 ) + '01'
	);
	const [ dateTo, setDateTo ] = useState( todayISO );
	const [ syncing, setSyncing ] = useState( false );
	const [ result, setResult ] = useState( null );

	const run = async () => {
		setSyncing( true );
		setResult( null );
		try {
			const r = await apiSend( 'POST', `/actblue/sync`, {
				date_from: dateFrom,
				date_to: dateTo,
			} );
			const d = await r.json();
			// WP_Error responses have a `code` field instead of `imported` — treat as error.
			if ( ! r.ok || d.code ) {
				setResult( {
					error:
						d.message ||
						'Sync failed. Check your ActBlue credentials in Settings.',
				} );
			} else {
				setResult( d );
				if ( d.imported > 0 ) {
					onDone();
				}
			}
		} catch {
			setResult( { error: 'Network error.' } );
		}
		setSyncing( false );
	};

	return (
		<div id="lsfh-modal-backdrop">
			<div className="lsfh-modal">
				<div className="lsfh-modal-header">
					<span>Sync from ActBlue</span>
					<button className="lsfh-icon-btn" onClick={ onClose }>
						✕
					</button>
				</div>
				<p
					style={ {
						marginBottom: 14,
						fontSize: 'var(--fs-base)',
						color: 'var(--muted)',
					} }
				>
					Filters by <strong>disbursement date</strong> — the date
					contributions were deposited to your bank account.
				</p>
				<div className="lsfh-two-col" style={ { marginBottom: 20 } }>
					<div className="lsfh-field">
						<label htmlFor="lsfh-donations-disbursed-from">
							Disbursed from
						</label>
						<SmartDate
							id="lsfh-donations-disbursed-from"
							value={ dateFrom }
							onChange={ ( e ) => setDateFrom( e.target.value ) }
						/>
					</div>
					<div className="lsfh-field">
						<label htmlFor="lsfh-donations-disbursed-to">
							Disbursed to
						</label>
						<SmartDate
							id="lsfh-donations-disbursed-to"
							value={ dateTo }
							onChange={ ( e ) => setDateTo( e.target.value ) }
						/>
					</div>
				</div>
				<p
					style={ {
						fontSize: 'var(--fs-sm)',
						color: 'var(--muted)',
						margin: '0 0 20px',
					} }
				>
					Each contribution&apos;s election comes from the filing
					period its date falls in (Settings → Filing Periods).
					Anything already in the system is skipped as a duplicate and
					keeps the election it has. Change those by editing them or
					with Set Election in the bulk bar. A phone number or email
					that is blank on a saved contribution is filled in from
					ActBlue; one that is there is left alone.
				</p>
				{ result && ! result.error && (
					<div
						style={ {
							marginBottom: 16,
							padding: '10px 14px',
							background: 'var(--green-lt)',
							borderRadius: 'var(--radius-sm)',
							fontSize: 'var(--fs-base)',
							color: 'var(--green)',
						} }
					>
						✓ Sync finished. { result.imported } new contribution
						{ result.imported !== 1 ? 's' : '' } imported.
						{ result.duplicates > 0 && (
							<span>
								{ ' ' }
								{ result.duplicates } already in database
								(skipped).
							</span>
						) }
						{ result.pending > 0 && (
							<span>
								{ ' ' }
								{ result.pending } not yet disbursed by ActBlue
								(skipped).
							</span>
						) }
					</div>
				) }
				{ result && ! result.error && (
					<SyncChanges result={ result } />
				) }
				{ result?.no_period > 0 && (
					<div
						style={ {
							marginBottom: 16,
							padding: '10px 14px',
							background: 'var(--alert-lt)',
							borderRadius: 'var(--radius-sm)',
							fontSize: 'var(--fs-base)',
							color: 'var(--alert)',
						} }
					>
						⚠ { result.no_period } contribution
						{ result.no_period !== 1 ? 's' : '' } fall outside every
						filing period, so
						{ result.no_period !== 1 ? ' they have' : ' it has' } no
						election yet. Add the period in Settings, or set the
						election by hand.
					</div>
				) }
				{ result?.over_limit?.length > 0 && (
					<div
						style={ {
							marginBottom: 16,
							padding: '10px 14px',
							background: 'var(--alert-lt)',
							borderRadius: 'var(--radius-sm)',
							fontSize: 'var(--fs-base)',
							color: 'var(--alert)',
						} }
					>
						⚠{ ' ' }
						{ sprintf(
							/* translators: %d: number of donors. */
							_n(
								'%d donor is now over a contribution limit:',
								'%d donors are now over a contribution limit:',
								result.over_limit.length,
								'leftstack-financial-hub'
							),
							result.over_limit.length
						) }
						{ result.over_limit.slice( 0, 10 ).map( ( o ) => (
							<div key={ `${ o.name }-${ o.election }` }>
								{ overLimitText( o ) }
							</div>
						) ) }
						{ result.over_limit.length > 10 && (
							<div>
								{ sprintf(
									/* translators: %d: number of donors not listed. */
									__(
										'and %d more. See the Donors tab.',
										'leftstack-financial-hub'
									),
									result.over_limit.length - 10
								) }
							</div>
						) }
					</div>
				) }
				{ result?.failed > 0 && (
					<div
						style={ {
							marginBottom: 16,
							padding: '10px 14px',
							background: 'var(--alert-lt)',
							borderRadius: 'var(--radius-sm)',
							fontSize: 'var(--fs-base)',
							color: 'var(--alert)',
						} }
					>
						⚠ { result.failed } row
						{ result.failed !== 1 ? 's' : '' } failed to save.
						{ ( result.failures || [] ).map( ( f ) => (
							<div key={ f.actblue_id }>
								{ f.actblue_id }: { f.reason }
							</div>
						) ) }
					</div>
				) }
				{ result?.error && (
					<div
						style={ {
							marginBottom: 16,
							padding: '10px 14px',
							background: 'var(--alert-lt)',
							borderRadius: 'var(--radius-sm)',
							fontSize: 'var(--fs-base)',
							color: 'var(--alert)',
						} }
					>
						{ result.error }
					</div>
				) }
				<div className="lsfh-edit-footer">
					<button
						className="btn btn-primary"
						onClick={ run }
						disabled={ syncing }
					>
						{ syncing ? 'Syncing…' : 'Sync Now' }
					</button>
					<button className="btn btn-ghost" onClick={ onClose }>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}
