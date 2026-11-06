export const fmt = ( n ) =>
	new Intl.NumberFormat( 'en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0,
	} ).format( n ?? 0 );
export const fmtFull = ( n ) =>
	new Intl.NumberFormat( 'en-US', {
		style: 'currency',
		currency: 'USD',
	} ).format( n ?? 0 );
export const getWorstLimitStatus = ( primaryStatus, generalStatus ) => {
	if ( primaryStatus === 'maxed' || generalStatus === 'maxed' ) {
		return 'maxed';
	}
	if ( primaryStatus === 'near' || generalStatus === 'near' ) {
		return 'near';
	}
	return primaryStatus;
};

export const getLimitStatusClass = ( status ) => {
	if ( status === 'maxed' ) {
		return ' maxed';
	}
	if ( status === 'near' ) {
		return ' near';
	}
	return '';
};

/**
 * The headline figures the Dashboard cards are built from.
 *
 * @param {Object} data The response from /dashboard.
 * @return {Object} goal, raised, expenses, balance, goalPct, balPos, scheduledCount, scheduledTotal, afterScheduled.
 */
export const dashboardTotals = ( data ) => {
	const goal = data.campaign_goal || window.LSFH?.campaignGoal || 0;
	const raised = data.total_raised || 0;
	const expenses = data.total_expenditures || 0;
	const balance = data.balance || 0;
	const goalPct = goal > 0 ? Math.min( ( raised / goal ) * 100, 100 ) : 0;
	const balPos = balance >= 0;
	const scheduledCount = data.scheduled_count || 0;
	const scheduledTotal = data.scheduled_total || 0;
	const afterScheduled = data.balance_after_scheduled ?? balance;
	return {
		goal,
		raised,
		expenses,
		balance,
		goalPct,
		balPos,
		scheduledCount,
		scheduledTotal,
		afterScheduled,
	};
};
