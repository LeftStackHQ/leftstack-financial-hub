import { useState, useRef, useEffect } from '@wordpress/element';
import { ELECTION_TYPES, apiSend, fmtC } from '../shared';
import { Scissors } from 'lucide-react';

/* ─────────────── Split Modal ──────────────────────────────── */
export function SplitModal( { donation: d, onClose, onSplit } ) {
	const total = parseFloat( d.gross_amount ) || 0;
	const [ pAmt, setPAmt ] = useState( '' );
	const [ gAmt, setGAmt ] = useState( '' );
	const [ pElec, setPElec ] = useState( 'primary' );
	const [ gElec, setGElec ] = useState( 'general' );
	const [ saving, setSaving ] = useState( false );
	const [ msg, setMsg ] = useState( '' );

	// Auto-fill the second field as the remainder
	const onPChange = ( v ) => {
		setPAmt( v );
		const p = parseFloat( v ) || 0;
		const rem = Math.round( ( total - p ) * 100 ) / 100;
		if ( rem >= 0 ) {
			setGAmt( rem > 0 ? String( rem ) : '' );
		}
	};
	const onGChange = ( v ) => {
		setGAmt( v );
		const g = parseFloat( v ) || 0;
		const rem = Math.round( ( total - g ) * 100 ) / 100;
		if ( rem >= 0 ) {
			setPAmt( rem > 0 ? String( rem ) : '' );
		}
	};

	const pNum = parseFloat( pAmt ) || 0;
	const gNum = parseFloat( gAmt ) || 0;
	const sum = Math.round( ( pNum + gNum ) * 100 ) / 100;
	const valid =
		pNum > 0 &&
		gNum > 0 &&
		Math.abs( sum - total ) < 0.02 &&
		pElec !== gElec;

	const save = async () => {
		setSaving( true );
		setMsg( '' );
		try {
			const r = await apiSend( 'POST', `/donations/${ d.id }/split`, {
				primary_amount: pNum,
				general_amount: gNum,
				primary_election: pElec,
				general_election: gElec,
			} );
			const res = await r.json();
			if ( res.primary && res.general ) {
				window.lsfhToast( 'Donation split successfully.' );
				onSplit( res.primary, res.general );
				onClose();
			} else {
				setMsg( res.message || 'Split failed.' );
			}
		} catch {
			setMsg( 'Network error.' );
		}
		setSaving( false );
	};

	// Portion 1's amount field autofocuses when the modal opens (Portion 2
	// never does) — a ref + effect rather than the autoFocus JSX attribute,
	// since the latter trips jsx-a11y/no-autofocus even for this
	// user-triggered-open case.
	const pAmtRef = useRef( null );
	useEffect( () => {
		pAmtRef.current?.focus();
	}, [] );

	const portions = [
		{
			key: 'p',
			label: 'Portion 1',
			amt: pAmt,
			onAmt: onPChange,
			elec: pElec,
			onElec: setPElec,
			amtRef: pAmtRef,
		},
		{
			key: 'g',
			label: 'Portion 2',
			amt: gAmt,
			onAmt: onGChange,
			elec: gElec,
			onElec: setGElec,
			amtRef: null,
		},
	];

	return (
		<div
			style={ {
				position: 'fixed',
				inset: 0,
				background: 'rgba(0,0,0,.5)',
				zIndex: 99999,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: 24,
			} }
		>
			<div
				style={ {
					background: '#fff',
					borderRadius: 'var(--radius-lg)',
					width: '100%',
					maxWidth: 460,
					boxShadow: '0 8px 32px rgba(0,0,0,.18)',
					overflow: 'hidden',
				} }
			>
				{ /* Header */ }
				<div
					style={ {
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						padding: '16px 20px',
						borderBottom: '1px solid var(--border)',
					} }
				>
					<span
						style={ {
							display: 'flex',
							alignItems: 'center',
							gap: 8,
							fontWeight: 700,
							fontSize: 'var(--fs-xl)',
							color: 'var(--ink)',
						} }
					>
						<Scissors size={ 15 } /> Split Donation
					</span>
					<button
						style={ {
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							color: 'var(--muted)',
							fontSize: 'var(--fs-xl)',
							padding: '2px 6px',
							lineHeight: 1,
						} }
						onClick={ onClose }
					>
						✕
					</button>
				</div>

				<div style={ { padding: '18px 20px 12px' } }>
					<p
						style={ {
							fontSize: 'var(--fs-base)',
							color: 'var(--muted)',
							marginBottom: 18,
							lineHeight: 1.5,
						} }
					>
						Splitting{ ' ' }
						<strong style={ { color: 'var(--ink)' } }>
							{ fmtC( total ) }
						</strong>{ ' ' }
						from{ ' ' }
						<strong style={ { color: 'var(--ink)' } }>
							{ d.first_name } { d.last_name }
						</strong>{ ' ' }
						into two contributions.
					</p>

					{ /* Portion cards */ }
					{ portions.map(
						( {
							key,
							label,
							amt,
							onAmt,
							elec,
							onElec,
							amtRef,
						} ) => (
							<div
								key={ key }
								style={ {
									marginBottom: 10,
									border: '1px solid var(--border)',
									borderRadius: 'var(--radius-sm)',
									overflow: 'hidden',
								} }
							>
								<div
									style={ {
										padding: '7px 14px',
										background: 'var(--bg)',
										borderBottom: '1px solid var(--border)',
										fontSize: 'var(--fs-sm)',
										fontWeight: 700,
										color: 'var(--muted)',
										textTransform: 'uppercase',
										letterSpacing: '.05em',
									} }
								>
									{ label }
								</div>
								<div
									style={ {
										display: 'grid',
										gridTemplateColumns: '1fr 1fr',
										gap: 0,
									} }
								>
									<div
										style={ {
											padding: '12px 14px',
											borderRight:
												'1px solid var(--border)',
										} }
									>
										<label
											htmlFor={ `lsfh-donations-amount-${ key }` }
											className="lsfh-label"
											style={ { marginBottom: 4 } }
										>
											Amount ($)
										</label>
										<input
											id={ `lsfh-donations-amount-${ key }` }
											ref={ amtRef }
											className="lsfh-input"
											type="number"
											min="0.01"
											step="0.01"
											value={ amt }
											onChange={ ( e ) =>
												onAmt( e.target.value )
											}
											placeholder="0.00"
											style={ { margin: 0 } }
										/>
									</div>
									<div style={ { padding: '12px 14px' } }>
										<label
											htmlFor={ `lsfh-donations-election-type-${ key }` }
											className="lsfh-label"
											style={ { marginBottom: 4 } }
										>
											Election Type
										</label>
										<select
											id={ `lsfh-donations-election-type-${ key }` }
											className="lsfh-input"
											value={ elec }
											onChange={ ( e ) =>
												onElec( e.target.value )
											}
											style={ { margin: 0 } }
										>
											{ ELECTION_TYPES.map( ( t ) => (
												<option key={ t } value={ t }>
													{ t
														.charAt( 0 )
														.toUpperCase() +
														t.slice( 1 ) }
												</option>
											) ) }
										</select>
									</div>
								</div>
							</div>
						)
					) }

					{ /* Sum indicator */ }
					<div
						style={ {
							marginTop: 14,
							padding: '10px 14px',
							borderRadius: 'var(--radius-sm)',
							background:
								Math.abs( sum - total ) < 0.02
									? 'var(--p-xlt)'
									: '#FEF2F2',
							border: `1px solid ${
								Math.abs( sum - total ) < 0.02
									? 'var(--p-lt)'
									: '#FECACA'
							}`,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
						} }
					>
						<span
							style={ {
								fontSize: 'var(--fs-base)',
								color: 'var(--muted)',
							} }
						>
							{ fmtC( pNum ) } + { fmtC( gNum ) }
						</span>
						<span
							style={ {
								fontSize: 'var(--fs-base)',
								fontWeight: 700,
								color:
									Math.abs( sum - total ) < 0.02
										? 'var(--p)'
										: 'var(--alert)',
							} }
						>
							{ Math.abs( sum - total ) < 0.02
								? `= ${ fmtC( sum ) } ✓`
								: `= ${ fmtC( sum ) } · need ${ fmtC(
										total
								  ) }` }
						</span>
					</div>
					{ pElec === gElec && pElec && (
						<div
							style={ {
								fontSize: 'var(--fs-cmp)',
								color: 'var(--alert)',
								marginTop: 8,
							} }
						>
							Both portions must use different election types.
						</div>
					) }
					{ msg && (
						<div className="lsfh-error" style={ { marginTop: 8 } }>
							{ msg }
						</div>
					) }
				</div>

				{ /* Footer */ }
				<div
					style={ {
						display: 'flex',
						justifyContent: 'flex-end',
						gap: 8,
						padding: '12px 20px',
						borderTop: '1px solid var(--border)',
						background: 'var(--bg)',
					} }
				>
					<button
						className="btn btn-ghost btn-sm"
						onClick={ onClose }
					>
						Cancel
					</button>
					<button
						className="btn btn-primary btn-sm"
						onClick={ save }
						disabled={ ! valid || saving }
					>
						{ saving ? 'Splitting…' : 'Split Donation' }
					</button>
				</div>
			</div>
		</div>
	);
}
