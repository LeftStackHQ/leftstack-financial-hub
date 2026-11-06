import {
	fmtDate,
	limitStatus,
	limitsFromDashboard,
	donorCaps,
	orgTypeLabel,
} from '../shared';
import {
	fmt,
	fmtFull,
	getLimitStatusClass,
	getWorstLimitStatus,
} from './helpers';

/**
 * The Top Contributions table: the largest donors, with their limit status and contact links.
 *
 * @param {Object} props
 * @param {Object} props.data The response from /dashboard.
 */
export function DashboardTopContributions( { data } ) {
	return (
		<>
			<div
				className="lsfh-box"
				style={ { padding: 0, overflow: 'hidden' } }
			>
				<div
					className="lsfh-box-header"
					style={ { padding: '12px 18px' } }
				>
					<span className="lsfh-box-title">Top Contributions</span>
					<a
						href={
							( window.LSFH?.adminUrl || '' ) +
							'?page=lsfh-donations&tab=donors'
						}
						className="btn btn-ghost btn-sm"
					>
						View all
					</a>
				</div>
				<div className="lsfh-contrib-scroll">
					<table className="lsfh-table">
						<thead>
							<tr>
								<th style={ { width: 28 } }></th>
								<th style={ { width: 36 } }></th>
								<th>Donor</th>
								<th>Address</th>
								<th>Email</th>
								<th>Phone</th>
								<th>Last Gift</th>
								<th>Total</th>
								{ ! data.limits?.no_limit && (
									<th>Limit Remaining</th>
								) }
							</tr>
						</thead>
						<tbody>
							{ ! data.recent_donations ||
							data.recent_donations.length === 0 ? (
								<tr>
									<td
										colSpan={
											! data.limits?.no_limit ? 9 : 8
										}
										style={ {
											padding: '24px 18px',
											color: 'var(--muted)',
											textAlign: 'center',
										} }
									>
										No donations yet.
									</td>
								</tr>
							) : (
								( data.recent_donations || [] ).map(
									( d, i ) => {
										const lim = data.limits || {};
										const {
											isOrg,
											off,
											primary: capP,
											general: capG,
											near,
										} = donorCaps(
											d,
											limitsFromDashboard( lim )
										);
										const limStat = ( given, cap ) =>
											off
												? 'none'
												: limitStatus(
														given,
														cap,
														near
												  );
										const pStat = limStat(
											d.primary_total_all,
											capP
										);
										const gStat = limStat(
											d.general_total_all,
											capG
										);
										const worstStatus = getWorstLimitStatus(
											pStat,
											gStat
										);
										const adminUrl =
											window.LSFH?.adminUrl || '';
										const donorName = isOrg
											? d.first_name
											: `${ d.first_name } ${ d.last_name }`;
										const initials = isOrg
											? ( d.first_name || '?' )
													.slice( 0, 2 )
													.toUpperCase()
											: `${
													( d.first_name || '?' )[ 0 ]
											  }${
													( d.last_name ||
														'' )[ 0 ] || ''
											  }`.toUpperCase();
										return (
											<tr
												key={ i }
												onClick={ () => {
													window.location.href = `${ adminUrl }?page=lsfh-donations&donor_search=${ encodeURIComponent(
														donorName
													) }`;
												} }
											>
												<td
													className={ `lsfh-cc-rank${
														i < 3 ? ' top' : ''
													}` }
												>
													{ i + 1 }
												</td>
												<td
													style={ {
														padding:
															'10px 8px 10px 16px',
													} }
												>
													<div
														className={ `lsfh-contrib-avatar${ getLimitStatusClass(
															worstStatus
														) }` }
													>
														{ initials }
													</div>
												</td>
												<td>
													<div className="lsfh-cc-donor-name">
														{ isOrg && (
															<span
																className="badge badge-slate"
																style={ {
																	fontSize:
																		'var(--fs-micro)',
																	marginRight: 5,
																	verticalAlign:
																		'middle',
																} }
															>
																{ orgTypeLabel(
																	d.org_type
																) }
															</span>
														) }
														{ donorName }
													</div>
													<div className="lsfh-cc-donor-loc">
														{ d.occupation || '—' }
													</div>
												</td>
												<td className="lsfh-cc-address">
													{ d.address ? (
														<div>{ d.address }</div>
													) : null }
													<div>
														{ [ d.city, d.state ]
															.filter( Boolean )
															.join( ', ' ) }
														{ d.zip
															? ` ${ d.zip }`
															: '' }
														{ ! d.city &&
														! d.state &&
														! d.zip
															? '—'
															: '' }
													</div>
												</td>
												<td>
													{ d.email ? (
														<a
															href={ `mailto:${ d.email }` }
															onClick={ ( e ) =>
																e.stopPropagation()
															}
															className="lsfh-cc-cell-link"
														>
															{ d.email }
														</a>
													) : (
														<span className="lsfh-cc-cell-empty">
															—
														</span>
													) }
												</td>
												<td>
													{ d.phone ? (
														<a
															href={ `tel:${ d.phone }` }
															onClick={ ( e ) =>
																e.stopPropagation()
															}
															className="lsfh-cc-cell-link"
														>
															{ d.phone }
														</a>
													) : (
														<span className="lsfh-cc-cell-empty">
															—
														</span>
													) }
												</td>
												<td className="lsfh-cc-date">
													{ fmtDate( d.last_gift ) }
												</td>
												<td className="lsfh-cc-total">
													{ fmtFull( d.total_given ) }
												</td>
												{ ! lim.no_limit && (
													<td className="lsfh-cc-limit">
														{ [
															{
																label: 'Primary',
																given: d.primary_total_all,
																cap: capP,
																stat: pStat,
															},
															{
																label: 'General',
																given: d.general_total_all,
																cap: capG,
																stat: gStat,
															},
														].map(
															( {
																label,
																given,
																cap,
																stat,
															} ) => {
																if (
																	stat ===
																	'none'
																) {
																	return null;
																}
																const barPct =
																	Math.min(
																		( given /
																			cap ) *
																			100,
																		100
																	);
																return (
																	<div
																		key={
																			label
																		}
																	>
																		<div className="lsfh-cc-limit-hdr">
																			<span className="lsfh-cc-limit-label">
																				{
																					label
																				}
																			</span>
																			{ stat ===
																			'maxed' ? (
																				<span className="badge badge-xs badge-red">
																					Maxed
																				</span>
																			) : (
																				<span
																					className={ `lsfh-cc-limit-val${
																						stat ===
																						'near'
																							? ' near'
																							: ''
																					}` }
																				>
																					{ fmt(
																						cap -
																							given
																					) }{ ' ' }
																					left
																				</span>
																			) }
																		</div>
																		<div className="lsfh-cc-bar-track">
																			<div
																				className={ `lsfh-cc-bar-fill${ getLimitStatusClass(
																					stat
																				) }` }
																				style={ {
																					width: `${ barPct }%`,
																				} }
																			/>
																		</div>
																	</div>
																);
															}
														) }
													</td>
												) }
											</tr>
										);
									}
								)
							) }
						</tbody>
					</table>
				</div>
			</div>
		</>
	);
}
