import { __, _n, sprintf } from '@wordpress/i18n';
import { apiGet, apiSend, confirmAction, fmtC } from '../components/shared';

/**
 * What the screen does about payout fees: bring one payout's fee expense right, bring all of them right
 * after showing what would change, and keep one of several fee expenses.
 *
 * @param {Function} load Reloads the payouts list after a change.
 * @return {{fixOne: Function, fixAll: Function, keepOne: Function}} The actions.
 */
export function useDisbursementFees( load ) {
	const say = ( done ) => {
		const parts = [];
		if ( done.created ) {
			parts.push(
				sprintf(
					/* translators: %d: fee expenses created. */
					_n(
						'%d fee expense created',
						'%d fee expenses created',
						done.created,
						'leftstack-financial-hub'
					),
					done.created
				)
			);
		}
		if ( done.linked ) {
			parts.push(
				sprintf(
					/* translators: %d: existing fee expenses linked to their payouts. */
					_n(
						'%d existing fee expense linked',
						'%d existing fee expenses linked',
						done.linked,
						'leftstack-financial-hub'
					),
					done.linked
				)
			);
		}
		if ( done.renamed ) {
			parts.push(
				sprintf(
					/* translators: %d: fee expenses whose payee was changed to the processor's name. */
					_n(
						'%d payee renamed',
						'%d payees renamed',
						done.renamed,
						'leftstack-financial-hub'
					),
					done.renamed
				)
			);
		}
		if ( done.balanced ) {
			parts.push(
				sprintf(
					/* translators: %d: fee expenses marked Balanced because their payout is reconciled. */
					_n(
						'%d fee expense marked balanced',
						'%d fee expenses marked balanced',
						done.balanced,
						'leftstack-financial-hub'
					),
					done.balanced
				)
			);
		}
		if ( done.updated ) {
			parts.push(
				sprintf(
					/* translators: %d: fee expenses whose amount was corrected. */
					_n(
						'%d amount corrected',
						'%d amounts corrected',
						done.updated,
						'leftstack-financial-hub'
					),
					done.updated
				)
			);
		}
		window.lsfhToast(
			parts.length
				? `${ parts.join( ', ' ) }.`
				: __( 'Nothing needed changing.', 'leftstack-financial-hub' )
		);
	};

	const fix = async ( ids ) => {
		const r = await apiSend(
			'POST',
			'/disbursements/fees/fix',
			ids ? { ids } : {}
		);
		if ( ! r.ok ) {
			window.lsfhToast(
				__( 'Could not fix the fees.', 'leftstack-financial-hub' )
			);
			return;
		}
		say( await r.json() );
		load();
	};

	const fixOne = ( row ) => fix( [ row.id ] );

	const fixAll = async () => {
		const r = await apiGet( '/disbursements/fees/plan' );
		if ( ! r.ok ) {
			window.lsfhToast(
				__( 'Could not load the fees.', 'leftstack-financial-hub' )
			);
			return;
		}
		const plan = await r.json();
		const { link, create, update, rename, balance } = plan.counts;
		const lines = [];
		if ( create ) {
			lines.push(
				sprintf(
					/* translators: %d: fee expenses to create. */
					_n(
						'Create %d fee expense.',
						'Create %d fee expenses.',
						create,
						'leftstack-financial-hub'
					),
					create
				)
			);
		}
		if ( link ) {
			lines.push(
				sprintf(
					/* translators: %d: existing fee expenses to link. */
					_n(
						'Link %d existing fee expense to its payout (same amount, within 3 days).',
						'Link %d existing fee expenses to their payouts (same amount, within 3 days).',
						link,
						'leftstack-financial-hub'
					),
					link
				)
			);
		}
		if ( update ) {
			lines.push(
				sprintf(
					/* translators: %d: fee expenses whose amount is wrong. */
					_n(
						'Correct the amount of %d fee expense.',
						'Correct the amount of %d fee expenses.',
						update,
						'leftstack-financial-hub'
					),
					update
				)
			);
		}
		if ( rename ) {
			lines.push(
				sprintf(
					/* translators: %d: fee expenses whose payee is a payout number. */
					_n(
						'Rename the payee of %d fee expense from the payout number to the processor (ActBlue, OATH or Democracy Engine).',
						'Rename the payee of %d fee expenses from the payout number to the processor (ActBlue, OATH or Democracy Engine).',
						rename,
						'leftstack-financial-hub'
					),
					rename
				)
			);
		}
		if ( balance ) {
			lines.push(
				sprintf(
					/* translators: %d: fee expenses to mark Balanced because their payout is already reconciled. */
					_n(
						"Mark %d fee expense Balanced, because its payout is already reconciled (a blank Posted date is filled from the payout's Date Received).",
						"Mark %d fee expenses Balanced, because their payouts are already reconciled (a blank Posted date is filled from the payout's Date Received).",
						balance,
						'leftstack-financial-hub'
					),
					balance
				)
			);
		}
		const covered = plan.total
			? ` ${ sprintf(
					/* translators: %s: total dollars. */
					__( 'Fees covered: %s.', 'leftstack-financial-hub' ),
					fmtC( plan.total )
			  ) }`
			: '';
		const ok = await confirmAction( `${ lines.join( ' ' ) }${ covered }`, {
			confirmLabel: __( 'Fix fees', 'leftstack-financial-hub' ),
			title: __( 'Fix payout fees?', 'leftstack-financial-hub' ),
			danger: false,
		} );
		if ( ok ) {
			await fix( null );
		}
	};

	const keepOne = async ( row ) => {
		const [ keep, ...extra ] = row.fee_expense_ids;
		const ok = await confirmAction(
			sprintf(
				/* translators: %d: how many fee expenses will be removed. */
				_n(
					'This payout has %d extra fee expense. Keep the oldest one and remove the extra?',
					'This payout has %d extra fee expenses. Keep the oldest one and remove the extras?',
					extra.length,
					'leftstack-financial-hub'
				),
				extra.length
			),
			{
				confirmLabel: __( 'Remove extra', 'leftstack-financial-hub' ),
				title: __(
					'More than one fee expense',
					'leftstack-financial-hub'
				),
			}
		);
		if ( ! ok ) {
			return;
		}
		const r = await apiSend(
			'POST',
			`/disbursements/${ row.id }/fees/keep`,
			{ expense_id: keep }
		);
		window.lsfhToast(
			r.ok
				? __( 'Extra fee expenses removed.', 'leftstack-financial-hub' )
				: __( 'Could not remove them.', 'leftstack-financial-hub' )
		);
		load();
	};

	return { fixOne, fixAll, keepOne };
}
