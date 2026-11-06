import { __, _n, sprintf } from '@wordpress/i18n';
import { usePayoutProgress } from '../../hooks/usePayoutProgress';

/**
 * One line about the payouts of a filing period: a warning while some are not balanced to the bank, and (unless
 * warnOnly) a plain line when all are. Shows nothing when no period is chosen or the period has no payouts.
 *
 * @param {Object}  props
 * @param {string}  props.periodId The filing period.
 * @param {boolean} props.warnOnly Show only the warning.
 */
export function PayoutProgressNote( { periodId, warnOnly = false } ) {
	const counts = usePayoutProgress( periodId );
	if ( ! counts || ! counts.total ) {
		return null;
	}
	const open = counts.total - counts.balanced;
	if ( open > 0 ) {
		return (
			<div className="lsfh-alert-box">
				{ sprintf(
					/* translators: 1: payouts not balanced yet, 2: all payouts in the period. */
					_n(
						'%1$d of %2$d payouts in this period is not balanced to the bank yet, so some totals may still change.',
						'%1$d of %2$d payouts in this period are not balanced to the bank yet, so some totals may still change.',
						open,
						'leftstack-financial-hub'
					),
					open,
					counts.total
				) }
			</div>
		);
	}
	if ( warnOnly ) {
		return null;
	}
	return (
		<p className="lsfh-meta">
			{ sprintf(
				/* translators: 1: payouts in the period, 2: payouts already filed. */
				__(
					'All %1$d payouts in this period are balanced to the bank. %2$d are filed.',
					'leftstack-financial-hub'
				),
				counts.total,
				counts.filed
			) }
		</p>
	);
}
