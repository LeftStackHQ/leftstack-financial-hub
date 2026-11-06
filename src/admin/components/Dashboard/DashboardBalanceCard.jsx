import { fmt, fmtFull } from './helpers';
import { CalendarClock } from 'lucide-react';

/**
 * Beginning balance, money raised and spent, and the balance now and after scheduled payments.
 *
 * @param {Object} props
 * @param {Object} props.data   The response from /dashboard.
 * @param {Object} props.totals The headline figures from dashboardTotals().
 */
export function DashboardBalanceCard( { data, totals } ) {
	const {
		afterScheduled,
		balPos,
		balance,
		expenses,
		goal,
		goalPct,
		raised,
		scheduledCount,
		scheduledTotal,
	} = totals;
	return (
		<>
			<div className="lsfh-balance-card">
				<div className="lsfh-balance-row">
					<div className="lsfh-balance-item">
						<div className="lsfh-balance-label">
							Beginning Balance
						</div>
						<div className="lsfh-balance-value">
							{ fmtFull( data.beginning_balance ) }
						</div>
						<div className="lsfh-balance-sub">Starting funds</div>
					</div>
					<div
						className="lsfh-balance-item"
						style={ { textAlign: 'center' } }
					>
						<div className="lsfh-balance-op">+</div>
					</div>
					<div className="lsfh-balance-item">
						<div className="lsfh-balance-label">Total Raised</div>
						<div className="lsfh-balance-value positive">
							{ fmtFull( raised ) }
						</div>
						<div className="lsfh-balance-sub">
							{ data.donation_count } donations ·{ ' ' }
							{ fmtFull(
								data.donation_count > 0
									? raised / data.donation_count
									: 0
							) }{ ' ' }
							avg · { fmtFull( data.total_fees ) } in fees
						</div>
					</div>
					<div
						className="lsfh-balance-item"
						style={ { textAlign: 'center' } }
					>
						<div className="lsfh-balance-op">−</div>
					</div>
					<div className="lsfh-balance-item">
						<div className="lsfh-balance-label">
							Total Expenditures
						</div>
						<div className="lsfh-balance-value">
							{ fmtFull( expenses ) }
						</div>
						<div className="lsfh-balance-sub">
							Campaign spending
						</div>
					</div>
					<div
						className="lsfh-balance-item"
						style={ { textAlign: 'center' } }
					>
						<div className="lsfh-balance-op">=</div>
					</div>
					<div className="lsfh-balance-item">
						<div className="lsfh-balance-label">
							Current Balance
						</div>
						<div
							className={ `lsfh-balance-value ${
								balPos ? 'positive' : 'negative'
							}` }
						>
							{ fmtFull( balance ) }
						</div>
						<div className="lsfh-balance-sub">Cash on hand</div>
					</div>
				</div>
				{ goal > 0 && (
					<>
						<div className="lsfh-goal-track">
							<div
								className="lsfh-goal-fill"
								style={ { width: `${ goalPct }%` } }
							/>
						</div>
						<div className="lsfh-goal-labels">
							<span>{ fmtFull( raised ) } raised</span>
							<span className="lsfh-bold lsfh-primary">
								{ goalPct.toFixed( 1 ) }% of goal
							</span>
							<span>Goal: { fmt( goal ) }</span>
						</div>
					</>
				) }
				{ scheduledCount > 0 && (
					<div className="lsfh-scheduled">
						<div className="lsfh-scheduled-main">
							<CalendarClock size={ 18 } aria-hidden="true" />
							<span>
								Scheduled{ ' ' }
								<span className="lsfh-bold">
									−{ fmtFull( scheduledTotal ) }
								</span>
							</span>
							<span className="badge badge-gold">
								{ scheduledCount }{ ' ' }
								{ scheduledCount === 1
									? 'payment'
									: 'payments' }
							</span>
						</div>
						<div className="lsfh-scheduled-after">
							<span>After scheduled</span>
							<span
								className={ `lsfh-bold ${
									afterScheduled >= 0
										? 'lsfh-scheduled-pos'
										: 'lsfh-scheduled-neg'
								}` }
							>
								{ fmtFull( afterScheduled ) }
							</span>
						</div>
					</div>
				) }
			</div>
		</>
	);
}
