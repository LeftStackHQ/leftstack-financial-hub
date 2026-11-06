import { __, _n, sprintf } from '@wordpress/i18n';
import { fmtC } from '../shared';
import { useAmendments } from '../../hooks/useAmendments';

/**
 * One refund on the amendments list: who, when it was entered, which donation it refunds, and how much.
 *
 * @param {Object}   props
 * @param {Object}   props.refund     A refund from /filing-check/amendments.
 * @param {Function} props.onEdit     Opens the refund to edit.
 * @param {Function} props.onReported Marks the refund reported.
 */
function AmendmentRefund( { refund, onEdit, onReported } ) {
	const unplaced = !! refund.reason;
	let original = __( 'No original linked', 'leftstack-financial-hub' );
	if ( refund.original_id ) {
		original = sprintf(
			/* translators: 1: donation id, 2: date it was given. */
			__( 'Original #%1$d, given %2$s', 'leftstack-financial-hub' ),
			refund.original_id,
			refund.original_date
		);
	}
	return (
		<tr>
			<td>
				{ sprintf(
					/* translators: 1: refund id, 2: donor name. */
					__( 'Refund #%1$d, %2$s', 'leftstack-financial-hub' ),
					refund.id,
					refund.donor
				) }
				<div className="lsfh-meta">
					{ sprintf(
						/* translators: %s: date the refund was entered. */
						__( 'Entered %s', 'leftstack-financial-hub' ),
						refund.entered
					) }
				</div>
			</td>
			<td>
				{ original }
				{ 'no_period' === refund.reason && (
					<div className="lsfh-meta">
						{ __(
							'The original has no filing period',
							'leftstack-financial-hub'
						) }
					</div>
				) }
			</td>
			<td className="lsfh-amount negative">
				{ fmtC( refund.gross_amount ) }
			</td>
			<td>
				<button
					className="btn btn-ghost btn-sm"
					onClick={ () => onEdit( refund.id ) }
				>
					{ unplaced
						? __( 'Link the original', 'leftstack-financial-hub' )
						: __( 'Open', 'leftstack-financial-hub' ) }
				</button>{ ' ' }
				<button
					className="btn btn-sm"
					onClick={ () => onReported( [ refund.id ] ) }
				>
					{ __( 'Mark reported', 'leftstack-financial-hub' ) }
				</button>
			</td>
		</tr>
	);
}

/**
 * Donations → Before you file, below the check: the periods that were filed and now need an amendment because a
 * donation in them was refunded, with a way to mark each refund reported. Reporting a refund is its Filed status; nothing
 * is sent to the state. Refunds that can't be matched to a period are listed apart.
 *
 * @param {Object}   props
 * @param {Function} props.onEdit  Opens a donation by id to edit.
 * @param {number}   props.version Change it to load the list again.
 */
export function AmendmentsList( { onEdit, version } ) {
	const { result, error, markReported } = useAmendments( version );
	if ( error ) {
		return <div className="lsfh-alert-box">{ error }</div>;
	}
	if ( ! result ) {
		return null;
	}
	const table = ( rows ) => (
		<div className="lsfh-box lsfh-box--table">
			<div className="lsfh-tscroll">
				<table className="lsfh-table">
					<tbody>
						{ rows.map( ( r ) => (
							<AmendmentRefund
								key={ r.id }
								refund={ r }
								onEdit={ onEdit }
								onReported={ markReported }
							/>
						) ) }
					</tbody>
				</table>
			</div>
		</div>
	);
	return (
		<>
			<h3 className="lsfh-subheading">
				{ __(
					'Periods that need an amendment',
					'leftstack-financial-hub'
				) }
			</h3>
			<p className="lsfh-meta">
				{ __(
					'A donation is always reported in its own period. When one is refunded after that period was filed, amend that period on the state site, then mark the refund reported here. Nothing is sent to the state.',
					'leftstack-financial-hub'
				) }
			</p>
			{ 0 === result.count && (
				<p className="lsfh-meta">
					<strong>
						{ __(
							'No refunds are waiting to be reported.',
							'leftstack-financial-hub'
						) }
					</strong>
				</p>
			) }
			{ result.periods.map( ( p ) => (
				<div key={ p.id }>
					<p>
						<strong>
							{ sprintf(
								/* translators: %s: filing period name. */
								__( 'Amend %s', 'leftstack-financial-hub' ),
								p.name
							) }
						</strong>{ ' ' }
						{ sprintf(
							/* translators: 1: number of refunds, 2: total refunded. */
							_n(
								'%1$d refund, %2$s',
								'%1$d refunds, %2$s',
								p.count,
								'leftstack-financial-hub'
							),
							p.count,
							fmtC( p.total )
						) }{ ' ' }
						<button
							className="btn btn-sm"
							onClick={ () =>
								markReported( p.refunds.map( ( r ) => r.id ) )
							}
						>
							{ __(
								'Mark all reported',
								'leftstack-financial-hub'
							) }
						</button>
					</p>
					{ table( p.refunds ) }
				</div>
			) ) }
			{ result.unplaced.length > 0 && (
				<>
					<p>
						<strong>
							{ __(
								'Refunds with no period to amend',
								'leftstack-financial-hub'
							) }
						</strong>
					</p>
					{ table( result.unplaced ) }
				</>
			) }
			{ result.more && (
				<p className="lsfh-meta">
					{ __(
						'Showing the newest refunds only. Mark some reported to see the rest.',
						'leftstack-financial-hub'
					) }
				</p>
			) }
		</>
	);
}
