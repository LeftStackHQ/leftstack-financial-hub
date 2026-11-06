import { __, sprintf } from '@wordpress/i18n';
import { fmtC } from '../shared';

/**
 * A note under the Check # field when other expenses use the same check number: what the check also covers
 * and what it adds up to with this expense. Two expenses on one check are normal (one check to a party for
 * dues and an event), so this informs and does not block.
 *
 * @param {Object}   props
 * @param {string}   props.number The check number typed.
 * @param {Object[]} props.others Other expenses on that number: payee and amount.
 * @param {number}   props.amount This expense's amount (a number, or 0 when blank).
 */
export function SharedCheckNote( { number, others, amount } ) {
	if ( ! others.length ) {
		return null;
	}
	const total = others.reduce( ( sum, o ) => sum + o.amount, 0 ) + amount;
	return (
		<p className="lsfh-meta lsfh-shared-check" role="status">
			{ sprintf(
				/* translators: 1: check number, 2: list of other expenses with their amounts, 3: total of the check. */
				__(
					'Check %1$s also covers %2$s. With this expense the check totals %3$s.',
					'leftstack-financial-hub'
				),
				number.trim(),
				others
					.map( ( o ) => `${ o.payee } (${ fmtC( o.amount ) })` )
					.join( ', ' ),
				fmtC( total )
			) }
		</p>
	);
}
