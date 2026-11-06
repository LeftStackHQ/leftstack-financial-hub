import { __, sprintf } from '@wordpress/i18n';
import { fmtDate } from '../shared';
import { BankAmount } from './BankAmount';
import { recordKind } from './reasons';

/**
 * Hub records (payouts, donations and expenses), one under the other.
 *
 * @param {Object}   props
 * @param {string[]} props.ids Hub record ids, such as p3, d7 or e30.
 * @param {Object}   props.hub Hub records by id.
 */
export function BankRecordList( { ids, hub } ) {
	return (
		<>
			{ ids.map( ( id ) => {
				const record = hub[ id ];
				return (
					<div key={ id } className="lsfh-bank-item">
						<span className="lsfh-bank-item__date">
							{ fmtDate( record.date ) }
						</span>
						<span className="lsfh-bank-item__text">
							{ recordKind( record.type ) }
							{ record.label ? `, ${ record.label }` : '' }
							{ record.check_number && (
								<span className="lsfh-meta">
									{ ' ' }
									{ sprintf(
										/* translators: %s: check number. */
										__(
											'check %s',
											'leftstack-financial-hub'
										),
										record.check_number
									) }
								</span>
							) }
						</span>
						<BankAmount amount={ record.amount } direction />
					</div>
				);
			} ) }
		</>
	);
}
