import { __, sprintf } from '@wordpress/i18n';
import { electionLabels, fmtC } from '../shared';
import { electionFromName } from './ElectionTypeSelect';
import { CalendarCheck, Pencil, Trash2 } from 'lucide-react';

/**
 * A filing period row in the table.
 *
 * @param {Object}   props
 * @param {Object}   props.p        The filing period.
 * @param {boolean}  props.noElec   True when the site has elections turned off.
 * @param {Function} props.onAssign Offer to move the records dated inside the period into it.
 * @param {Function} props.onEdit   Open the row for editing.
 * @param {Function} props.onDelete Delete the period.
 */
export function PeriodRow( { p, noElec, onAssign, onEdit, onDelete } ) {
	// A name like "Pre-General" says which election it is. When the election is another one, say so (advice only).
	const named = electionFromName( p.name );
	const mismatch =
		! noElec &&
		'' !== named &&
		named !== String( p.election_type ).toLowerCase();
	return (
		<tr>
			<td className="lsfh-bold">{ p.name }</td>
			{ ! noElec && (
				<td>
					<span className="badge badge-teal">
						{ p.election_type }
					</span>
					{ mismatch && (
						<div className="lsfh-fp-note">
							{ sprintf(
								/* translators: %s: an election, such as General. */
								__(
									'The name says %s. Check the election.',
									'leftstack-financial-hub'
								),
								electionLabels()[ named ]
							) }
						</div>
					) }
				</td>
			) }
			<td className="lsfh-meta-sm">{ p.start_date }</td>
			<td className="lsfh-meta-sm">{ p.end_date }</td>
			<td className="lsfh-bold">{ fmtC( p.beginning_balance ?? 0 ) }</td>
			<td className="lsfh-nowrap">
				<div className="td-actions">
					<button
						className="lsfh-icon-btn"
						onClick={ () => onAssign( p ) }
						title="Move records dated in this period into it"
					>
						<CalendarCheck size={ 14 } />
					</button>
					<button
						className="lsfh-icon-btn"
						onClick={ () => onEdit( p ) }
						title="Edit"
					>
						<Pencil size={ 14 } />
					</button>
					<button
						className="lsfh-icon-btn lsfh-icon-btn-danger"
						onClick={ () => onDelete( p.id ) }
						title="Delete"
					>
						<Trash2 size={ 14 } />
					</button>
				</div>
			</td>
		</tr>
	);
}
