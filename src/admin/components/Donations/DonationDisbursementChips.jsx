import { CreditCard } from 'lucide-react';

/**
 * The "viewing one disbursement" and "refund view" bars above the Donations table, each with its Clear button.
 *
 * @param {Object}   props
 * @param {string}   props.fDisbId    Disbursement being viewed, or an empty string.
 * @param {boolean}  props.fHasRefund Whether the refund view of that disbursement is on.
 * @param {Function} props.setFilter  Sets one filter ( name, value ).
 * @param {Function} props.setFilters Sets several filters at once.
 */
export function DonationDisbursementChips( {
	fDisbId,
	fHasRefund,
	setFilter,
	setFilters,
} ) {
	return (
		<>
			{ fDisbId && (
				<div
					style={ {
						display: 'flex',
						alignItems: 'center',
						gap: 8,
						marginBottom: 8,
						padding: '6px 12px',
						background: 'var(--p-xlt)',
						borderRadius: 'var(--radius-sm)',
						fontSize: 'var(--fs-base)',
						color: 'var(--p)',
						border: '1px solid var(--p-lt)',
					} }
				>
					<CreditCard size={ 13 } />
					<span>
						Filtered by Disbursement{ ' ' }
						<code
							style={ {
								background: 'var(--white)',
								padding: '1px 6px',
								borderRadius: 'var(--radius-xs)',
								fontSize: 'var(--fs-cmp)',
							} }
						>
							{ fDisbId }
						</code>
					</span>
					<button
						className="lsfh-icon-btn"
						style={ {
							marginLeft: 'auto',
							color: 'var(--muted)',
						} }
						onClick={ () => setFilter( 'fDisbId', '' ) }
					>
						✕ Clear
					</button>
				</div>
			) }
			{ /* Amendment filter chip — shows contributions from a specific disbursement that were later refunded */ }
			{ fDisbId && fHasRefund && (
				<div
					style={ {
						display: 'flex',
						alignItems: 'center',
						gap: 8,
						marginBottom: 8,
						padding: '6px 12px',
						background: 'var(--gold-lt)',
						borderRadius: 'var(--radius-sm)',
						fontSize: 'var(--fs-base)',
						color: 'var(--gold)',
						border: '1px solid var(--gold-lt)',
					} }
				>
					<CreditCard size={ 13 } />
					<span>
						Refund view — contributions from Disbursement{ ' ' }
						<code
							style={ {
								background: 'var(--white)',
								padding: '1px 6px',
								borderRadius: 'var(--radius-xs)',
								fontSize: 'var(--fs-cmp)',
							} }
						>
							{ fDisbId }
						</code>{ ' ' }
						with associated refunds
					</span>
					<button
						className="lsfh-icon-btn"
						style={ {
							marginLeft: 'auto',
							color: 'var(--muted)',
						} }
						onClick={ () => {
							setFilters( { fDisbId: '', fHasRefund: false } );
						} }
					>
						✕ Clear
					</button>
				</div>
			) }
		</>
	);
}
