import { useState, useRef, useEffect } from '@wordpress/element';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';

// ── MoreFiltersBtn (Donations-specific — pass fundraisingLabel from parent) ───

export function MoreFiltersBtn( {
	fPage,
	fState,
	fCity,
	fZip,
	fAmountMin,
	fAmountMax,
	fElection,
	fStatus,
	electionOptions,
	statusOptions,
	pageOptions,
	onChange,
	fundraisingLabel: fLabel,
} ) {
	const [ open, setOpen ] = useState( false );
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
	const activeCount = [
		fPage,
		fState,
		fCity,
		fZip,
		fAmountMin,
		fAmountMax,
		fElection,
		fStatus,
	].filter( Boolean ).length;
	return (
		<div ref={ ref } style={ { position: 'relative' } }>
			<button
				className={ `lsfh-input${
					activeCount ? ' lsfh-filter-active' : ''
				}` }
				style={ {
					cursor: 'pointer',
					display: 'inline-flex',
					alignItems: 'center',
					gap: 5,
					height: 34,
					padding: '0 10px',
					fontFamily: 'inherit',
					fontSize: 'var(--fs-base)',
					whiteSpace: 'nowrap',
				} }
				onClick={ () => setOpen( ( o ) => ! o ) }
			>
				<SlidersHorizontal size={ 13 } />
				{ activeCount ? `Filters (${ activeCount })` : 'More' }
				<ChevronDown size={ 12 } style={ { flexShrink: 0 } } />
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
						padding: '12px 14px',
					} }
				>
					<div
						style={ {
							display: 'flex',
							flexDirection: 'column',
							gap: 10,
						} }
					>
						<div
							style={ {
								display: 'grid',
								gridTemplateColumns: '1fr 1fr',
								gap: 8,
							} }
						>
							{ electionOptions && electionOptions.length > 0 && (
								<div className="lsfh-field">
									<label htmlFor="lsfh-more-election">
										Election
									</label>
									<select
										id="lsfh-more-election"
										className="lsfh-input"
										style={ { width: '100%' } }
										value={ fElection }
										onChange={ ( e ) =>
											onChange(
												'fElection',
												e.target.value
											)
										}
									>
										<option value="">All elections</option>
										{ electionOptions.map( ( o ) => (
											<option
												key={ o.value }
												value={ o.value }
											>
												{ o.label }
											</option>
										) ) }
									</select>
								</div>
							) }
							{ statusOptions && statusOptions.length > 0 && (
								<div className="lsfh-field">
									<label htmlFor="lsfh-more-status">
										Status
									</label>
									<select
										id="lsfh-more-status"
										className="lsfh-input"
										style={ { width: '100%' } }
										value={ fStatus }
										onChange={ ( e ) =>
											onChange(
												'fStatus',
												e.target.value
											)
										}
									>
										<option value="">All statuses</option>
										{ statusOptions.map( ( o ) => (
											<option
												key={ o.value }
												value={ o.value }
											>
												{ o.label }
											</option>
										) ) }
									</select>
								</div>
							) }
						</div>
						{ pageOptions && pageOptions.length > 0 && (
							<div className="lsfh-field">
								<label htmlFor="lsfh-components-fundraising-event">
									Fundraising event
								</label>
								<select
									id="lsfh-components-fundraising-event"
									className="lsfh-input"
									style={ { width: '100%' } }
									value={ fPage }
									onChange={ ( e ) =>
										onChange( 'fPage', e.target.value )
									}
								>
									<option value="">All events</option>
									{ pageOptions.map( ( p ) => (
										<option key={ p } value={ p }>
											{ fLabel ? fLabel( p ) : p }
										</option>
									) ) }
								</select>
							</div>
						) }
						<div
							style={ {
								display: 'grid',
								gridTemplateColumns: '1.3fr 0.7fr 1fr',
								gap: 8,
							} }
						>
							<div className="lsfh-field">
								<label htmlFor="lsfh-components-city">
									City
								</label>
								<input
									id="lsfh-components-city"
									className="lsfh-input"
									style={ { width: '100%', minWidth: 0 } }
									value={ fCity }
									onChange={ ( e ) =>
										onChange( 'fCity', e.target.value )
									}
								/>
							</div>
							<div className="lsfh-field">
								<label htmlFor="lsfh-components-state">
									State
								</label>
								<input
									id="lsfh-components-state"
									className="lsfh-input"
									style={ { width: '100%', minWidth: 0 } }
									maxLength={ 2 }
									value={ fState }
									onChange={ ( e ) =>
										onChange(
											'fState',
											e.target.value.toUpperCase()
										)
									}
								/>
							</div>
							<div className="lsfh-field">
								<label htmlFor="lsfh-components-zip">ZIP</label>
								<input
									id="lsfh-components-zip"
									className="lsfh-input"
									style={ { width: '100%' } }
									maxLength={ 10 }
									value={ fZip }
									onChange={ ( e ) =>
										onChange( 'fZip', e.target.value )
									}
								/>
							</div>
						</div>
						<div
							style={ {
								display: 'grid',
								gridTemplateColumns: '1fr 1fr',
								gap: 8,
							} }
						>
							<div className="lsfh-field">
								<label htmlFor="lsfh-components-amount-min">
									Min Amount
								</label>
								<input
									id="lsfh-components-amount-min"
									className="lsfh-input"
									style={ { width: '100%' } }
									type="number"
									min="0"
									step="0.01"
									placeholder="$0"
									value={ fAmountMin }
									onChange={ ( e ) =>
										onChange( 'fAmountMin', e.target.value )
									}
								/>
							</div>
							<div className="lsfh-field">
								<label htmlFor="lsfh-components-amount-max">
									Max Amount
								</label>
								<input
									id="lsfh-components-amount-max"
									className="lsfh-input"
									style={ { width: '100%' } }
									type="number"
									min="0"
									step="0.01"
									placeholder="No limit"
									value={ fAmountMax }
									onChange={ ( e ) =>
										onChange( 'fAmountMax', e.target.value )
									}
								/>
							</div>
						</div>
					</div>
				</div>
			) }
		</div>
	);
}
