import { __, sprintf } from '@wordpress/i18n';
import { fmtDate } from '../shared';
import { BankLineList } from './BankLineList';
import { BankRecordList } from './BankRecordList';
import { todoTitle, todoDetail } from './reasons';

/**
 * The words on the button that adds a bank line to the Hub.
 *
 * @param {Object} todo The to-do from the review.
 * @return {string} "Add to Hub" when the line is the only thing to add, "Add the other one to the Hub" when it is the extra one.
 */
const addLabel = ( todo ) =>
	'add' === todo.kind
		? __( 'Add to Hub', 'leftstack-financial-hub' )
		: __( 'Add the other one to the Hub', 'leftstack-financial-hub' );

/**
 * One thing to do about a bank line the matcher could not place: what the situation is, what to do about it, and
 * the buttons that do it (confirm a suggested pairing, match by hand, add the missing record to the Hub).
 *
 * @param {Object}   props
 * @param {Object}   props.todo           The to-do from the review.
 * @param {Object}   props.bank           Bank lines by id.
 * @param {Object}   props.hub            Hub records by id.
 * @param {boolean}  props.busy           Whether a confirmation is being saved.
 * @param {Function} props.onConfirmPairs Called with the to-do to confirm its suggested pairing.
 * @param {Function} props.onMatchByHand  Called with the to-do to match it by hand.
 * @param {Function} props.onAdd          Called with a bank line id to add it to the Hub.
 */
export function BankTodoCard( {
	todo,
	bank,
	hub,
	busy,
	onConfirmPairs,
	onMatchByHand,
	onAdd,
} ) {
	const pairs = todo.pairs.length;
	return (
		<li className="lsfh-bank-todo">
			<h5 className="lsfh-bank-todo__title">
				{ todoTitle( todo, hub ) }
			</h5>
			<p className="lsfh-meta">{ todoDetail( todo, hub, bank ) }</p>
			<div className="lsfh-bank-todo__cols">
				<div>
					<strong>
						{ __( 'At the bank', 'leftstack-financial-hub' ) }
					</strong>
					<BankLineList ids={ todo.bank } bank={ bank } />
				</div>
				{ todo.hub.length > 0 && (
					<div>
						<strong>
							{ __( 'In the Hub', 'leftstack-financial-hub' ) }
						</strong>
						<BankRecordList ids={ todo.hub } hub={ hub } />
					</div>
				) }
			</div>
			{ pairs > 0 && (
				<div>
					<strong>
						{ __( 'Suggested pairing', 'leftstack-financial-hub' ) }
					</strong>
					<ul className="lsfh-bank-pairs">
						{ todo.pairs.map( ( [ bankId, hubId ] ) => (
							<li key={ bankId }>
								{ sprintf(
									/* translators: 1: the bank line's date, 2: the Hub record's date. */
									__(
										'Bank %1$s with the Hub record dated %2$s',
										'leftstack-financial-hub'
									),
									fmtDate( bank[ bankId ].date ),
									fmtDate( hub[ hubId ].date )
								) }
							</li>
						) ) }
					</ul>
				</div>
			) }
			<div className="lsfh-edit-footer">
				{ pairs > 0 && (
					<button
						className="btn btn-primary btn-sm"
						disabled={ busy }
						onClick={ () => onConfirmPairs( todo ) }
					>
						{ __(
							'Confirm this pairing',
							'leftstack-financial-hub'
						) }
					</button>
				) }
				{ todo.add.map( ( bankId ) => (
					<button
						key={ bankId }
						className="btn btn-primary btn-sm"
						onClick={ () => onAdd( bankId ) }
					>
						{ 'add' === todo.kind || 1 === todo.add.length
							? addLabel( todo )
							: sprintf(
									/* translators: %s: the bank line's date. */
									__(
										'Add the %s one to the Hub',
										'leftstack-financial-hub'
									),
									fmtDate( bank[ bankId ].date )
							  ) }
					</button>
				) ) }
				{ 'add' !== todo.kind && (
					<button
						className="btn btn-ghost btn-sm"
						onClick={ () => onMatchByHand( todo ) }
					>
						{ __( 'Match by hand', 'leftstack-financial-hub' ) }
					</button>
				) }
			</div>
		</li>
	);
}
