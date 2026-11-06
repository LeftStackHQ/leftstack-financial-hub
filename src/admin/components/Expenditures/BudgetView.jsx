import { useState, useCallback, useEffect } from '@wordpress/element';
import { apiGet, monthLabel, fmtC } from '../shared';
import { useLatestRequest } from '../../hooks/useLatestRequest';

/* ─────────────── Budget View ─────────────────────────────── */
export function BudgetView( { periods, months, onCategoryClick } ) {
	const [ subTab, setSubTab ] = useState( 'tracker' );
	const [ bMonth, setBMonth ] = useState( '' );
	const [ bData, setBData ] = useState( null );
	const [ loadingB, setLoadB ] = useState( false );

	const begin = useLatestRequest();
	const loadBudget = useCallback( () => {
		const isStale = begin();
		setLoadB( true );
		apiGet(
			`/budget`,
			bMonth ? `month=${ encodeURIComponent( bMonth ) }` : ''
		)
			.then( ( r ) => r.json() )
			.then( ( d ) => {
				if ( isStale() ) {
					return;
				}
				setBData( d );
				setLoadB( false );
			} )
			.catch( () => {
				if ( ! isStale() ) {
					setLoadB( false );
				}
			} );
	}, [ bMonth, begin ] );
	useEffect( () => {
		if ( subTab === 'tracker' ) {
			loadBudget();
		}
	}, [ subTab, loadBudget ] );

	const monthIdx = months.indexOf( bMonth );
	const prevMonth = () => setBMonth( months[ monthIdx + 1 ] ?? '' );
	const nextMonth = () => {
		if ( monthIdx <= 0 ) {
			setBMonth( '' );
		} else {
			setBMonth( months[ monthIdx - 1 ] );
		}
	};

	const cats = bData?.categories || [];
	const totalSpent = bData?.total_spent || 0;
	const totalBudget = cats.reduce( ( s, c ) => s + c.budget_amount, 0 );
	const maxSpent = Math.max( ...cats.map( ( c ) => c.spent ), 1 );
	const balance = bData?.balance ?? null;
	const electionDate = bData?.election_date || '';

	const statusBadge = ( c ) => {
		if ( ! c.budget_amount ) {
			return null;
		}
		const r = c.spent / c.budget_amount;
		if ( r >= 1 ) {
			return <span className="badge badge-red">Over budget</span>;
		}
		if ( r >= 0.8 ) {
			return <span className="badge badge-gold">Watch</span>;
		}
		return <span className="badge badge-teal">On track</span>;
	};

	return (
		<>
			<div className="lsfh-tabs lsfh-tabs--sub">
				<button
					className={ `lsfh-tab ${
						subTab === 'tracker' ? 'active' : ''
					}` }
					onClick={ () => setSubTab( 'tracker' ) }
				>
					Category Tracker
				</button>
				<button
					className={ `lsfh-tab ${
						subTab === 'periods' ? 'active' : ''
					}` }
					onClick={ () => setSubTab( 'periods' ) }
				>
					Filing Periods
				</button>
			</div>

			{ subTab === 'tracker' && (
				<>
					<div className="lsfh-filter-bar">
						<div className="lsfh-filter-pair">
							<span className="lsfh-filter-label">Period</span>
							<button
								className="btn btn-ghost btn-sm"
								onClick={ prevMonth }
								disabled={
									! months.length ||
									monthIdx >= months.length - 1
								}
							>
								‹
							</button>
							<select
								className="lsfh-input"
								value={ bMonth }
								onChange={ ( e ) =>
									setBMonth( e.target.value )
								}
							>
								<option value="">All time</option>
								{ months.map( ( m ) => (
									<option key={ m } value={ m }>
										{ monthLabel( m ) }
									</option>
								) ) }
							</select>
							<button
								className="btn btn-ghost btn-sm"
								onClick={ nextMonth }
								disabled={ ! bMonth }
							>
								›
							</button>
						</div>
					</div>

					{ ! bMonth && balance !== null && (
						<div className="lsfh-stats">
							<div className="lsfh-stat">
								<div className="lsfh-stat-label">
									Total Budget
								</div>
								<div className="lsfh-stat-value">
									{ fmtC( totalBudget ) }
								</div>
							</div>
							<div className="lsfh-stat">
								<div className="lsfh-stat-label">
									Total Spent
								</div>
								<div className="lsfh-stat-value">
									{ fmtC( totalSpent ) }
								</div>
							</div>
							<div
								className={ `lsfh-stat${
									balance >= 0 ? ' green' : ''
								}` }
							>
								<div className="lsfh-stat-label">
									Current Balance
								</div>
								<div className="lsfh-stat-value">
									{ fmtC( balance ) }
								</div>
							</div>
							{ electionDate && (
								<div
									className={ `lsfh-stat${
										balance >= 0 ? ' green' : ''
									}` }
								>
									<div className="lsfh-stat-label">
										Election Day Projection
									</div>
									<div className="lsfh-stat-value">
										{ fmtC( balance ) }
									</div>
									<div className="lsfh-stat-sub">
										{ electionDate }
									</div>
								</div>
							) }
						</div>
					) }
					{ bMonth && (
						<div className="lsfh-stats">
							<div className="lsfh-stat">
								<div className="lsfh-stat-label">
									Spent in { monthLabel( bMonth ) }
								</div>
								<div className="lsfh-stat-value">
									{ fmtC( totalSpent ) }
								</div>
							</div>
						</div>
					) }

					<div className="lsfh-box">
						{ loadingB && (
							<div className="lsfh-loading">Loading…</div>
						) }
						{ ! loadingB && cats.length === 0 && (
							<div className="lsfh-empty">
								No categories found. Add them in Settings →
								Budget Categories.
							</div>
						) }
						{ ! loadingB && cats.length > 0 && (
							<table className="lsfh-table">
								<thead>
									<tr>
										<th>Category</th>
										{ ! bMonth ? (
											<>
												<th>Budget</th>
												<th>Spent</th>
												<th>Remaining</th>
												<th style={ { minWidth: 120 } }>
													Progress
												</th>
												<th>Status</th>
											</>
										) : (
											<>
												<th>Spent</th>
												<th>% of Month</th>
												<th style={ { minWidth: 160 } }>
													Breakdown
												</th>
											</>
										) }
									</tr>
								</thead>
								<tbody>
									{ cats.map( ( c ) => {
										const pct =
											c.budget_amount > 0
												? Math.min(
														100,
														( c.spent /
															c.budget_amount ) *
															100
												  )
												: 0;
										const monthPct =
											totalSpent > 0
												? ( c.spent / totalSpent ) * 100
												: 0;
										const barW =
											totalSpent > 0
												? ( c.spent / maxSpent ) * 100
												: 0;
										const fillColor =
											c.color || 'var(--lsfh-accent)';
										return (
											<tr
												key={ c.id }
												className="lsfh-tr-pointer"
												title="View transactions"
												onClick={ () =>
													onCategoryClick(
														c.id,
														bMonth
													)
												}
											>
												<td>
													<div className="lsfh-name-cell">
														{ c.color && (
															<span
																className="lsfh-cat-dot"
																style={ {
																	background:
																		c.color,
																} }
															/>
														) }
														<span className="lsfh-name-main">
															{ c.name }
														</span>
													</div>
												</td>
												{ ! bMonth ? (
													<>
														<td className="lsfh-amount">
															{ c.budget_amount ? (
																fmtC(
																	c.budget_amount
																)
															) : (
																<span className="lsfh-subtle">
																	—
																</span>
															) }
														</td>
														<td className="lsfh-bold negative">
															{ c.spent > 0 ? (
																fmtC( c.spent )
															) : (
																<span className="lsfh-subtle">
																	$0
																</span>
															) }
														</td>
														<td>
															{ c.budget_amount ? (
																fmtC(
																	c.budget_amount -
																		c.spent
																)
															) : (
																<span className="lsfh-subtle">
																	—
																</span>
															) }
														</td>
														<td>
															{ c.budget_amount >
																0 && (
																<div className="lsfh-goal-track">
																	<div
																		className="lsfh-goal-fill"
																		style={ {
																			width: `${ pct }%`,
																			background:
																				fillColor,
																		} }
																	/>
																</div>
															) }
														</td>
														<td>
															{ statusBadge( c ) }
														</td>
													</>
												) : (
													<>
														<td className="lsfh-bold negative">
															{ c.spent > 0 ? (
																fmtC( c.spent )
															) : (
																<span className="lsfh-subtle">
																	$0
																</span>
															) }
														</td>
														<td className="lsfh-meta-sm">
															{ monthPct.toFixed(
																1
															) }
															%
														</td>
														<td>
															{ c.spent > 0 && (
																<div className="lsfh-goal-track">
																	<div
																		className="lsfh-goal-fill"
																		style={ {
																			width: `${ barW }%`,
																			background:
																				fillColor,
																		} }
																	/>
																</div>
															) }
														</td>
													</>
												) }
											</tr>
										);
									} ) }
								</tbody>
							</table>
						) }
					</div>
				</>
			) }

			{ subTab === 'periods' && (
				<div className="lsfh-box">
					<table className="lsfh-table">
						<thead>
							<tr>
								<th>Period</th>
								<th>Start</th>
								<th>End</th>
								<th>Election</th>
								<th>Beginning Balance</th>
							</tr>
						</thead>
						<tbody>
							{ periods.length === 0 && (
								<tr>
									<td colSpan={ 5 }>
										<div className="lsfh-empty">
											No filing periods. Add them in
											Settings → Filing Periods.
										</div>
									</td>
								</tr>
							) }
							{ periods.map( ( p ) => (
								<tr key={ p.id }>
									<td className="lsfh-bold">{ p.name }</td>
									<td className="lsfh-meta-sm">
										{ p.start_date }
									</td>
									<td className="lsfh-meta-sm">
										{ p.end_date }
									</td>
									<td>
										{ p.election_type
											? p.election_type
													.charAt( 0 )
													.toUpperCase() +
											  p.election_type.slice( 1 )
											: '—' }
									</td>
									<td className="lsfh-amount">
										{ fmtC(
											p.computed_beginning_balance ??
												p.beginning_balance
										) }
										{ ! p.beginning_balance && (
											<span
												className="lsfh-subtle"
												style={ {
													fontSize: 'var(--fs-micro)',
													marginLeft: 4,
												} }
											>
												auto
											</span>
										) }
									</td>
								</tr>
							) ) }
						</tbody>
					</table>
				</div>
			) }
		</>
	);
}
