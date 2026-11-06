import { __, _n, sprintf } from '@wordpress/i18n';

/**
 * What a sync or an import changed on donations and payouts that were already saved: phone numbers and emails filled
 * in where they were blank, and payouts that got their bank reference. Shows nothing when none changed.
 *
 * @param {Object} props
 * @param {Object} props.result The sync or import response (phones_added, emails_added, bank_refs_filled).
 */
export function SyncChanges( { result } ) {
	const phones = result.phones_added || 0;
	const emails = result.emails_added || 0;
	const refs = result.bank_refs_filled || 0;
	if ( ! phones && ! emails && ! refs ) {
		return null;
	}
	return (
		<div
			style={ {
				margin: '0 0 12px',
				padding: '10px 14px',
				background: 'var(--green-lt)',
				borderRadius: 'var(--radius-sm)',
				fontSize: 'var(--fs-base)',
				color: 'var(--green)',
				textAlign: 'left',
			} }
		>
			{ phones > 0 && (
				<div>
					{ sprintf(
						/* translators: %d: number of saved donations that got a phone number. */
						_n(
							'%d phone number filled in on a donation that was already saved.',
							'%d phone numbers filled in on donations that were already saved.',
							phones,
							'leftstack-financial-hub'
						),
						phones
					) }
				</div>
			) }
			{ emails > 0 && (
				<div>
					{ sprintf(
						/* translators: %d: number of saved donations that got an email address. */
						_n(
							'%d email address filled in on a donation that was already saved.',
							'%d email addresses filled in on donations that were already saved.',
							emails,
							'leftstack-financial-hub'
						),
						emails
					) }
				</div>
			) }
			{ refs > 0 && (
				<div>
					{ sprintf(
						/* translators: %d: number of payouts that got a bank reference. */
						_n(
							'%d payout got its bank reference.',
							'%d payouts got their bank references.',
							refs,
							'leftstack-financial-hub'
						),
						refs
					) }
				</div>
			) }
			{ ( phones > 0 || emails > 0 ) && (
				<div
					style={ {
						fontSize: 'var(--fs-cmp)',
						color: 'var(--muted)',
					} }
				>
					{ __(
						'Only blank values are filled in. A phone number or email that was already there is never replaced.',
						'leftstack-financial-hub'
					) }
				</div>
			) }
		</div>
	);
}
