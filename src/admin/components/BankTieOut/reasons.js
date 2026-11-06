import { __, _n, sprintf } from '@wordpress/i18n';
import { fmtC, fmtDate } from '../shared';

/**
 * Plain-language reasons for the codes the review sends back. Written as functions so the text is
 * looked up when it is shown, after translations have loaded.
 */

/**
 * Why a match was suggested.
 *
 * @param {string} code A matcher reason code.
 * @return {string} The reason in words.
 */
export function matchReason( code ) {
	const reasons = {
		reference_and_amount: __(
			'Same reference number and amount.',
			'leftstack-financial-hub'
		),
		check_number_and_amount: __(
			'Same check number and amount.',
			'leftstack-financial-hub'
		),
		shared_check_number_sum: __(
			'The expenses share your check number and add up to this bank amount.',
			'leftstack-financial-hub'
		),
		processor_amount_date: __(
			'Only one possible partner: exact amount, inside the date window.',
			'leftstack-financial-hub'
		),
		only_candidate_amount: __(
			'Only record of this exact amount.',
			'leftstack-financial-hub'
		),
		sum_search_hub: __(
			'These Hub records add up to this bank line.',
			'leftstack-financial-hub'
		),
		sum_search_bank: __(
			'These bank lines add up to this Hub record.',
			'leftstack-financial-hub'
		),
	};
	return reasons[ code ] || '';
}

const noun = ( cents, n ) =>
	cents > 0
		? _n( 'deposit', 'deposits', n, 'leftstack-financial-hub' )
		: _n( 'payment', 'payments', n, 'leftstack-financial-hub' );

/**
 * The headline of a to-do card: what the situation is, in one line.
 *
 * @param {Object} todo A to-do from the review: kind, bank (ids), hub (ids), cents, add and difference.
 * @param {Object} hub  Hub records by id, to read the amount of a close match.
 * @return {string} The headline.
 */
export function todoTitle( todo, hub ) {
	const amount = fmtC( Math.abs( todo.cents ) / 100 );
	const banked = todo.bank.length;
	const hubbed = todo.hub.length;
	switch ( todo.kind ) {
		case 'add':
			return sprintf(
				/* translators: 1: amount, 2: deposit or payment. */
				__( 'Not in the Hub: a %1$s %2$s', 'leftstack-financial-hub' ),
				amount,
				noun( todo.cents, 1 )
			);
		case 'pick':
			return sprintf(
				/* translators: 1: how many, 2: deposits or payments, 3: amount. */
				__(
					'%1$d %2$s of %3$s: pair each with a Hub record',
					'leftstack-financial-hub'
				),
				banked,
				noun( todo.cents, banked ),
				amount
			);
		case 'more_in_bank':
			return sprintf(
				/* translators: 1: how many at the bank, 2: deposits or payments, 3: amount, 4: how many in the Hub. */
				__(
					'The bank shows %1$d %2$s of %3$s, the Hub has only %4$d',
					'leftstack-financial-hub'
				),
				banked,
				noun( todo.cents, banked ),
				amount,
				hubbed
			);
		case 'more_in_hub':
			return sprintf(
				/* translators: 1: how many in the Hub, 2: amount, 3: how many at the bank. */
				__(
					'The Hub has %1$d records of %2$s, the bank shows only %3$d',
					'leftstack-financial-hub'
				),
				hubbed,
				amount,
				banked
			);
		case 'close':
			return sprintf(
				/* translators: 1: the bank's amount, 2: the Hub's amount. */
				__(
					'Close, but not exact: the bank has %1$s, the Hub has %2$s',
					'leftstack-financial-hub'
				),
				amount,
				fmtC( Math.abs( hub[ todo.hub[ 0 ] ]?.amount ?? 0 ) )
			);
		case 'date':
			return sprintf(
				/* translators: %s: amount. */
				__(
					'Same amount (%s), but the dates do not fit',
					'leftstack-financial-hub'
				),
				amount
			);
		default:
			return sprintf(
				/* translators: %s: amount. */
				__(
					'Several Hub records add up to this %s',
					'leftstack-financial-hub'
				),
				amount
			);
	}
}

/**
 * The sentence under a to-do headline that says what to do about it.
 *
 * @param {Object} todo A to-do from the review.
 * @param {Object} hub  Hub records by id.
 * @param {Object} bank Bank lines by id.
 * @return {string} The sentence.
 */
export function todoDetail( todo, hub, bank ) {
	switch ( todo.kind ) {
		case 'add':
			return __(
				'Nothing in the Hub fits it. Add it to the Hub and it will match.',
				'leftstack-financial-hub'
			);
		case 'pick':
			return __(
				'Either bank line could go with either record. Our suggested pairing (closest dates first) is below: confirm it, or match by hand.',
				'leftstack-financial-hub'
			);
		case 'more_in_bank':
			return 1 === todo.add.length
				? __(
						'Pair the one the Hub has (suggested below), then add the other one to the Hub.',
						'leftstack-financial-hub'
				  )
				: sprintf(
						/* translators: %d: how many to add to the Hub. */
						__(
							'Pair the ones the Hub has (suggested below), then add the other %d to the Hub.',
							'leftstack-financial-hub'
						),
						todo.add.length
				  );
		case 'more_in_hub':
			return __(
				'The extra Hub records have not reached the bank yet, or were paid another way. Confirm the suggested pairing for the ones that did.',
				'leftstack-financial-hub'
			);
		case 'close': {
			const record = hub[ todo.hub[ 0 ] ];
			return sprintf(
				/* translators: 1: the amount they differ by, 2: the Hub record's name. */
				__(
					'It differs by %1$s from %2$s. If it is the same payment, match them and say why the amounts differ.',
					'leftstack-financial-hub'
				),
				fmtC( Math.abs( todo.difference ) / 100 ),
				record?.label || __( 'a Hub record', 'leftstack-financial-hub' )
			);
		}
		case 'date': {
			const record = hub[ todo.hub[ 0 ] ];
			const line = bank[ todo.bank[ 0 ] ];
			if ( ! record || ! line ) {
				return '';
			}
			const base = sprintf(
				/* translators: 1: the Hub record's date, 2: the bank's date. */
				__(
					'The Hub record is dated %1$s, the bank shows it on %2$s. If they are the same, match them; or fix the date in the Hub.',
					'leftstack-financial-hub'
				),
				fmtDate( record.date ),
				fmtDate( line.date )
			);
			return record.typed
				? `${ base } ${ __(
						'You entered that date yourself.',
						'leftstack-financial-hub'
				  ) }`
				: base;
		}
		default:
			return __(
				'More than one set of records adds up to it. Pick which, by hand.',
				'leftstack-financial-hub'
			);
	}
}

/**
 * What kind of Hub record an id is.
 *
 * @param {string} type payout, donation (one without a payout) or expense, as the review names the kind.
 * @return {string} The kind in words.
 */
export function recordKind( type ) {
	return {
		payout: __( 'Payout', 'leftstack-financial-hub' ),
		donation: __( 'Donation', 'leftstack-financial-hub' ),
		expense: __( 'Expense', 'leftstack-financial-hub' ),
	}[ type ];
}
