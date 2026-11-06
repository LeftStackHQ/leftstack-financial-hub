import { useState, useRef, useEffect } from '@wordpress/element';
import { Calendar, X, ChevronDown } from 'lucide-react';
import {
	DATE_PRESETS,
	presetRange,
	monthLabel,
	monthRange,
	monthLabelShort,
} from './dates';

// ── DateFilterBtn ─────────────────────────────────────────────────────────────

export function DateFilterBtn( { label, months, onApply, onClear } ) {
	const [ open, setOpen ] = useState( false );
	const [ cFrom, setCFrom ] = useState( '' );
	const [ cTo, setCTo ] = useState( '' );
	const ref = useRef( null );
	useEffect( () => {
		const h = ( e ) => {
			if ( ref.current && ! ref.current.contains( e.target ) ) {
				setOpen( false );
			}
		};
		document.addEventListener( 'mousedown', h );
		return () => document.removeEventListener( 'mousedown', h );
	}, [] );
	const apply = ( from, to, lbl ) => {
		onApply( from, to, lbl );
		setOpen( false );
	};
	return (
		<div ref={ ref } style={ { position: 'relative' } }>
			<button
				className={ `lsfh-input${
					label ? ' lsfh-filter-active' : ''
				}` }
				style={ {
					cursor: 'pointer',
					display: 'inline-flex',
					alignItems: 'center',
					gap: 5,
					width: label ? 'auto' : 140,
					maxWidth: 210,
					height: 34,
					padding: '0 10px',
					fontFamily: 'inherit',
					fontSize: 'var(--fs-base)',
				} }
				onClick={ () => setOpen( ( o ) => ! o ) }
			>
				<Calendar size={ 13 } />
				<span
					style={ {
						flex: 1,
						textAlign: 'left',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					} }
				>
					{ label || 'All dates' }
				</span>
				{ label ? (
					<X
						size={ 12 }
						style={ { flexShrink: 0 } }
						onClick={ ( e ) => {
							e.stopPropagation();
							onClear();
						} }
					/>
				) : (
					<ChevronDown size={ 12 } style={ { flexShrink: 0 } } />
				) }
			</button>
			{ open && (
				<div
					style={ {
						position: 'absolute',
						top: 'calc(100% + 4px)',
						right: 0,
						zIndex: 300,
						background: 'var(--white)',
						border: '1px solid var(--border)',
						borderRadius: 'var(--radius-lg)',
						boxShadow: 'var(--shadow-md)',
						width: 320,
						overflow: 'hidden',
					} }
				>
					<div style={ { padding: '10px 12px' } }>
						<div
							style={ {
								fontSize: 'var(--fs-sm)',
								fontWeight: 600,
								color: 'var(--muted)',
								letterSpacing: '.06em',
								textTransform: 'uppercase',
								marginBottom: 7,
							} }
						>
							Quick select
						</div>
						<div
							style={ {
								display: 'grid',
								gridTemplateColumns: 'repeat(3, 1fr)',
								gap: 4,
							} }
						>
							{ DATE_PRESETS.map( ( p ) => {
								const r = presetRange( p.key );
								return (
									<button
										key={ p.key }
										className="btn btn-ghost btn-sm"
										style={ {
											textAlign: 'left',
											fontWeight:
												label === p.label ? 600 : 400,
											color:
												label === p.label
													? 'var(--p)'
													: undefined,
											background:
												label === p.label
													? 'var(--p-xlt)'
													: undefined,
										} }
										onClick={ () =>
											apply( r.from, r.to, p.label )
										}
									>
										{ p.label }
									</button>
								);
							} ) }
						</div>
					</div>
					{ months && months.length > 0 && (
						<>
							<div
								style={ {
									height: 1,
									background: 'var(--border-lt)',
								} }
							/>
							<div style={ { padding: '10px 12px' } }>
								<div
									style={ {
										fontSize: 'var(--fs-sm)',
										fontWeight: 600,
										color: 'var(--muted)',
										letterSpacing: '.06em',
										textTransform: 'uppercase',
										marginBottom: 7,
									} }
								>
									By month
								</div>
								<div
									style={ {
										display: 'grid',
										gridTemplateColumns: 'repeat(3, 1fr)',
										gap: 4,
										maxHeight: 132,
										overflowY: 'auto',
									} }
								>
									{ months.map( ( m ) => (
										<button
											key={ m }
											className="btn btn-ghost btn-sm"
											style={ {
												fontWeight:
													label === monthLabel( m )
														? 600
														: 400,
												color:
													label === monthLabel( m )
														? 'var(--p)'
														: undefined,
												background:
													label === monthLabel( m )
														? 'var(--p-xlt)'
														: undefined,
											} }
											onClick={ () => {
												const { from, to } =
													monthRange( m );
												apply(
													from,
													to,
													monthLabel( m )
												);
											} }
										>
											{ monthLabelShort( m ) }
										</button>
									) ) }
								</div>
							</div>
						</>
					) }
					<div
						style={ { height: 1, background: 'var(--border-lt)' } }
					/>
					<div style={ { padding: '10px 12px' } }>
						<div
							style={ {
								fontSize: 'var(--fs-sm)',
								fontWeight: 600,
								color: 'var(--muted)',
								letterSpacing: '.06em',
								textTransform: 'uppercase',
								marginBottom: 7,
							} }
						>
							Custom range
						</div>
						<div
							style={ {
								display: 'flex',
								alignItems: 'center',
								gap: 6,
								marginBottom: 8,
							} }
						>
							<input
								type="date"
								className="lsfh-input"
								aria-label="From date"
								value={ cFrom }
								onChange={ ( e ) => setCFrom( e.target.value ) }
								style={ {
									flex: 1,
									minWidth: 0,
									fontSize: 'var(--fs-base)',
								} }
							/>
							<span
								style={ {
									color: 'var(--subtle)',
									fontSize: 'var(--fs-cmp)',
								} }
							>
								→
							</span>
							<input
								type="date"
								className="lsfh-input"
								aria-label="To date"
								value={ cTo }
								onChange={ ( e ) => setCTo( e.target.value ) }
								style={ {
									flex: 1,
									minWidth: 0,
									fontSize: 'var(--fs-base)',
								} }
							/>
						</div>
						<button
							className="lsfh-header-btn"
							style={ {
								width: '100%',
								justifyContent: 'center',
								opacity: ! cFrom || ! cTo ? 0.5 : 1,
							} }
							disabled={ ! cFrom || ! cTo }
							onClick={ () =>
								apply( cFrom, cTo, `${ cFrom } – ${ cTo }` )
							}
						>
							Apply range
						</button>
					</div>
				</div>
			) }
		</div>
	);
}
