import { useMemo, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { BankMatchTable } from './BankMatchTable';
import { BankTodoList } from './BankTodoList';
import { BankAddToHub } from './BankAddToHub';
import { BankManualMatchModal } from './BankManualMatchModal';
import { BankFillDatesOption } from './BankFillDatesOption';

const withId = ( match ) => ( {
	...match,
	id: `${ match.bank.join( ',' ) }|${ match.hub.join( ',' ) }`,
} );

/**
 * The review of an account: matches ready to confirm, groups to check one by one, and a to-do list for the bank lines
 * the matcher could not place.
 *
 * @param {Object} props
 * @param {Object} props.state The useBankReview() result of the account.
 */
export function BankReviewTab( { state } ) {
	const { review, loading, error, confirm, reload, fillDates, setFillDates } =
		state;
	const [ busy, setBusy ] = useState( false );
	const [ message, setMessage ] = useState( '' );
	const [ manual, setManual ] = useState( null );
	const [ adding, setAdding ] = useState( null );

	const ready = useMemo(
		() =>
			review.matches.filter( ( m ) => 'clear' === m.tier ).map( withId ),
		[ review ]
	);
	const groups = useMemo(
		() =>
			review.matches.filter( ( m ) => 'clear' !== m.tier ).map( withId ),
		[ review ]
	);

	const save = async ( rows ) => {
		setBusy( true );
		setMessage( '' );
		const problem = await confirm(
			rows.map( ( { bank, hub, tier, reason } ) => ( {
				bank,
				hub,
				tier,
				reason,
			} ) )
		);
		setBusy( false );
		setMessage( problem );
		if ( ! problem ) {
			window.lsfhToast?.(
				sprintf(
					/* translators: %d: number of matches saved. */
					_n(
						'%d match confirmed',
						'%d matches confirmed',
						rows.length,
						'leftstack-financial-hub'
					),
					rows.length
				)
			);
		}
	};

	if ( loading && ! review.bank ) {
		return null;
	}
	const nothing =
		! error &&
		! ready.length &&
		! groups.length &&
		! review.needs_you.length;
	return (
		<>
			{ error && (
				<div className="lsfh-import-error" role="alert">
					{ error }
				</div>
			) }
			{ message && (
				<div className="lsfh-import-error" role="alert">
					{ message }
				</div>
			) }
			{ nothing && ! loading && (
				<div className="lsfh-empty">
					{ __(
						'Nothing to review. Add a bank file to see suggested matches.',
						'leftstack-financial-hub'
					) }
				</div>
			) }
			{ ( ready.length > 0 || groups.length > 0 ) && (
				<BankFillDatesOption
					checked={ fillDates }
					onChange={ setFillDates }
				/>
			) }
			{ ready.length > 0 && (
				<>
					<h3 className="lsfh-subheading">
						{ sprintf(
							/* translators: %d: number of matches. */
							_n(
								'Ready to confirm: %d clear match',
								'Ready to confirm: %d clear matches',
								ready.length,
								'leftstack-financial-hub'
							),
							ready.length
						) }
					</h3>
					<p className="lsfh-meta">
						{ __(
							'Each has only one possible partner and the exact amount, inside the date window. Untick any you do not want.',
							'leftstack-financial-hub'
						) }
					</p>
					<BankMatchTable
						rows={ ready }
						bank={ review.bank }
						hub={ review.hub }
						preselected
						busy={ busy }
						onConfirm={ save }
						confirmText={ ( n ) =>
							sprintf(
								/* translators: %d: number of matches ticked. */
								_n(
									'Confirm %d match',
									'Confirm %d matches',
									n,
									'leftstack-financial-hub'
								),
								n
							)
						}
					/>
				</>
			) }
			{ groups.length > 0 && (
				<>
					<h3 className="lsfh-subheading">
						{ sprintf(
							/* translators: %d: number of suggested groups. */
							_n(
								'Suggested group: %d to review',
								'Suggested groups: %d to review',
								groups.length,
								'leftstack-financial-hub'
							),
							groups.length
						) }
					</h3>
					<p className="lsfh-meta">
						{ __(
							'These add up, but more than one record is involved, so look before you confirm. Tick the ones that are right.',
							'leftstack-financial-hub'
						) }
					</p>
					<BankMatchTable
						rows={ groups }
						bank={ review.bank }
						hub={ review.hub }
						busy={ busy }
						onConfirm={ save }
						confirmText={ ( n ) =>
							sprintf(
								/* translators: %d: number of groups ticked. */
								_n(
									'Confirm %d group',
									'Confirm %d groups',
									n,
									'leftstack-financial-hub'
								),
								n
							)
						}
					/>
				</>
			) }
			{ review.todos.length > 0 && (
				<BankTodoList
					todos={ review.todos }
					bank={ review.bank }
					hub={ review.hub }
					busy={ busy }
					onConfirmPairs={ ( todo ) =>
						save(
							todo.pairs.map( ( [ bankId, hubId ] ) => ( {
								bank: [ bankId ],
								hub: [ hubId ],
								tier: 'group',
								reason: 'suggested_pairing',
							} ) )
						)
					}
					onMatchByHand={ ( todo ) =>
						setManual( {
							bank: todo.bank.slice( 0, 1 ),
							hub: todo.hub,
						} )
					}
					onAdd={ ( bankId ) => setAdding( review.bank[ bankId ] ) }
				/>
			) }
			{ manual && (
				<BankManualMatchModal
					bank={ review.bank }
					hub={ review.hub }
					startBank={ manual.bank }
					startHub={ manual.hub }
					onConfirm={ confirm }
					fillDates={ fillDates }
					onFillDates={ setFillDates }
					onClose={ () => setManual( null ) }
				/>
			) }
			{ adding && (
				<BankAddToHub
					line={ adding }
					onSaved={ () => {
						setAdding( null );
						reload();
					} }
					onClose={ () => setAdding( null ) }
				/>
			) }
		</>
	);
}
