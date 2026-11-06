import { ClipboardCheck, CreditCard, List, Users } from 'lucide-react';

/**
 * The Transactions, Donors, Disbursements and Before you file tab buttons, with the transaction count.
 *
 * @param {Object}   props
 * @param {Function} props.setTab Switches tab.
 * @param {string}   props.tab    The tab showing: transactions, donors, disbursements or filing-check.
 * @param {number}   props.total  Number of transactions matching the filters.
 */
export function DonationsTabs( { setTab, tab, total } ) {
	return (
		<>
			<div className="lsfh-tabs">
				<button
					className={ `lsfh-tab ${
						tab === 'transactions' ? 'active' : ''
					}` }
					onClick={ () => setTab( 'transactions' ) }
				>
					<List size={ 14 } /> Transactions{ ' ' }
					<span className="lsfh-tab-count">{ total }</span>
				</button>
				<button
					className={ `lsfh-tab ${
						tab === 'donors' ? 'active' : ''
					}` }
					onClick={ () => setTab( 'donors' ) }
				>
					<Users size={ 14 } /> Donors
				</button>
				<button
					className={ `lsfh-tab ${
						tab === 'disbursements' ? 'active' : ''
					}` }
					onClick={ () => setTab( 'disbursements' ) }
				>
					<CreditCard size={ 14 } /> Disbursements
				</button>
				<button
					className={ `lsfh-tab ${
						tab === 'filing-check' ? 'active' : ''
					}` }
					onClick={ () => setTab( 'filing-check' ) }
				>
					<ClipboardCheck size={ 14 } /> Before you file
				</button>
			</div>
		</>
	);
}
