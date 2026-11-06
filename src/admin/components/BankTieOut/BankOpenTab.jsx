import { Fragment } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { fmtC, fmtDate, todayISO } from '../shared';
import { BankAmount } from './BankAmount';
import { BankDirectionRow } from './BankDirection';
import { splitByDirection } from './direction';
import { recordKind } from './reasons';

const DAY = 86400000;
const daysSince = ( iso, today ) =>
	Math.max(
		0,
		Math.round( ( Date.parse( today ) - Date.parse( iso ) ) / DAY )
	);

/**
 * Why a Hub record that is not at the bank is listed, and what to do about it.
 *
 * @param {Object} row    The open row from the review: reason, and bank (a line id) for a date that does not fit.
 * @param {Object} record The Hub record.
 * @param {Object} bank   Bank lines by id.
 * @return {string} The reason in words.
 */
function openReason( row, record, bank ) {
	if ( 'typed_date_mismatch' === row.reason && bank[ row.bank ] ) {
		return sprintf(
			/* translators: 1: the date entered in the Hub, 2: the date at the bank. */
			__(
				'You entered %1$s, but the bank shows this amount on %2$s. Fix the date in the Hub, or match them on the Review tab.',
				'leftstack-financial-hub'
			),
			fmtDate( record.date ),
			fmtDate( bank[ row.bank ].date )
		);
	}
	return {
		in_review: __(
			'A bank line may fit it. See the Review tab.',
			'leftstack-financial-hub'
		),
		not_in_file: __(
			"No deposit for it in this bank file yet. It may arrive after the file's last date.",
			'leftstack-financial-hub'
		),
		no_bank_line: __(
			'No bank line of this amount. Paid some other way, or not paid yet? Nothing to do unless it should have cleared.',
			'leftstack-financial-hub'
		),
	}[ row.reason ];
}

/**
 * Hub records the bank file does not show yet: checks written but not cashed, and everything else without a bank line.
 *
 * @param {Object}   props
 * @param {Object[]} props.rows The review's hub_open rows (id, reason).
 * @param {Object}   props.hub  Hub records by id.
 * @param {Object}   props.bank Bank lines by id.
 */
export function BankOpenTab( { rows, hub, bank } ) {
	const today = todayISO();
	const checks = rows
		.filter( ( row ) => 'outstanding_check' === row.reason )
		.map( ( row ) => hub[ row.id ] )
		.sort( ( a, b ) => ( a.date < b.date ? -1 : 1 ) );
	const others = rows.filter( ( row ) => 'outstanding_check' !== row.reason );
	const sections = splitByDirection(
		others,
		( row ) => hub[ row.id ].amount
	);
	const owed = checks.reduce(
		( sum, record ) => sum + Math.abs( record.amount ),
		0
	);

	if ( ! rows.length ) {
		return (
			<div className="lsfh-empty">
				{ __(
					'Every Hub record in this period has a bank line.',
					'leftstack-financial-hub'
				) }
			</div>
		);
	}
	return (
		<>
			{ checks.length > 0 && (
				<>
					<h3 className="lsfh-subheading">
						{ __(
							'Outstanding checks',
							'leftstack-financial-hub'
						) }
					</h3>
					<p className="lsfh-meta">
						{ sprintf(
							/* translators: 1: number of checks, 2: total amount. */
							_n(
								'%1$d check, %2$s not yet at the bank.',
								'%1$d checks, %2$s not yet at the bank.',
								checks.length,
								'leftstack-financial-hub'
							),
							checks.length,
							fmtC( owed )
						) }{ ' ' }
						{ __(
							'Oldest first. A check stays here until the bank shows it, however long that takes.',
							'leftstack-financial-hub'
						) }
					</p>
					<div className="lsfh-box lsfh-box--table">
						<div
							className="lsfh-tscroll"
							tabIndex={ 0 }
							role="region"
							aria-label={ __(
								'Outstanding checks',
								'leftstack-financial-hub'
							) }
						>
							<table className="lsfh-table">
								<thead>
									<tr>
										<th>
											{ __(
												'Check',
												'leftstack-financial-hub'
											) }
										</th>
										<th>
											{ __(
												'Payee',
												'leftstack-financial-hub'
											) }
										</th>
										<th>
											{ __(
												'Written',
												'leftstack-financial-hub'
											) }
										</th>
										<th>
											{ __(
												'Amount',
												'leftstack-financial-hub'
											) }
										</th>
										<th>
											{ __(
												'Outstanding',
												'leftstack-financial-hub'
											) }
										</th>
									</tr>
								</thead>
								<tbody>
									{ checks.map( ( record ) => (
										<tr key={ record.id }>
											<td>{ record.check_number }</td>
											<td>{ record.label }</td>
											<td>{ fmtDate( record.date ) }</td>
											<td>
												<BankAmount
													amount={ record.amount }
													direction
												/>
											</td>
											<td>
												{ sprintf(
													/* translators: %d: number of days. */
													_n(
														'%d day',
														'%d days',
														daysSince(
															record.date,
															today
														),
														'leftstack-financial-hub'
													),
													daysSince(
														record.date,
														today
													)
												) }
											</td>
										</tr>
									) ) }
								</tbody>
							</table>
						</div>
					</div>
					<p className="lsfh-meta">
						{ __(
							'These are checks whose number you typed in the Hub. Their Posted date stays empty until a bank line is matched to them.',
							'leftstack-financial-hub'
						) }
					</p>
				</>
			) }
			{ others.length > 0 && (
				<>
					<h3 className="lsfh-subheading">
						{ __(
							'Other records without a bank line',
							'leftstack-financial-hub'
						) }
					</h3>
					<div className="lsfh-box lsfh-box--table">
						<div
							className="lsfh-tscroll"
							tabIndex={ 0 }
							role="region"
							aria-label={ __(
								'Other records without a bank line',
								'leftstack-financial-hub'
							) }
						>
							<table className="lsfh-table">
								<thead>
									<tr>
										<th>
											{ __(
												'Hub record',
												'leftstack-financial-hub'
											) }
										</th>
										<th>
											{ __(
												'Date',
												'leftstack-financial-hub'
											) }
										</th>
										<th>
											{ __(
												'Amount',
												'leftstack-financial-hub'
											) }
										</th>
										<th>
											{ __(
												'Why it is listed',
												'leftstack-financial-hub'
											) }
										</th>
									</tr>
								</thead>
								<tbody>
									{ sections.map( ( section ) => (
										<Fragment key={ section.direction }>
											<BankDirectionRow
												group={ section }
												colSpan={ 4 }
											/>
											{ section.items.map( ( row ) => {
												const record = hub[ row.id ];
												return (
													<tr key={ row.id }>
														<td>
															{ recordKind(
																record.type
															) }
															{ record.label
																? `, ${ record.label }`
																: '' }
														</td>
														<td>
															{ fmtDate(
																record.date
															) }
														</td>
														<td>
															<BankAmount
																amount={
																	record.amount
																}
																direction
															/>
														</td>
														<td className="lsfh-meta">
															{ openReason(
																row,
																record,
																bank
															) }
														</td>
													</tr>
												);
											} ) }
										</Fragment>
									) ) }
								</tbody>
							</table>
						</div>
					</div>
				</>
			) }
		</>
	);
}
