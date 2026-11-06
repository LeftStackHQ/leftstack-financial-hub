import { fmtC } from '../shared';
import { BankDirectionMark } from './BankDirection';

/**
 * A dollar amount, in the red used for money going out when it is negative.
 *
 * @param {Object}  props
 * @param {number}  props.amount    Dollars; negative is money out.
 * @param {boolean} props.direction Whether to show which way the money moved: an arrow, and green for money in.
 */
export function BankAmount( { amount, direction = false } ) {
	let tone = '';
	if ( amount < 0 ) {
		tone = 'negative';
	} else if ( direction ) {
		tone = 'positive';
	}
	return (
		<span className={ `lsfh-amount ${ tone }` }>
			{ direction && <BankDirectionMark amount={ amount } /> }
			{ fmtC( amount ) }
		</span>
	);
}
