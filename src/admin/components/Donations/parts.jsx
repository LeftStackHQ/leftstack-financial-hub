import { Check } from 'lucide-react';

export function SourceBadge( { source, paymentType } ) {
	if ( source === 'actblue' ) {
		return <span className="badge badge-teal">ActBlue</span>;
	}
	if ( source === 'stripe' ) {
		return <span className="badge badge-purple">Stripe</span>;
	}
	if ( source === 'democracyengine' ) {
		return <span className="badge badge-slate">Democracy Engine</span>;
	}
	if ( paymentType === 'check' ) {
		return <span className="badge badge-blue">Check</span>;
	}
	if ( paymentType === 'cash' ) {
		return <span className="badge badge-green">Cash</span>;
	}
	return <span className="badge badge-slate">Other</span>;
}

export function ElectionBadge( { type } ) {
	const map = {
		primary: 'badge-teal',
		general: 'badge-purple',
		runoff: 'badge-gold',
		special: 'badge-red',
		local: 'badge-blue',
	};
	return (
		<span className={ `badge ${ map[ type ] || 'badge-slate' }` }>
			{ type }
		</span>
	);
}

export function ReportBadge( { type, isRefund } ) {
	if ( isRefund ) {
		return (
			<span className="badge badge-slate" style={ { opacity: 0.45 } }>
				—
			</span>
		);
	}
	return type === 'itemized' ? (
		<span className="badge badge-green">Itemized</span>
	) : (
		<span className="badge badge-slate">Unitemized</span>
	);
}

// Filed or Pending, from a donation's reporting status. (Expenditures have their own: ExpenseStatusBadge.)
export function DonationStatusBadge( { status } ) {
	return status === 'filed' ? (
		<span className="badge badge-teal">
			<Check size={ 10 } /> Filed
		</span>
	) : (
		<span className="badge badge-gold">Pending</span>
	);
}
