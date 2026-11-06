import { __ } from '@wordpress/i18n';
import { ListChecks, Link2, Clock } from 'lucide-react';

/**
 * The tabs of the Bank screen: Review, Matched, and Not at the bank.
 *
 * @param {Object}   props
 * @param {string}   props.tab    The tab showing: review, matched or open.
 * @param {Function} props.setTab Switches tab.
 * @param {number}   props.review How many items need a look on the Review tab.
 * @param {number}   props.open   How many Hub records are not at the bank.
 */
export function BankTabs( { tab, setTab, review, open } ) {
	const button = ( key, icon, label, count ) => (
		<button
			className={ `lsfh-tab ${ tab === key ? 'active' : '' }` }
			onClick={ () => setTab( key ) }
		>
			{ icon } { label }{ ' ' }
			{ null !== count && (
				<span className="lsfh-tab-count">{ count }</span>
			) }
		</button>
	);
	return (
		<div className="lsfh-tabs">
			{ button(
				'review',
				<ListChecks size={ 14 } />,
				__( 'Review', 'leftstack-financial-hub' ),
				review
			) }
			{ button(
				'matched',
				<Link2 size={ 14 } />,
				__( 'Matched', 'leftstack-financial-hub' ),
				null
			) }
			{ button(
				'open',
				<Clock size={ 14 } />,
				__( 'Not at the bank', 'leftstack-financial-hub' ),
				open
			) }
		</div>
	);
}
