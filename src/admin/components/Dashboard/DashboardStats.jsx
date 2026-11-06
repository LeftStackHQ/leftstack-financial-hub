import { fmt } from './helpers';
import { CheckCircle2, Clock, DollarSign, Scale } from 'lucide-react';

/**
 * The stat cards on the right of the balance card: pending filing, unitemized, in-kind and so on, each linking to the matching list.
 *
 * @param {Object} props
 * @param {Object} props.data The response from /dashboard.
 */
export function DashboardStats( { data } ) {
	return (
		<>
			<div className="lsfh-stats">
				<a
					className="lsfh-stat"
					href={
						( window.LSFH?.adminUrl || '' ) + '?page=lsfh-donations'
					}
				>
					<div className="lsfh-stat-icon teal">
						<DollarSign size={ 20 } />
					</div>
					<div className="lsfh-stat-label">Online</div>
					<div className="lsfh-stat-num money">
						{ fmt( data.actblue_total ) }
					</div>
					<div className="lsfh-stat-sub">Online Contributions</div>
				</a>
				<div className="lsfh-stat">
					<div className="lsfh-stat-icon green">
						<CheckCircle2 size={ 20 } />
					</div>
					<div className="lsfh-stat-label">Check / Cash</div>
					<div className="lsfh-stat-num money">
						{ fmt( data.manual_total ) }
					</div>
					<div className="lsfh-stat-sub">Manual contributions</div>
				</div>
				<a
					className="lsfh-stat gold"
					href={
						( window.LSFH?.adminUrl || '' ) +
						'?page=lsfh-donations&reporting_status=pending'
					}
				>
					<div className="lsfh-stat-icon gold">
						<Clock size={ 20 } />
					</div>
					<div className="lsfh-stat-label">Pending Filing</div>
					<div className="lsfh-stat-num">{ data.pending_count }</div>
					<div className="lsfh-stat-sub">Donations not yet filed</div>
				</a>
				<a
					className="lsfh-stat"
					href={
						( window.LSFH?.adminUrl || '' ) + '?page=lsfh-inkind'
					}
				>
					<div className="lsfh-stat-icon teal">
						<Scale size={ 20 } />
					</div>
					<div className="lsfh-stat-label">In-Kind</div>
					<div className="lsfh-stat-num money">
						{ fmt( data.inkind_total ) }
					</div>
					<div className="lsfh-stat-sub">Non-cash contributions</div>
				</a>
			</div>
		</>
	);
}
