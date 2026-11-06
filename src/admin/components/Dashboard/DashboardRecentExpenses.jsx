import { fmtDate } from '../shared';
import { fmtFull } from './helpers';

/**
 * The Recent Expenses list on the Dashboard.
 *
 * @param {Object} props
 * @param {Object} props.data The response from /dashboard.
 */
export function DashboardRecentExpenses( { data } ) {
	return (
		<>
			<div className="lsfh-box">
				<div className="lsfh-box-header">
					<span className="lsfh-box-title">Recent Expenses</span>
					<a
						href={
							( window.LSFH?.adminUrl || '' ) +
							'?page=lsfh-expenditures'
						}
						className="btn btn-ghost btn-sm"
					>
						View all
					</a>
				</div>
				<ul className="lsfh-feed">
					{ ( ! data.recent_expenditures ||
						data.recent_expenditures.length === 0 ) && (
						<li>
							<span className="lsfh-feed-text lsfh-muted">
								No expenses yet.
							</span>
						</li>
					) }
					{ ( data.recent_expenditures || [] ).map( ( e ) => (
						<li key={ e.id }>
							<span className="lsfh-dot r" />
							<div>
								<div className="lsfh-feed-text">
									<strong>{ e.payee }</strong>
									{ e.category_name
										? ` · ${ e.category_name }`
										: '' }
								</div>
								<div className="lsfh-feed-time">
									{ fmtFull( e.amount ) } ·{ ' ' }
									{ fmtDate( e.expense_date ) }
								</div>
							</div>
						</li>
					) ) }
				</ul>
			</div>
		</>
	);
}
