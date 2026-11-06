import {
	Receipt,
	CircleCheck,
	CheckCheck,
	TriangleAlert,
	Pencil,
} from 'lucide-react';
import { __, sprintf } from '@wordpress/i18n';
import { fmtC, confirmAction } from '../shared';

const ICONS = {
	none: Receipt,
	ok: CircleCheck,
	short: TriangleAlert,
	over: TriangleAlert,
	many: TriangleAlert,
	rename: Pencil,
	balance: CheckCheck,
};

/**
 * What the button says and does for a payout's fee expense.
 *
 * @param {Object} row  The payout row from the disbursements list.
 * @param {number} fees Processing fees on the payout.
 * @return {string} The fee state, review when an older expense might be the payout's own, rename when only the
 *                  payee is still the payout's id, or balance when the payout is reconciled and the fee expense is not.
 */
function stateOf( row, fees ) {
	if ( [ 'review', 'rename', 'balance' ].includes( row.fee_action ) ) {
		return row.fee_action;
	}
	if ( 'nothing' === row.fee_state && fees <= 0 ) {
		return 'nothing';
	}
	return row.fee_state;
}

/**
 * The small fee icon beside a Disbursement ID. The payout's fee expense is made for it automatically; the
 * icon shows whether that is right and, when it is not, fixes it with a click.
 *
 * @param {Object}   props
 * @param {Object}   props.row    The payout row from the disbursements list.
 * @param {Function} props.onFix  Called with the row to bring its fee expense right.
 * @param {Function} props.onKeep Called with the row to keep one of its several fee expenses.
 */
export default function FeeLogButton( { row, onFix, onKeep } ) {
	const fees = Number( row.live_fees ) || 0;
	const logged = Number( row.fees_logged ) || 0;
	const state = stateOf( row, fees );
	if ( 'nothing' === state ) {
		return null;
	}
	const Icon = ICONS[ state ] || TriangleAlert;

	const titles = {
		none: sprintf(
			/* translators: %s: fees in dollars. */
			__( 'Create the %s fee expense', 'leftstack-financial-hub' ),
			fmtC( fees )
		),
		ok: sprintf(
			/* translators: %s: fees logged, in dollars. */
			__( 'Fees logged: %s', 'leftstack-financial-hub' ),
			fmtC( logged )
		),
		short: sprintf(
			/* translators: 1: fees logged, 2: fees on the payout. */
			__(
				'Logged %1$s of %2$s. Correct the fee expense',
				'leftstack-financial-hub'
			),
			fmtC( logged ),
			fmtC( fees )
		),
		over: sprintf(
			/* translators: 1: fees logged, 2: fees on the payout. */
			__(
				'Logged %1$s, more than the %2$s in fees. Correct the fee expense',
				'leftstack-financial-hub'
			),
			fmtC( logged ),
			fmtC( fees )
		),
		many: __(
			'More than one fee expense for this payout. Click to keep one',
			'leftstack-financial-hub'
		),
		rename: __(
			'The fee is right, but the payee is still the payout number. Rename it to the processor',
			'leftstack-financial-hub'
		),
		balance: __(
			'The payout is reconciled but this fee expense is not balanced. Mark it balanced',
			'leftstack-financial-hub'
		),
		review: __(
			'An older fee expense with the same amount is near this date. Check Expenditures before creating another',
			'leftstack-financial-hub'
		),
	};

	const onClick = async () => {
		if ( 'ok' === state ) {
			window.lsfhToast( titles.ok );
		} else if ( 'review' === state ) {
			window.lsfhToast( titles.review, 6000 );
		} else if ( 'many' === state ) {
			onKeep( row );
		} else if ( [ 'none', 'rename', 'balance' ].includes( state ) ) {
			onFix( row );
		} else {
			const ok = await confirmAction(
				sprintf(
					/* translators: 1: fees logged, 2: fees on the payout. */
					__(
						'The fee expense is %1$s but the payout carries %2$s in fees. Change it to %2$s?',
						'leftstack-financial-hub'
					),
					fmtC( logged ),
					fmtC( fees )
				),
				{
					confirmLabel: __( 'Change it', 'leftstack-financial-hub' ),
					title: __( 'Fees do not match', 'leftstack-financial-hub' ),
					danger: false,
				}
			);
			if ( ok ) {
				onFix( row );
			}
		}
	};

	return (
		<button
			type="button"
			className={ `lsfh-icon-btn lsfh-fee-btn lsfh-fee-btn--${ state }` }
			title={ titles[ state ] }
			aria-label={ titles[ state ] }
			onClick={ onClick }
		>
			<Icon size={ 15 } />
		</button>
	);
}
