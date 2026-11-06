import { useUrlTab } from '../../hooks/useUrlTab';
import { useBankReview } from '../../hooks/useBankReview';
import { BankTabs } from './BankTabs';
import { BankReviewTab } from './BankReviewTab';
import { BankMatchedTab } from './BankMatchedTab';
import { BankOpenTab } from './BankOpenTab';

/**
 * The working area for one bank account: its tabs and the review data they share.
 *
 * @param {Object} props
 * @param {Object} props.account The bank account.
 */
export function BankWorkspace( { account } ) {
	const [ tab, setTab ] = useUrlTab( 'review' );
	const state = useBankReview( account.id );
	const { review } = state;
	const needing = review.matches.length + review.todos.length;

	return (
		<>
			<BankTabs
				tab={ tab }
				setTab={ setTab }
				review={ needing }
				open={ review.hub_open.length }
			/>
			{ 'review' === tab && <BankReviewTab state={ state } /> }
			{ 'matched' === tab && (
				<BankMatchedTab
					accountId={ account.id }
					onChanged={ state.reload }
				/>
			) }
			{ 'open' === tab && (
				<BankOpenTab
					rows={ review.hub_open }
					hub={ review.hub }
					bank={ review.bank }
				/>
			) }
		</>
	);
}
