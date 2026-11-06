import { __, _n, sprintf } from '@wordpress/i18n';
import { BankTodoCard } from './BankTodoCard';
import { BankDirectionHeading } from './BankDirection';
import { itemAmount, splitByDirection } from './direction';

/**
 * The list of things to do about the bank lines the matcher could not place, one card each.
 *
 * @param {Object}   props
 * @param {Object[]} props.todos          To-dos from the review.
 * @param {Object}   props.bank           Bank lines by id.
 * @param {Object}   props.hub            Hub records by id.
 * @param {boolean}  props.busy           Whether a confirmation is being saved.
 * @param {Function} props.onConfirmPairs Called with a to-do to confirm its suggested pairing.
 * @param {Function} props.onMatchByHand  Called with a to-do to match it by hand.
 * @param {Function} props.onAdd          Called with a bank line id to add it to the Hub.
 */
export function BankTodoList( {
	todos,
	bank,
	hub,
	busy,
	onConfirmPairs,
	onMatchByHand,
	onAdd,
} ) {
	const sections = splitByDirection( todos, ( todo ) =>
		itemAmount( todo, bank, hub )
	);
	return (
		<>
			<h3 className="lsfh-subheading">
				{ sprintf(
					/* translators: %d: number of things to do. */
					_n(
						'To do: %d thing',
						'To do: %d things',
						todos.length,
						'leftstack-financial-hub'
					),
					todos.length
				) }
			</h3>
			<p className="lsfh-meta">
				{ __(
					'These bank lines have no clear partner in the Hub. Each card says what is going on and what to do.',
					'leftstack-financial-hub'
				) }
			</p>
			{ sections.map( ( section ) => (
				<section key={ section.direction }>
					<BankDirectionHeading group={ section } />
					<ul className="lsfh-bank-todos">
						{ section.items.map( ( todo ) => (
							<BankTodoCard
								key={ todo.bank.join( ',' ) }
								todo={ todo }
								bank={ bank }
								hub={ hub }
								busy={ busy }
								onConfirmPairs={ onConfirmPairs }
								onMatchByHand={ onMatchByHand }
								onAdd={ onAdd }
							/>
						) ) }
					</ul>
				</section>
			) ) }
		</>
	);
}
