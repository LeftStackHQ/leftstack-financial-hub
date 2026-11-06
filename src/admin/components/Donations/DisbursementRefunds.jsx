import { fmtC } from '../shared';

/**
 * The refund badges of a payout: refunds of contributions filed earlier (the earlier period may need an amendment) and
 * refunds charged to this payout. Each opens the matching transactions.
 *
 * @param {Object}   props
 * @param {Object}   props.row                The payout row from the disbursements list.
 * @param {Function} props.onViewDisbursement Shows this payout's transactions.
 * @param {Function} props.onViewAmendments   Shows this payout's refunded transactions.
 */
export function DisbursementRefunds( {
	row,
	onViewDisbursement,
	onViewAmendments,
} ) {
	return (
		<div
			style={ {
				display: 'flex',
				flexDirection: 'column',
				gap: 4,
				alignItems: 'center',
			} }
		>
			{ row.amendment_count > 0 && (
				<button
					className="btn btn-sm badge badge-gold"
					title={ `${ row.amendment_count } refund${
						row.amendment_count !== 1 ? 's' : ''
					} of contributions filed earlier — reduces Net (Bank Deposit) by ${ fmtC(
						row.amendment_total
					) }; the earlier period may need an amendment. Click to view.` }
					onClick={ () => onViewAmendments?.( row.disbursement_id ) }
				>
					{ `⚠ ${ fmtC( row.amendment_total ) } refunded` }
				</button>
			) }
			{ row.refund_charge_count > 0 && (
				<button
					className="btn btn-sm badge badge-red"
					title={ `${ row.refund_charge_count } refund${
						row.refund_charge_count !== 1 ? 's' : ''
					} were charged to this disbursement — reduces Net (Bank Deposit) by ${ fmtC(
						row.refund_charge_total
					) }` }
					onClick={ () =>
						onViewDisbursement?.( row.disbursement_id )
					}
				>
					↓ { fmtC( row.refund_charge_total ) } refunded
				</button>
			) }
			{ ! row.amendment_count && ! row.refund_charge_count && (
				<span className="lsfh-label-xs lsfh-subtle">—</span>
			) }
		</div>
	);
}
