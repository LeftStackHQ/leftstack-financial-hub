import { Fragment, useEffect } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { useRowSelection } from '../../hooks/useRowSelection';
import { BankLineList } from './BankLineList';
import { BankRecordList } from './BankRecordList';
import { BankDirectionRow } from './BankDirection';
import { itemAmount, splitByDirection } from './direction';
import { matchReason } from './reasons';

/**
 * A table of suggested matches, each with the reason it was suggested. Rows can be ticked and confirmed
 * together from the summary bar under the table (how many are ticked, and the button), the same bar the other
 * tables use for their totals.
 *
 * @param {Object}   props
 * @param {Object[]} props.rows        Matches, each with an id plus bank, hub, reason (see useBankReview).
 * @param {Object}   props.bank        Bank lines by id.
 * @param {Object}   props.hub         Hub records by id.
 * @param {boolean}  props.preselected Whether every row starts ticked.
 * @param {string}   props.confirmText Label of the button that confirms the ticked rows.
 * @param {Function} props.onConfirm   Called with the ticked rows.
 * @param {boolean}  props.busy        Whether a confirmation is being saved.
 */
export function BankMatchTable( {
	rows,
	bank,
	hub,
	preselected,
	confirmText,
	onConfirm,
	busy,
} ) {
	const selection = useRowSelection();
	const { setSelected } = selection;

	useEffect( () => {
		setSelected(
			new Set( preselected ? rows.map( ( row ) => row.id ) : [] )
		);
	}, [ rows, preselected, setSelected ] );

	const ticked = rows.filter( ( row ) => selection.selected.has( row.id ) );
	const sections = splitByDirection( rows, ( row ) =>
		itemAmount( row, bank, hub )
	);
	return (
		<>
			<div className="lsfh-box lsfh-box--table">
				<div
					className="lsfh-tscroll"
					tabIndex={ 0 }
					role="region"
					aria-label={ __(
						'Suggested matches',
						'leftstack-financial-hub'
					) }
				>
					<table className="lsfh-table">
						<thead>
							<tr>
								<th className="lsfh-th-check">
									<input
										type="checkbox"
										aria-label={ __(
											'Select all',
											'leftstack-financial-hub'
										) }
										checked={
											ticked.length === rows.length
										}
										onChange={ () =>
											selection.toggleAll( rows )
										}
									/>
								</th>
								<th>
									{ __( 'Bank', 'leftstack-financial-hub' ) }
								</th>
								<th>
									{ __( 'Hub', 'leftstack-financial-hub' ) }
								</th>
								<th>
									{ __( 'Why', 'leftstack-financial-hub' ) }
								</th>
							</tr>
						</thead>
						<tbody>
							{ sections.map( ( section ) => (
								<Fragment key={ section.direction }>
									<BankDirectionRow
										group={ section }
										colSpan={ 4 }
									/>
									{ section.items.map( ( row ) => (
										<tr key={ row.id }>
											<td className="lsfh-td-check">
												<input
													type="checkbox"
													aria-label={ __(
														'Select this match',
														'leftstack-financial-hub'
													) }
													checked={ selection.selected.has(
														row.id
													) }
													onChange={ () =>
														selection.toggleOne(
															row.id
														)
													}
												/>
											</td>
											<td>
												<BankLineList
													ids={ row.bank }
													bank={ bank }
												/>
											</td>
											<td>
												<BankRecordList
													ids={ row.hub }
													hub={ hub }
												/>
											</td>
											<td className="lsfh-meta">
												{ matchReason( row.reason ) }
											</td>
										</tr>
									) ) }
								</Fragment>
							) ) }
						</tbody>
					</table>
				</div>
			</div>
			<div className="lsfh-table-totals">
				<span className="lsfh-totals-count">
					{ sprintf(
						/* translators: 1: matches ticked, 2: all matches in the table. */
						__( '%1$d of %2$d ticked', 'leftstack-financial-hub' ),
						ticked.length,
						rows.length
					) }
				</span>
				<button
					className="btn btn-primary"
					disabled={ ! ticked.length || busy }
					onClick={ () => onConfirm( ticked ) }
				>
					{ confirmText( ticked.length ) }
				</button>
			</div>
		</>
	);
}
