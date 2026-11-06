import { ELECTION_TYPES, fmtC, CheckToggle } from '../shared';
import { Trash2 } from 'lucide-react';
import FeeLogButton from './FeeLogButton';
import { DisbursementStatus } from './DisbursementStatus';
import { DisbursementProcessor } from './DisbursementProcessor';
import { DisbursementNotes } from './DisbursementNotes';
import { DisbursementRefunds } from './DisbursementRefunds';
import { SmartDate } from '../SmartDate';
import { inlineField } from './inlineField';

/**
 * Break a disbursement down by the elections its contributions were given.
 * A payout carries one election label, but nothing forces the contributions
 * inside it to agree — and each one files under its own election regardless.
 *
 * @param {Object} row A disbursement row from /disbursements.
 * @return {{mixed: boolean, summary: string}} Whether they disagree, and the tally.
 */
function electionMix( row ) {
	const parts = ELECTION_TYPES.map( ( t ) => ( {
		t,
		n: row[ `elec_${ t }` ] || 0,
	} ) ).filter( ( x ) => x.n > 0 );
	return {
		mixed: parts.length > 1,
		summary: parts.map( ( x ) => `${ x.n } ${ x.t }` ).join( ', ' ),
	};
}

/**
 * One row of the Disbursements table, with its inline editors for the payout date, election,
 * filing period, date received and bank reference, and the Balanced and Filed toggles.
 *
 * @param {Object}   props
 * @param {Object}   props.row                The disbursement from /disbursements.
 * @param {Object}   props.dcols              Column preferences (dcols.show( key )).
 * @param {Array}    props.periods            Filing periods, for the period picker.
 * @param {Object}   props.editing            The cell being edited ({ id, field }) or null.
 * @param {Function} props.setEditing         Opens or closes an editor.
 * @param {Function} props.save               Saves one field and closes the editor.
 * @param {Function} props.onFixFee           Brings this payout's fee expense right.
 * @param {Function} props.onKeepFee          Keeps one of this payout's several fee expenses.
 * @param {Function} props.toggleReconciled   Flips Balanced for this payout.
 * @param {Function} props.toggleFiled        Flips Filed for this payout.
 * @param {Function} props.deleteDisbursement Deletes this payout (after confirming).
 * @param {Function} props.onViewDisbursement Shows this payout's transactions.
 * @param {Function} props.onViewAmendments   Shows this payout's refunded transactions.
 */
export function DisbursementRow( {
	row,
	dcols,
	periods,
	editing,
	setEditing,
	save,
	onFixFee,
	onKeepFee,
	toggleReconciled,
	toggleFiled,
	deleteDisbursement,
	onViewDisbursement,
	onViewAmendments,
} ) {
	const inline = inlineField( row, editing, setEditing );
	const disbDate = inline( 'disbursement_date' );
	const election = inline( 'election_type' );
	const received = inline( 'date_received' );
	const bankRef = inline( 'bank_reference' );
	return (
		<tr
			style={ {
				background: row.reconciled ? 'var(--p-xlt)' : undefined,
			} }
		>
			<td>
				<div className="lsfh-id-cell">
					<button
						type="button"
						className="lsfh-id-link"
						onClick={ () =>
							onViewDisbursement?.( row.disbursement_id )
						}
						title="View the transactions in this disbursement"
					>
						<code>{ row.disbursement_id }</code>
					</button>
					<FeeLogButton
						row={ row }
						onFix={ onFixFee }
						onKeep={ onKeepFee }
					/>
				</div>
				<DisbursementProcessor
					row={ row }
					field={ inline( 'processor' ) }
					save={ save }
				/>
			</td>
			<td className="lsfh-meta-sm lsfh-nowrap">
				{ disbDate.active ? (
					<SmartDate
						ref={ ( node ) => node?.focus() }
						defaultValue={ row.disbursement_date || '' }
						className="lsfh-input"
						style={ {
							width: 130,
							padding: '2px 6px',
							fontSize: 'var(--fs-cmp)',
						} }
						onBlur={ ( e ) =>
							save(
								row.id,
								'disbursement_date',
								e.target.value || null
							)
						}
						onKeyDown={ disbDate.keys }
						onClear={ () => {
							save( row.id, 'disbursement_date', null );
							setEditing( null );
						} }
					/>
				) : (
					<span
						style={ {
							cursor: 'pointer',
							color: row.disbursement_date
								? 'var(--ink)'
								: 'var(--subtle)',
						} }
						title={
							row.disbursement_date
								? 'Click to edit'
								: 'Not paid out yet — some providers leave this empty until the payout settles. Click to set it.'
						}
						{ ...disbDate.trigger }
					>
						{ row.disbursement_date || 'Pending' }
					</span>
				) }
			</td>
			{ dcols.show( 'contribs' ) && (
				<td style={ { fontWeight: 600 } }>{ row.live_count }</td>
			) }
			{ dcols.show( 'gross' ) && (
				<td className="lsfh-amount positive">
					{ fmtC( row.live_gross ) }
				</td>
			) }
			{ dcols.show( 'fees' ) && (
				<td className="lsfh-amount-fee">{ fmtC( row.live_fees ) }</td>
			) }
			{ dcols.show( 'net' ) && (
				<td style={ { fontWeight: 700 } } className="lsfh-amount">
					{ fmtC( row.live_net ) }
				</td>
			) }
			{ dcols.show( 'status' ) && (
				<td>
					<DisbursementStatus row={ row } periods={ periods } />
				</td>
			) }
			{ dcols.show( 'election' ) && (
				<td>
					{ election.active ? (
						<select
							ref={ ( node ) => node?.focus() }
							className="lsfh-input"
							style={ {
								width: 100,
								padding: '2px 6px',
								fontSize: 'var(--fs-cmp)',
							} }
							defaultValue={ row.election_type || '' }
							onChange={ ( e ) =>
								save( row.id, 'election_type', e.target.value )
							}
							onBlur={ ( e ) =>
								save( row.id, 'election_type', e.target.value )
							}
						>
							<option value="">—</option>
							{ ELECTION_TYPES.map( ( t ) => (
								<option key={ t } value={ t }>
									{ t.charAt( 0 ).toUpperCase() +
										t.slice( 1 ) }
								</option>
							) ) }
						</select>
					) : (
						<span
							style={ {
								cursor: 'pointer',
								color: row.election_type
									? 'var(--ink)'
									: 'var(--subtle)',
								fontSize: 'var(--fs-cmp)',
							} }
							title={
								electionMix( row ).mixed
									? `Contributions in this payout: ${
											electionMix( row ).summary
									  }. Each one files under its own election — this label does not change them. Click to set.`
									: 'Click to set election'
							}
							{ ...election.trigger }
						>
							{ row.election_type
								? row.election_type.charAt( 0 ).toUpperCase() +
								  row.election_type.slice( 1 )
								: '+ Set' }
						</span>
					) }
				</td>
			) }
			{ dcols.show( 'period' ) && (
				<td
					style={ {
						fontSize: 'var(--fs-cmp)',
						color: row.filing_period_id
							? 'var(--ink)'
							: 'var(--subtle)',
					} }
				>
					{ row.filing_period_id
						? periods.find( ( p ) => p.id === row.filing_period_id )
								?.name || `Period ${ row.filing_period_id }`
						: '—' }
					{ row.other_periods?.length > 0 && (
						<span
							className="badge badge-xs badge-gold"
							style={ { marginLeft: 6 } }
							title={ `Also holds donations from other periods: ${ row.other_periods
								.map(
									( o ) =>
										`${ o.count } from ${
											o.period
										} (${ fmtC( o.net ) } net)`
								)
								.join(
									', '
								) }. They report under their own period, so that period may need an amendment. The deposit total still matches the bank.` }
						>
							Mixed
						</span>
					) }
				</td>
			) }
			{ dcols.show( 'received' ) && (
				<td className="lsfh-nowrap">
					{ received.active ? (
						<SmartDate
							ref={ ( node ) => node?.focus() }
							defaultValue={ row.date_received || '' }
							className="lsfh-input"
							style={ {
								width: 130,
								padding: '2px 6px',
								fontSize: 'var(--fs-cmp)',
							} }
							onBlur={ ( e ) =>
								save(
									row.id,
									'date_received',
									e.target.value || null
								)
							}
							onKeyDown={ received.keys }
							onClear={ () => {
								save( row.id, 'date_received', null );
								setEditing( null );
							} }
						/>
					) : (
						<span
							style={ {
								cursor: 'pointer',
								color: row.date_received
									? 'var(--ink)'
									: 'var(--subtle)',
								fontSize: 'var(--fs-cmp)',
							} }
							title="Click to edit"
							{ ...received.trigger }
						>
							{ row.date_received || '+ Add date' }
						</span>
					) }
				</td>
			) }
			{ dcols.show( 'bankref' ) && (
				<td>
					{ bankRef.active ? (
						<input
							type="text"
							ref={ ( node ) => node?.focus() }
							defaultValue={ row.bank_reference || '' }
							className="lsfh-input"
							style={ {
								width: 160,
								padding: '2px 6px',
								fontSize: 'var(--fs-cmp)',
							} }
							placeholder="ACH ref / check #"
							onBlur={ ( e ) =>
								save( row.id, 'bank_reference', e.target.value )
							}
							onKeyDown={ bankRef.keys }
						/>
					) : (
						<span
							style={ {
								cursor: 'pointer',
								color: row.bank_reference
									? 'var(--ink)'
									: 'var(--subtle)',
								fontSize: 'var(--fs-cmp)',
							} }
							title="Click to edit"
							{ ...bankRef.trigger }
						>
							{ row.bank_reference || '+ Add reference' }
						</span>
					) }
				</td>
			) }
			{ dcols.show( 'notes' ) && (
				<td>
					<DisbursementNotes
						row={ row }
						field={ inline( 'notes' ) }
						save={ save }
					/>
				</td>
			) }
			{ dcols.show( 'reconciled' ) && (
				<td style={ { textAlign: 'center' } }>
					<CheckToggle
						on={ !! row.reconciled }
						titleOn="Mark unbalanced"
						titleOff="Mark balanced"
						onClick={ () => toggleReconciled( row ) }
					/>
				</td>
			) }
			{ dcols.show( 'filed' ) && (
				<td style={ { textAlign: 'center' } }>
					<CheckToggle
						on={ !! row.filed }
						titleOn="Unmark filed"
						titleOff="Mark filed (marks all linked transactions as filed)"
						onClick={ () => toggleFiled( row ) }
					/>
				</td>
			) }
			{ dcols.show( 'refunds' ) && (
				<td style={ { textAlign: 'center' } }>
					<DisbursementRefunds
						row={ row }
						onViewDisbursement={ onViewDisbursement }
						onViewAmendments={ onViewAmendments }
					/>
				</td>
			) }
			<td>
				<div className="td-actions">
					{ row.live_count === 0 && (
						<button
							className="lsfh-icon-btn lsfh-icon-btn-danger"
							title="Delete disbursement (no linked transactions)"
							onClick={ () => deleteDisbursement( row.id ) }
						>
							<Trash2 size={ 14 } />
						</button>
					) }
				</div>
			</td>
		</tr>
	);
}
