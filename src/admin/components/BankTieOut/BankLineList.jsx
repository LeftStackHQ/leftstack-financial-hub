import { __, sprintf } from '@wordpress/i18n';
import { fmtDate } from '../shared';
import { BankAmount } from './BankAmount';

/**
 * Bank lines, one under the other: date, what the bank calls it, check number and amount.
 *
 * @param {Object}   props
 * @param {string[]} props.ids  Bank line ids, such as b12.
 * @param {Object}   props.bank Bank lines by id.
 */
export function BankLineList( { ids, bank } ) {
	return (
		<>
			{ ids.map( ( id ) => {
				const line = bank[ id ];
				return (
					<div key={ id } className="lsfh-bank-item">
						<span className="lsfh-bank-item__date">
							{ fmtDate( line.date ) }
						</span>
						<span className="lsfh-bank-item__text">
							{ line.description }
							{ line.check_number && (
								<span className="lsfh-meta">
									{ ' ' }
									{ sprintf(
										/* translators: %s: check number. */
										__(
											'check %s',
											'leftstack-financial-hub'
										),
										line.check_number
									) }
								</span>
							) }
						</span>
						<BankAmount amount={ line.amount } direction />
					</div>
				);
			} ) }
		</>
	);
}
