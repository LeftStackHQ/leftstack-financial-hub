import { __, sprintf } from '@wordpress/i18n';
import { fmtC } from '../shared';

/**
 * One word for where a payout stands: Filed, Matched to the bank, Balanced, or just Synced.
 *
 * Filed wins over everything. A payout matched to the bank with a known difference says so, so the
 * difference is not forgotten once the match is confirmed. The text carries the meaning, not the colour.
 *
 * @param {Object} props
 * @param {Object} props.row     The payout row from the list.
 * @param {Object} props.periods Filing periods, to name the one a filed payout belongs to.
 */
export function DisbursementStatus( { row, periods } ) {
	const period = periods.find( ( p ) => p.id === row.filing_period_id );
	if ( row.filed ) {
		return (
			<span className="badge badge-green">
				{ period
					? sprintf(
							/* translators: %s: filing period name, for example "Q3 2026". */
							__( 'Filed in %s', 'leftstack-financial-hub' ),
							period.name
					  )
					: __( 'Filed', 'leftstack-financial-hub' ) }
			</span>
		);
	}
	if ( row.reconciled && row.bank_matched && row.bank_difference ) {
		return (
			<span className="badge badge-gold">
				{ sprintf(
					/* translators: %s: the amount the bank and the Hub differ by. */
					__( 'Matched, differs by %s', 'leftstack-financial-hub' ),
					fmtC( Math.abs( row.bank_difference ) )
				) }
			</span>
		);
	}
	if ( row.reconciled && row.bank_matched ) {
		return (
			<span className="badge badge-teal">
				{ __( 'Matched to bank', 'leftstack-financial-hub' ) }
			</span>
		);
	}
	if ( row.reconciled ) {
		return (
			<span className="badge badge-teal">
				{ __( 'Balanced', 'leftstack-financial-hub' ) }
			</span>
		);
	}
	return (
		<span className="badge badge-slate">
			{ __( 'Synced', 'leftstack-financial-hub' ) }
		</span>
	);
}
