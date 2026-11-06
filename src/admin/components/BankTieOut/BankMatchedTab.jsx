import { __, sprintf } from '@wordpress/i18n';
import { useBankMatches } from '../../hooks/useBankMatches';
import { Pagination } from '../shared';
import { BankLineList } from './BankLineList';
import { BankRecordList } from './BankRecordList';
import { BankAmount } from './BankAmount';
import { BankDirectionFilter } from './BankDirection';

/**
 * The confirmed matches of an account, with a button to undo each one.
 *
 * @param {Object}   props
 * @param {number}   props.accountId The bank account.
 * @param {Function} props.onChanged Called after a match was undone.
 */
export function BankMatchedTab( { accountId, onChanged } ) {
	const matched = useBankMatches( accountId, onChanged );
	if ( matched.loading && ! matched.data.length && ! matched.direction ) {
		return null;
	}
	if ( matched.error ) {
		return (
			<div className="lsfh-import-error" role="alert">
				{ matched.error }
			</div>
		);
	}
	if ( ! matched.data.length && ! matched.direction ) {
		return (
			<div className="lsfh-empty">
				{ __( 'Nothing is matched yet.', 'leftstack-financial-hub' ) }
			</div>
		);
	}
	return (
		<>
			<BankDirectionFilter
				value={ matched.direction }
				onChange={ matched.setDirection }
			/>
			{ ! matched.data.length && (
				<div className="lsfh-empty">
					{ __(
						'No matches in this direction.',
						'leftstack-financial-hub'
					) }
				</div>
			) }
			{ matched.data.length > 0 && (
				<div className="lsfh-box lsfh-box--table">
					<div
						className="lsfh-tscroll"
						tabIndex={ 0 }
						role="region"
						aria-label={ __(
							'Confirmed matches',
							'leftstack-financial-hub'
						) }
					>
						<table className="lsfh-table">
							<thead>
								<tr>
									<th>
										{ __(
											'Bank',
											'leftstack-financial-hub'
										) }
									</th>
									<th>
										{ __(
											'Hub',
											'leftstack-financial-hub'
										) }
									</th>
									<th>
										{ __(
											'Difference',
											'leftstack-financial-hub'
										) }
									</th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								{ matched.data.map( ( match ) => (
									<tr key={ match.id }>
										<td>
											<BankLineList
												ids={ match.bank.filter(
													( id ) => matched.bank[ id ]
												) }
												bank={ matched.bank }
											/>
										</td>
										<td>
											<BankRecordList
												ids={ match.hub.filter(
													( id ) => matched.hub[ id ]
												) }
												hub={ matched.hub }
											/>
										</td>
										<td className="lsfh-meta">
											{ 0 !== match.difference && (
												<>
													<BankAmount
														amount={
															match.difference
														}
													/>
													<br />
													{ match.note }
												</>
											) }
										</td>
										<td>
											<button
												className="btn btn-ghost btn-sm"
												onClick={ () =>
													matched.undo( match.id )
												}
												aria-label={ sprintf(
													/* translators: %d: match number. */
													__(
														'Undo match %d',
														'leftstack-financial-hub'
													),
													match.id
												) }
											>
												{ __(
													'Undo',
													'leftstack-financial-hub'
												) }
											</button>
										</td>
									</tr>
								) ) }
							</tbody>
						</table>
					</div>
				</div>
			) }
			<Pagination
				page={ matched.page }
				pages={ matched.pages }
				setPage={ matched.setPage }
			/>
		</>
	);
}
