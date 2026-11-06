import {
	CATEGORY_BADGE_COLORS,
	STATUS_BADGES,
	STATUS_LABELS,
} from './constants';
import { catColorIdx, expenseStatus, methodLabel } from './helpers';

export function CatBadge( { name, catColor } ) {
	if ( catColor ) {
		return (
			<span
				className="lsfh-cat-badge lsfh-cat-badge--colored"
				style={ {
					'--cat-badge-bg': catColor + '22',
					'--cat-badge-color': catColor,
					'--cat-badge-border': catColor,
				} }
			>
				{ name }
			</span>
		);
	}
	const { bg, color } = CATEGORY_BADGE_COLORS[ catColorIdx( name ) ];
	return (
		<span
			className="lsfh-cat-badge"
			style={ { '--cat-badge-bg': bg, '--cat-badge-color': color } }
		>
			{ name }
		</span>
	);
}

export function MethodBadge( { method } ) {
	const map = {
		check: 'badge-blue',
		debit: 'badge-teal',
		credit: 'badge-purple',
		cash: 'badge-green',
		fee: 'badge-gold',
		wire: 'badge-slate',
		ach: 'badge-teal',
		transfer: 'badge-slate',
	};
	return (
		<span className={ `badge ${ map[ method ] || 'badge-slate' }` }>
			{ methodLabel( method ) }
		</span>
	);
}

// Posted, Scheduled or Pending, from an expenditure's dates. (Donations have their own: DonationStatusBadge.)
export const ExpenseStatusBadge = ( { row } ) => {
	const status = expenseStatus( row );
	return (
		<span className={ `badge ${ STATUS_BADGES[ status ] }` }>
			{ STATUS_LABELS[ status ] }
		</span>
	);
};
