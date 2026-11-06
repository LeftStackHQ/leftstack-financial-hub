import { useState } from '@wordpress/element';
import {
	onKeyActivate,
	ariaSortValue,
	ColumnsBtn,
	electionsHidden,
	fmtC,
	Pagination,
	TableTotals,
} from '../shared';
import { useColumnPrefs } from '../../hooks/useColumnPrefs';
import { RefreshCw, FileUp } from 'lucide-react';
import { renderSortArrow } from './helpers';
import { useListState } from '../../hooks/useListState';
import { useDisbursements } from '../../hooks/useDisbursements';
import { useDisbursementFees } from '../../hooks/useDisbursementFees';
import { DisbursementRow } from './DisbursementRow';
import { DisbursementsProgress } from './DisbursementsProgress';

/* ─────────────── Disbursements Tab ─────────────────────────── */

/**
 * Columns of the Donations → Disbursements table, in display order.
 *
 * Disbursement ID is locked because it is the frozen column — the scroll
 * region targets :first-child positionally. Disb. Date is locked as the
 * other half of a row's identity; with eleven hideable columns remaining
 * the control is not short of choices.
 */
const DISB_COLUMNS = [
	{ key: 'id', label: 'Disbursement ID', locked: true },
	{ key: 'date', label: 'Disb. Date', locked: true },
	{ key: 'contribs', label: 'Contribs.' },
	{ key: 'gross', label: 'Gross' },
	{ key: 'fees', label: 'Fees' },
	{ key: 'net', label: 'Net' },
	{ key: 'status', label: 'Status' },
	{ key: 'election', label: 'Election', off: electionsHidden() },
	{ key: 'period', label: 'Filing Period' },
	{ key: 'received', label: 'Date Received' },
	{ key: 'bankref', label: 'Bank Reference' },
	{ key: 'notes', label: 'Notes' },
	{ key: 'reconciled', label: 'Balanced' },
	{ key: 'filed', label: 'Filed' },
	{ key: 'refunds', label: 'Refunds' },
];

export function DisbursementsView( {
	onViewDisbursement,
	onViewAmendments,
	onShowSync,
	onShowImport,
	periods = [],
	refreshKey,
} ) {
	const dcols = useColumnPrefs( 'donations_disbursements', DISB_COLUMNS );
	const PER_PAGE = 50;
	const [ editing, setEditing ] = useState( null );

	const { page, sortBy, sortDir, filters, setPage, setFilter, toggleSort } =
		useListState( {
			sortBy: 'disbursement_date',
			filters: { status: '', periodId: 0 },
		} );
	const SortTh = ( { col, children, style } ) => (
		<th
			className="lsfh-th-sort"
			onClick={ () => toggleSort( col ) }
			onKeyDown={ onKeyActivate( () => toggleSort( col ) ) }
			tabIndex={ 0 }
			aria-sort={ ariaSortValue( sortBy === col, sortDir ) }
			style={ style }
		>
			{ children } { renderSortArrow( sortBy === col, sortDir ) }
		</th>
	);
	const {
		rows,
		load,
		loading,
		syncing,
		total,
		totalNet,
		reconciledNet,
		counts,
		syncLedger,
		saveField,
		toggleReconciled,
		toggleFiled,
		deleteDisbursement,
	} = useDisbursements( {
		page,
		sortBy,
		sortDir,
		refreshKey,
		perPage: PER_PAGE,
		status: filters.status,
		periodId: filters.periodId,
	} );
	const { fixOne, fixAll, keepOne } = useDisbursementFees( load );
	const save = async ( id, field, value ) => {
		await saveField( id, field, value );
		setEditing( null );
	};
	const pages = Math.max( 1, Math.ceil( total / PER_PAGE ) );

	const pendingCount = counts.total - counts.balanced;
	const filedCount = counts.filed;

	return (
		<>
			<div className="lsfh-toolbar">
				<div className="lsfh-toolbar-right">
					<ColumnsBtn
						columns={ DISB_COLUMNS }
						prefs={ dcols }
						tableId="donations_disbursements"
					/>
					<button
						className="btn btn-ghost btn-sm"
						onClick={ onShowSync }
					>
						<RefreshCw size={ 14 } /> Sync ActBlue
					</button>
					<button
						className="btn btn-ghost btn-sm"
						onClick={ onShowImport }
					>
						<FileUp size={ 14 } /> Import CSV
					</button>
					<button
						className="btn btn-ghost btn-sm"
						onClick={ syncLedger }
						disabled={ syncing }
					>
						<RefreshCw size={ 14 } />{ ' ' }
						{ syncing ? 'Syncing…' : 'Rebuild Ledger' }
					</button>
				</div>
			</div>

			<DisbursementsProgress
				counts={ counts }
				status={ filters.status }
				onStatus={ ( value ) => setFilter( 'status', value ) }
				periodId={ filters.periodId }
				onPeriod={ ( value ) => setFilter( 'periodId', value ) }
				periods={ periods }
				onFixFees={ fixAll }
			/>
			<div className="lsfh-box lsfh-box--table">
				<div
					className="lsfh-tscroll"
					style={ { '--lsfh-chrome': '130px' } }
					tabIndex={ 0 }
					role="region"
					aria-label="Disbursements table"
				>
					<table className="lsfh-table">
						<thead>
							<tr>
								<th>Disbursement ID</th>
								<SortTh col="disbursement_date">
									Disb. Date
								</SortTh>
								{ dcols.show( 'contribs' ) && (
									<SortTh col="live_count">Contribs.</SortTh>
								) }
								{ dcols.show( 'gross' ) && (
									<SortTh col="live_gross">Gross</SortTh>
								) }
								{ dcols.show( 'fees' ) && <th>Fees</th> }
								{ dcols.show( 'net' ) && (
									<SortTh col="live_net">Net</SortTh>
								) }
								{ dcols.show( 'status' ) && <th>Status</th> }
								{ dcols.show( 'election' ) && (
									<th>Election</th>
								) }
								{ dcols.show( 'period' ) && (
									<th>Filing Period</th>
								) }
								{ dcols.show( 'received' ) && (
									<SortTh col="date_received">
										Date Received
									</SortTh>
								) }
								{ dcols.show( 'bankref' ) && (
									<th>Bank Reference</th>
								) }
								{ dcols.show( 'notes' ) && <th>Notes</th> }
								{ dcols.show( 'reconciled' ) && (
									<SortTh
										col="reconciled"
										style={ { textAlign: 'center' } }
									>
										Balanced
									</SortTh>
								) }
								{ dcols.show( 'filed' ) && (
									<SortTh
										col="filed"
										style={ { textAlign: 'center' } }
									>
										Filed
									</SortTh>
								) }
								{ dcols.show( 'refunds' ) && (
									<th style={ { textAlign: 'center' } }>
										Refunds
									</th>
								) }
								<th></th>
							</tr>
						</thead>
						<tbody>
							{ loading && (
								<tr>
									<td colSpan={ 16 }>
										<div className="lsfh-loading">
											Loading…
										</div>
									</td>
								</tr>
							) }
							{ ! loading && rows.length === 0 && (
								<tr>
									<td colSpan={ 16 }>
										<div className="lsfh-empty">
											No disbursements yet. Import an
											ActBlue or Stripe CSV (or sync from
											ActBlue), then click{ ' ' }
											<strong>Rebuild Ledger</strong>.
										</div>
									</td>
								</tr>
							) }
							{ rows.map( ( row ) => (
								<DisbursementRow
									key={ row.id }
									row={ row }
									dcols={ dcols }
									periods={ periods }
									editing={ editing }
									setEditing={ setEditing }
									save={ save }
									onFixFee={ fixOne }
									onKeepFee={ keepOne }
									toggleReconciled={ toggleReconciled }
									toggleFiled={ toggleFiled }
									deleteDisbursement={ deleteDisbursement }
									onViewDisbursement={ onViewDisbursement }
									onViewAmendments={ onViewAmendments }
								/>
							) ) }
						</tbody>
					</table>
				</div>
			</div>
			<Pagination page={ page } pages={ pages } setPage={ setPage } />
			{ total > 0 && (
				<TableTotals
					count={ `${ total.toLocaleString() } disbursement${
						1 === total ? '' : 's'
					}` }
					stats={ [
						{
							label: 'Unbalanced',
							value: pendingCount,
							tone: pendingCount > 0 ? 'warn' : 'positive',
						},
						{ label: 'Filed', value: filedCount },
						{ label: 'Balanced', value: fmtC( reconciledNet ) },
						{ label: 'Total net', value: fmtC( totalNet ) },
					] }
				/>
			) }
			<p className="page-desc" style={ { marginTop: 12 } }>
				Each row is one disbursement (check or ACH). The{ ' ' }
				<strong>Net (Bank Deposit)</strong> should match your bank
				statement exactly. Click the Balanced circle when the bank
				deposit has been confirmed, and the Filed circle once the payout
				has gone to the state. Date Received and Bank Reference are
				editable inline.
			</p>
		</>
	);
}
