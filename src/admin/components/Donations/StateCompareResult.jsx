import { Fragment } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { fmtC } from '../shared';

/**
 * One list of the comparison (different, missing at the state, or extra at the state).
 *
 * @param {Object}   props
 * @param {string}   props.title  Heading of the list.
 * @param {string}   props.hint   One line saying what the list means.
 * @param {number}   props.count  How many rows there are in all (the list may be cut).
 * @param {Object[]} props.rows   Rows to show; each has a side (hub or state), or both for a pair.
 * @param {boolean}  props.paired Whether each row holds a Hub row and the state's row it was paired with.
 */
function CompareList( { title, hint, count, rows, paired } ) {
	if ( ! count ) {
		return null;
	}
	const cell = ( r ) => (
		<>
			<td>{ r.name }</td>
			<td>{ r.date }</td>
			<td className="lsfh-amount">{ fmtC( r.amount ) }</td>
			<td>{ r.zip }</td>
		</>
	);
	return (
		<>
			<h3 className="lsfh-subheading">
				{ sprintf( '%1$s (%2$d)', title, count ) }
			</h3>
			<p className="lsfh-meta">{ hint }</p>
			<div className="lsfh-box lsfh-box--table">
				<div
					className="lsfh-tscroll"
					tabIndex={ 0 }
					role="region"
					aria-label={ title }
				>
					<table className="lsfh-table">
						<thead>
							<tr>
								{ paired && (
									<th>
										{ __(
											'In',
											'leftstack-financial-hub'
										) }
									</th>
								) }
								<th>
									{ __( 'Name', 'leftstack-financial-hub' ) }
								</th>
								<th>
									{ __( 'Date', 'leftstack-financial-hub' ) }
								</th>
								<th>
									{ __(
										'Amount',
										'leftstack-financial-hub'
									) }
								</th>
								<th>
									{ __( 'ZIP', 'leftstack-financial-hub' ) }
								</th>
								{ paired && (
									<th>
										{ __(
											'Differs',
											'leftstack-financial-hub'
										) }
									</th>
								) }
							</tr>
						</thead>
						<tbody>
							{ rows.map( ( r, i ) =>
								paired ? (
									<Fragment key={ i }>
										<tr>
											<td>
												{ __(
													'The Hub',
													'leftstack-financial-hub'
												) }
											</td>
											{ cell( r.hub ) }
											<td rowSpan={ 2 }>
												{ r.fields.join( ', ' ) }
											</td>
										</tr>
										<tr>
											<td>
												{ __(
													'The state',
													'leftstack-financial-hub'
												) }
											</td>
											{ cell( r.state ) }
										</tr>
									</Fragment>
								) : (
									<tr key={ i }>{ cell( r ) }</tr>
								)
							) }
						</tbody>
					</table>
				</div>
			</div>
			{ rows.length < count && (
				<p className="lsfh-meta">
					{ sprintf(
						/* translators: %d: number of rows shown. */
						__(
							'The first %d are shown.',
							'leftstack-financial-hub'
						),
						rows.length
					) }
				</p>
			) }
		</>
	);
}

/**
 * What the comparison found: the totals on each side and the three lists.
 *
 * @param {Object} props
 * @param {Object} props.result  The response from /filing-check/compare.
 * @param {number} props.skipped Rows of the file left out because their date or amount could not be read.
 */
export function StateCompareResult( { result, skipped } ) {
	const same =
		! result.different_count &&
		! result.missing_count &&
		! result.extra_count;
	return (
		<>
			<p className="lsfh-meta">
				<strong>
					{ same
						? __(
								'The Hub and the state’s list agree.',
								'leftstack-financial-hub'
						  )
						: sprintf(
								/* translators: 1: rows that agree, 2: rows that differ, 3: only in the Hub, 4: only in the state's list. */
								__(
									'%1$d rows agree, %2$d differ, %3$d are only in the Hub, %4$d are only in the state’s list.',
									'leftstack-financial-hub'
								),
								result.matched,
								result.different_count,
								result.missing_count,
								result.extra_count
						  ) }
				</strong>{ ' ' }
				{ sprintf(
					/* translators: 1: Hub total, 2: Hub row count, 3: state total, 4: state row count. */
					__(
						'The Hub has %1$s in %2$d itemized contributions; the state’s list has %3$s in %4$d.',
						'leftstack-financial-hub'
					),
					fmtC( result.hub_total ),
					result.hub_count,
					fmtC( result.state_total ),
					result.state_count
				) }
			</p>
			{ skipped > 0 && (
				<p className="lsfh-meta">
					{ sprintf(
						/* translators: %d: rows left out. */
						_n(
							'%d row of the file was left out because its date or amount could not be read.',
							'%d rows of the file were left out because their date or amount could not be read.',
							skipped,
							'leftstack-financial-hub'
						),
						skipped
					) }
				</p>
			) }
			<CompareList
				paired
				title={ __( 'Different', 'leftstack-financial-hub' ) }
				hint={ __(
					'Paired by name, or for an organization by ZIP with the date or the amount. The Differs column says what is not the same.',
					'leftstack-financial-hub'
				) }
				count={ result.different_count }
				rows={ result.different }
			/>
			<CompareList
				title={ __( 'Only in the Hub', 'leftstack-financial-hub' ) }
				hint={ __(
					'Not in the state’s list: check that they were uploaded, and their date and amount.',
					'leftstack-financial-hub'
				) }
				count={ result.missing_count }
				rows={ result.missing }
			/>
			<CompareList
				title={ __(
					'Only in the state’s list',
					'leftstack-financial-hub'
				) }
				hint={ __(
					'Not in the Hub for this period: a wrong date or amount in the upload, or a contribution the Hub does not have.',
					'leftstack-financial-hub'
				) }
				count={ result.extra_count }
				rows={ result.extra }
			/>
		</>
	);
}
