import { __, _n, sprintf } from '@wordpress/i18n';
import { fmtC, fmtDate } from '../shared';

/**
 * The control totals of a bank file under the chosen layout, to compare with the bank's own statement.
 *
 * @param {Object} props
 * @param {Object} props.built The result of buildLines(): totals, problems and skipped.
 */
export function BankLayoutTotals( { built } ) {
	const { totals, problems, skipped } = built;
	return (
		<>
			<div className="lsfh-bank-totals">
				<div>
					<span className="lsfh-meta">
						{ __( 'Lines in file', 'leftstack-financial-hub' ) }
					</span>
					<strong>{ totals.count }</strong>
				</div>
				<div>
					<span className="lsfh-meta">
						{ __( 'First and last', 'leftstack-financial-hub' ) }
					</span>
					<strong>
						{ totals.count
							? sprintf(
									/* translators: 1: first date, 2: last date, for example "Jul 1 to Oct 6". */
									__(
										'%1$s to %2$s',
										'leftstack-financial-hub'
									),
									fmtDate( totals.first ),
									fmtDate( totals.last )
							  )
							: '—' }
					</strong>
				</div>
				<div>
					<span className="lsfh-meta">
						{ __( 'Money in', 'leftstack-financial-hub' ) }
					</span>
					<strong>{ fmtC( totals.moneyIn / 100 ) }</strong>
				</div>
				<div>
					<span className="lsfh-meta">
						{ __( 'Money out', 'leftstack-financial-hub' ) }
					</span>
					<strong>
						{ fmtC( Math.abs( totals.moneyOut ) / 100 ) }
					</strong>
				</div>
			</div>
			<p className="lsfh-meta">
				{ __(
					'Compare these totals with your bank statement before you continue. If they differ, the layout below is wrong.',
					'leftstack-financial-hub'
				) }
			</p>
			{ skipped > 0 && (
				<p className="lsfh-meta">
					{ sprintf(
						/* translators: %d: number of rows. */
						_n(
							'%d row without a date or amount was left out (a blank line or a total).',
							'%d rows without a date or amount were left out (blank lines or totals).',
							skipped,
							'leftstack-financial-hub'
						),
						skipped
					) }
				</p>
			) }
			{ problems.length > 0 && (
				<div className="lsfh-import-error" role="alert">
					{ sprintf(
						/* translators: 1: number of rows, 2: row numbers. */
						_n(
							'%1$d row could not be read (row %2$s). Check the date format and the amount columns.',
							'%1$d rows could not be read (first: %2$s). Check the date format and the amount columns.',
							problems.length,
							'leftstack-financial-hub'
						),
						problems.length,
						problems
							.slice( 0, 5 )
							.map( ( p ) => p.row )
							.join( ', ' )
					) }
				</div>
			) }
		</>
	);
}
