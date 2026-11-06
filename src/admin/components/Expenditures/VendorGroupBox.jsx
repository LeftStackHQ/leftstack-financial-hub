import { useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { fmtC, fmtDate, monthLabel } from '../shared';

/**
 * What a dollar raised cost, as a currency amount ("$0.83"), or a dash when nothing was raised net of refunds.
 *
 * @param {?number} cost The cost of one dollar raised.
 * @return {string} The text to show.
 */
const costText = ( cost ) => ( cost === null ? '—' : fmtC( cost ) );

/**
 * One vendor group: its totals, then the months (spend, money raised, refunds, fees and the cost of a dollar raised)
 * and the sends (reference codes) that raised the money.
 *
 * @param {Object} props
 * @param {Object} props.group A group from the vendor report.
 */
export function VendorGroupBox( { group } ) {
	const [ showSends, setShowSends ] = useState( false );
	const t = group.totals;
	const stats = [
		[ __( 'Spent', 'leftstack-financial-hub' ), fmtC( t.spend ) ],
		[ __( 'Raised', 'leftstack-financial-hub' ), fmtC( t.raised ) ],
		[ __( 'Refunds', 'leftstack-financial-hub' ), fmtC( t.refunds ) ],
		[ __( 'Fees', 'leftstack-financial-hub' ), fmtC( t.fees ) ],
		[
			__( 'Cost per $1 raised', 'leftstack-financial-hub' ),
			costText( t.cost_per_dollar ),
		],
	];

	return (
		<div className="lsfh-box lsfh-vendor-box">
			<div className="lsfh-box-header">
				<span className="lsfh-box-title">{ group.name }</span>
				<span className="lsfh-meta">
					{ sprintf(
						/* translators: 1: number of payees, 2: number of fundraising pages. */
						__(
							'%1$d payees, %2$d pages',
							'leftstack-financial-hub'
						),
						group.payees.length,
						group.pages.length
					) }
				</span>
			</div>
			<div className="lsfh-stats">
				{ stats.map( ( [ label, value ] ) => (
					<div key={ label } className="lsfh-stat">
						<div className="lsfh-stat-label">{ label }</div>
						<div className="lsfh-stat-value">{ value }</div>
					</div>
				) ) }
			</div>
			{ group.months.length === 0 ? (
				<div className="lsfh-empty">
					{ __(
						'No spending or gifts yet for the payees and pages in this group.',
						'leftstack-financial-hub'
					) }
				</div>
			) : (
				<div
					className="lsfh-tscroll"
					tabIndex={ 0 }
					role="region"
					aria-label={ sprintf(
						/* translators: %s: the vendor group's name. */
						__( 'Months for %s', 'leftstack-financial-hub' ),
						group.name
					) }
				>
					<table className="lsfh-table">
						<thead>
							<tr>
								<th>
									{ __( 'Month', 'leftstack-financial-hub' ) }
								</th>
								<th>
									{ __( 'Spent', 'leftstack-financial-hub' ) }
								</th>
								<th>
									{ __(
										'Raised',
										'leftstack-financial-hub'
									) }
								</th>
								<th>
									{ __(
										'Refunds',
										'leftstack-financial-hub'
									) }
								</th>
								<th>
									{ __( 'Fees', 'leftstack-financial-hub' ) }
								</th>
								<th>
									{ __( 'Gifts', 'leftstack-financial-hub' ) }
								</th>
								<th>
									{ __(
										'Per $1 raised',
										'leftstack-financial-hub'
									) }
								</th>
							</tr>
						</thead>
						<tbody>
							{ group.months.map( ( m ) => (
								<tr key={ m.month }>
									<td>{ monthLabel( m.month ) }</td>
									<td className="lsfh-amount">
										{ fmtC( m.spend ) }
									</td>
									<td className="lsfh-amount">
										{ fmtC( m.raised ) }
									</td>
									<td className="lsfh-amount">
										{ fmtC( m.refunds ) }
									</td>
									<td className="lsfh-amount">
										{ fmtC( m.fees ) }
									</td>
									<td>{ m.gifts }</td>
									<td className="lsfh-amount">
										{ costText( m.cost_per_dollar ) }
									</td>
								</tr>
							) ) }
						</tbody>
					</table>
				</div>
			) }
			{ group.sends.length > 0 && (
				<div className="lsfh-vendor-sends">
					<button
						className="btn btn-ghost btn-sm"
						aria-expanded={ showSends }
						onClick={ () => setShowSends( ! showSends ) }
					>
						{ sprintf(
							/* translators: %d: number of sends (reference codes). */
							_n(
								'%d send',
								'%d sends',
								group.sends.length + group.sends_more,
								'leftstack-financial-hub'
							),
							group.sends.length + group.sends_more
						) }{ ' ' }
						{ showSends ? '▴' : '▾' }
					</button>
					{ showSends && (
						<div
							className="lsfh-tscroll"
							tabIndex={ 0 }
							role="region"
							aria-label={ sprintf(
								/* translators: %s: the vendor group's name. */
								__( 'Sends for %s', 'leftstack-financial-hub' ),
								group.name
							) }
						>
							<table className="lsfh-table">
								<thead>
									<tr>
										<th>
											{ __(
												'Reference code',
												'leftstack-financial-hub'
											) }
										</th>
										<th>
											{ __(
												'First gift',
												'leftstack-financial-hub'
											) }
										</th>
										<th>
											{ __(
												'Gifts',
												'leftstack-financial-hub'
											) }
										</th>
										<th>
											{ __(
												'Raised',
												'leftstack-financial-hub'
											) }
										</th>
										<th>
											{ __(
												'Refunds',
												'leftstack-financial-hub'
											) }
										</th>
										<th>
											{ __(
												'Fees',
												'leftstack-financial-hub'
											) }
										</th>
									</tr>
								</thead>
								<tbody>
									{ group.sends.map( ( s ) => (
										<tr key={ s.reference_code }>
											<td>
												{ s.reference_code ||
													__(
														'(no reference code)',
														'leftstack-financial-hub'
													) }
											</td>
											<td>{ fmtDate( s.first_date ) }</td>
											<td>{ s.gifts }</td>
											<td className="lsfh-amount">
												{ fmtC( s.raised ) }
											</td>
											<td className="lsfh-amount">
												{ fmtC( s.refunds ) }
											</td>
											<td className="lsfh-amount">
												{ fmtC( s.fees ) }
											</td>
										</tr>
									) ) }
								</tbody>
							</table>
						</div>
					) }
					{ showSends && group.sends_more > 0 && (
						<p className="lsfh-meta">
							{ sprintf(
								/* translators: %d: number of older sends not listed. */
								__(
									'and %d older sends not listed.',
									'leftstack-financial-hub'
								),
								group.sends_more
							) }
						</p>
					) }
				</div>
			) }
		</div>
	);
}
