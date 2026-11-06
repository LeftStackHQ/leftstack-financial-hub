import { useDashboard } from '../../hooks/useDashboard';
import { useDashboardFilter } from '../../hooks/useDashboardFilter';
import { DashboardFilters } from './DashboardFilters';
import { DashboardBalanceCard } from './DashboardBalanceCard';
import { DashboardStats } from './DashboardStats';
import { DashboardTopContributions } from './DashboardTopContributions';
import { DashboardRecentExpenses } from './DashboardRecentExpenses';

import { dashboardTotals } from './helpers';

export default function Dashboard() {
	const {
		period,
		fDateFrom,
		fDateTo,
		fDateLabel,
		selectPeriod,
		applyDates,
		clearDates,
		clearAll,
	} = useDashboardFilter();
	const { data, periods, months, loading } = useDashboard( {
		period,
		fDateFrom,
		fDateTo,
	} );

	if ( loading ) {
		return <div className="lsfh-loading">Loading…</div>;
	}
	if ( ! data ) {
		return <div className="lsfh-empty">Failed to load dashboard.</div>;
	}

	const totals = dashboardTotals( data );

	return (
		<>
			<DashboardFilters
				periods={ periods }
				months={ months }
				period={ period }
				fDateFrom={ fDateFrom }
				fDateLabel={ fDateLabel }
				selectPeriod={ selectPeriod }
				applyDates={ applyDates }
				clearDates={ clearDates }
				clearAll={ clearAll }
			/>

			{ /* Balance card + Stats — side by side on desktop */ }
			<div className="lsfh-dashboard-top">
				<DashboardBalanceCard data={ data } totals={ totals } />

				{ /* Stat cards (right column of dashboard-top) */ }
				<DashboardStats data={ data } />
			</div>
			{ /* end lsfh-dashboard-top */ }

			{ /* Two-column: top donors + recent expenses */ }
			<div className="lsfh-dash-grid">
				<DashboardTopContributions data={ data } />

				<DashboardRecentExpenses data={ data } />
			</div>
		</>
	);
}
