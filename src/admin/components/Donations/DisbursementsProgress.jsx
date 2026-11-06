import { __, _n, sprintf } from '@wordpress/i18n';

/**
 * How far along the payouts are, with a choice of filing period and a "Needs attention" shortcut.
 *
 * @param {Object}   props
 * @param {Object}   props.counts    total, balanced, matched and filed, for the chosen period.
 * @param {string}   props.status    '' for all payouts, or needs_attention.
 * @param {Function} props.onStatus  Called with the new status.
 * @param {number}   props.periodId  The chosen filing period, or 0 for all.
 * @param {Function} props.onPeriod  Called with the chosen period id (0 for all).
 * @param {Object[]} props.periods   Filing periods to choose from.
 * @param {Function} props.onFixFees Fixes every payout's fee expense after showing what would change.
 */
export function DisbursementsProgress( {
	counts,
	status,
	onStatus,
	periodId,
	onPeriod,
	periods,
	onFixFees,
} ) {
	const needing = counts.total - counts.balanced;
	return (
		<div className="lsfh-bank-progress">
			<label
				htmlFor="lsfh-disb-period"
				className="lsfh-meta lsfh-bank-progress__label"
			>
				{ __( 'Filing period', 'leftstack-financial-hub' ) }
			</label>
			<select
				id="lsfh-disb-period"
				className="lsfh-input"
				value={ periodId }
				onChange={ ( e ) => onPeriod( Number( e.target.value ) ) }
			>
				<option value={ 0 }>
					{ __( 'All periods', 'leftstack-financial-hub' ) }
				</option>
				{ periods.map( ( period ) => (
					<option key={ period.id } value={ period.id }>
						{ period.name }
					</option>
				) ) }
			</select>
			<span className="lsfh-bank-progress__text">
				{ sprintf(
					/* translators: 1: payouts balanced, 2: all payouts, 3: payouts filed. */
					_n(
						'%1$d of %2$d payout balanced, %3$d filed',
						'%1$d of %2$d payouts balanced, %3$d filed',
						counts.total,
						'leftstack-financial-hub'
					),
					counts.balanced,
					counts.total,
					counts.filed
				) }
				{ counts.matched > 0 &&
					sprintf(
						/* translators: %d: payouts matched to the bank. */
						__(
							'(%d matched to the bank)',
							'leftstack-financial-hub'
						),
						counts.matched
					) }
			</span>
			<span className="lsfh-bank-progress__chips">
				<button
					type="button"
					className={ `lsfh-tab ${ '' === status ? 'active' : '' }` }
					aria-pressed={ '' === status }
					onClick={ () => onStatus( '' ) }
				>
					{ sprintf(
						/* translators: %d: number of payouts. */
						__( 'All %d', 'leftstack-financial-hub' ),
						counts.total
					) }
				</button>
				<button
					type="button"
					className={ `lsfh-tab ${
						'needs_attention' === status ? 'active' : ''
					}` }
					aria-pressed={ 'needs_attention' === status }
					onClick={ () => onStatus( 'needs_attention' ) }
				>
					{ sprintf(
						/* translators: %d: number of payouts not balanced yet. */
						__( 'Needs attention %d', 'leftstack-financial-hub' ),
						needing
					) }
				</button>
				{ counts.fees_to_fix > 0 && (
					<button
						type="button"
						className="btn btn-ghost btn-sm"
						onClick={ onFixFees }
						title={ __(
							'Create or correct the fee expenses of these payouts',
							'leftstack-financial-hub'
						) }
					>
						{ sprintf(
							/* translators: %d: number of payouts whose fee expense needs fixing. */
							__( 'Fix fees %d', 'leftstack-financial-hub' ),
							counts.fees_to_fix
						) }
					</button>
				) }
				{ counts.fees_to_check > 0 && (
					<span className="lsfh-meta-sm">
						{ sprintf(
							/* translators: %d: number of payouts whose fees need a look. */
							_n(
								'%d payout has fees to check',
								'%d payouts have fees to check',
								counts.fees_to_check,
								'leftstack-financial-hub'
							),
							counts.fees_to_check
						) }
					</span>
				) }
			</span>
		</div>
	);
}
