import { useState, useEffect } from '@wordpress/element';
import {
	onKeyActivate,
	ariaSortValue,
	apiGet,
	confirmAction,
	apiSend,
	saveFile,
	monthRange,
	monthLabel,
	fmtC,
	Pagination,
	TableTotals,
} from '../shared';
import { useColumnPrefs } from '../../hooks/useColumnPrefs';
import { List, Building2, BarChart2, Scale } from 'lucide-react';
import { PayeesView } from './PayeesView';
import { BudgetView } from './BudgetView';
import { VendorsView } from './VendorsView';
import { buildExpenditureFilterParams } from './helpers';
import { EXP_TX_COLUMNS, NO_FILTERS } from './constants';

import { ExpenseModal } from './ExpenseModal';
import { CsvImportModal } from '../CsvImportModal';
import { EXPENDITURE_IMPORT } from './importConfig';
import { ExpenseDetailPanel } from './ExpenseDetailPanel';
import { useUrlTab } from '../../hooks/useUrlTab';
import { ExpenseRow } from './ExpenseRow';
import { ExpensesBulkBar } from './ExpensesBulkBar';
import { ExpensesToolbar } from './ExpensesToolbar';
import { useRowSelection } from '../../hooks/useRowSelection';
import { useExpensesList } from '../../hooks/useExpensesList';
import { useBulkExpenseEdit } from '../../hooks/useBulkExpenseEdit';
import { useListState } from '../../hooks/useListState';

export default function Expenditures() {
	const xcols = useColumnPrefs( 'expenditures_transactions', EXP_TX_COLUMNS );
	const PER_PAGE = 50;
	const [ categories, setCats ] = useState( [] );
	const [ periods, setPeriods ] = useState( [] );
	const [ modal, setModal ] = useState( null );
	const [ editExp, setEditExp ] = useState( null );
	const [ selectedExp, setSelExp ] = useState( null );
	const [ showImport, setShowImport ] = useState( false );
	const [ tab, setTab ] = useUrlTab();

	const [ editing, setEditing ] = useState( null ); // { id } when Posted cell is open

	const {
		page,
		search,
		sortBy,
		sortDir,
		filters,
		setPage,
		setSearch,
		toggleSort,
		setFilter,
		setFilters,
	} = useListState( {
		sortBy: 'expense_date',
		newColumnDir: 'asc',
		filters: NO_FILTERS,
	} );
	const { fCat, fMethod, fStatus, fPeriod, fDateFrom, fDateTo } = filters;
	const {
		selected: checked,
		setSelected: setChecked,
		toggleOne,
		toggleAll,
		clear: clearChecked,
	} = useRowSelection();
	const { expenses, setExp, total, setTotal, totalAmt, loading, load } =
		useExpensesList( {
			search,
			filters,
			page,
			sortBy,
			sortDir,
			perPage: PER_PAGE,
			onLoaded: clearChecked,
		} );
	const {
		bulkCategory,
		setBulkCategory,
		bulkMethod,
		setBulkMethod,
		bulkBalanced,
		setBulkBalanced,
		clearBulkFields,
		bulkUpdating,
		bulkUpdate,
		bulkDelete,
	} = useBulkExpenseEdit( { checked, clear: clearChecked, load } );
	const SortTh = ( { col, children, className = '' } ) => {
		let sortIndicator = <span className="lsfh-sort-icon">↕</span>;
		if ( sortBy === col ) {
			sortIndicator = sortDir === 'asc' ? '↑' : '↓';
		}
		return (
			<th
				className={ `lsfh-th-sort ${ className }` }
				onClick={ () => toggleSort( col ) }
				onKeyDown={ onKeyActivate( () => toggleSort( col ) ) }
				tabIndex={ 0 }
				aria-sort={ ariaSortValue( sortBy === col, sortDir ) }
			>
				{ children } { sortIndicator }
			</th>
		);
	};

	const [ months, setMonths ] = useState( [] );

	const clearFilters = () => {
		setSearch( '' );
		setFilters( NO_FILTERS );
	};

	useEffect( () => {
		apiGet( `/categories` )
			.then( ( r ) => r.json() )
			.then( ( d ) => setCats( Array.isArray( d ) ? d : [] ) )
			.catch( () => {} );
		apiGet( `/filing-periods` )
			.then( ( r ) => r.json() )
			.then( ( d ) => setPeriods( Array.isArray( d ) ? d : [] ) )
			.catch( () => {} );
		apiGet( `/months` )
			.then( ( r ) => r.json() )
			.then( ( d ) =>
				setMonths(
					Array.isArray( d.expenditures ) ? d.expenditures : []
				)
			)
			.catch( () => {} );
	}, [] );

	useEffect( () => {
		const h = () => setModal( 'add' );
		document.addEventListener( 'lsfh:add', h );
		return () => document.removeEventListener( 'lsfh:add', h );
	}, [] );

	const onSaved = () => {
		load();
		setModal( null );
		setEditExp( null );
	};

	const del = async ( id ) => {
		const ok = await confirmAction( 'Delete this expense?' );
		if ( ! ok ) {
			return;
		}
		await apiSend( 'DELETE', `/expenditures/${ id }` );
		setExp( ( prev ) => prev.filter( ( e ) => e.id !== id ) );
		setTotal( ( t ) => t - 1 );
		if ( selectedExp?.id === id ) {
			setSelExp( null );
		}
		window.lsfhToast( 'Expense deleted.' );
	};

	const toggleCheck = ( id, e ) => {
		e.stopPropagation();
		toggleOne( id );
	};
	const allChecked =
		expenses.length > 0 && expenses.every( ( e ) => checked.has( e.id ) );
	const someChecked = expenses.some( ( e ) => checked.has( e.id ) );
	const toggleBalanced = async ( e ) => {
		const newVal = ! e.balanced;
		setExp( ( prev ) =>
			prev.map( ( r ) =>
				r.id === e.id ? { ...r, balanced: newVal } : r
			)
		);
		if ( selectedExp?.id === e.id ) {
			setSelExp( ( prev ) => ( { ...prev, balanced: newVal } ) );
		}
		await apiSend( 'PUT', `/expenditures/${ e.id }`, {
			...e,
			balanced: newVal,
		} );
		window.lsfhToast( newVal ? 'Marked balanced.' : 'Marked unbalanced.' );
	};

	const updatePosted = async ( e, newDate ) => {
		setExp( ( prev ) =>
			prev.map( ( r ) =>
				r.id === e.id ? { ...r, date_posted: newDate } : r
			)
		);
		if ( selectedExp?.id === e.id ) {
			setSelExp( ( prev ) => ( { ...prev, date_posted: newDate } ) );
		}
		const res = await apiSend( 'PUT', `/expenditures/${ e.id }`, {
			...e,
			date_posted: newDate,
		} );
		if ( ! res.ok ) {
			// The server refused (for example a scheduled payment). Show what is saved.
			load();
		}
	};

	const exportCSV = async () => {
		const params = buildExpenditureFilterParams( {
			search,
			fCat,
			fMethod,
			fStatus,
			fPeriod,
			fDateFrom,
			fDateTo,
		} );
		const r = await apiGet( `/export/expenditures`, `${ params }` );
		saveFile( await r.blob(), 'expenditures.csv' );
	};

	const pages = Math.max( 1, Math.ceil( total / PER_PAGE ) );

	return (
		<>
			{ /* Tabs */ }
			<div className="lsfh-tabs">
				<button
					className={ `lsfh-tab ${
						tab === 'transactions' ? 'active' : ''
					}` }
					onClick={ () => setTab( 'transactions' ) }
				>
					<List size={ 14 } /> Transactions{ ' ' }
					<span className="lsfh-tab-count">{ total }</span>
				</button>
				<button
					className={ `lsfh-tab ${
						tab === 'payees' ? 'active' : ''
					}` }
					onClick={ () => setTab( 'payees' ) }
				>
					<Building2 size={ 14 } /> Payees
				</button>
				<button
					className={ `lsfh-tab ${
						tab === 'budget' ? 'active' : ''
					}` }
					onClick={ () => setTab( 'budget' ) }
				>
					<BarChart2 size={ 14 } /> Budget
				</button>
				<button
					className={ `lsfh-tab ${
						tab === 'vendors' ? 'active' : ''
					}` }
					onClick={ () => setTab( 'vendors' ) }
				>
					<Scale size={ 14 } /> Vendors
				</button>
			</div>

			{ tab === 'vendors' && <VendorsView months={ months } /> }

			{ tab === 'payees' && (
				<PayeesView
					onViewPayee={ ( payee ) => {
						setSearch( payee.payee_display );
						setTab( 'transactions' );
					} }
				/>
			) }

			{ tab === 'budget' && (
				<BudgetView
					periods={ periods }
					months={ months }
					onCategoryClick={ ( catId, month ) => {
						if ( month ) {
							const { from, to } = monthRange( month );
							setFilters( {
								fCat: String( catId ),
								fDateFrom: from,
								fDateTo: to,
								fDateLabel: monthLabel( month ),
							} );
						} else {
							setFilters( {
								fCat: String( catId ),
								fDateFrom: '',
								fDateTo: '',
								fDateLabel: '',
							} );
						}
						setTab( 'transactions' );
					} }
				/>
			) }

			{ tab === 'transactions' && (
				<>
					<ExpensesToolbar
						categories={ categories }
						clearFilters={ clearFilters }
						exportCSV={ exportCSV }
						filters={ filters }
						months={ months }
						periods={ periods }
						search={ search }
						setFilter={ setFilter }
						setFilters={ setFilters }
						setSearch={ setSearch }
						setShowImport={ setShowImport }
						total={ total }
						xcols={ xcols }
					/>

					<ExpensesBulkBar
						bulkBalanced={ bulkBalanced }
						bulkCategory={ bulkCategory }
						bulkDelete={ bulkDelete }
						bulkMethod={ bulkMethod }
						bulkUpdate={ bulkUpdate }
						bulkUpdating={ bulkUpdating }
						categories={ categories }
						checked={ checked }
						clearBulkFields={ clearBulkFields }
						setBulkBalanced={ setBulkBalanced }
						setBulkCategory={ setBulkCategory }
						setBulkMethod={ setBulkMethod }
						setChecked={ setChecked }
						someChecked={ someChecked }
					/>

					<div className="lsfh-box lsfh-box--table">
						<div
							className="lsfh-tscroll lsfh-tscroll--frz2"
							tabIndex={ 0 }
							role="region"
							aria-label="Expenditure transactions table"
						>
							<table className="lsfh-table">
								<thead>
									<tr>
										<th className="lsfh-th-check">
											<input
												type="checkbox"
												checked={ allChecked }
												ref={ ( el ) => {
													if ( el ) {
														el.indeterminate =
															someChecked &&
															! allChecked;
													}
												} }
												onChange={ () =>
													toggleAll( expenses )
												}
											/>
										</th>
										<SortTh col="expense_date">Date</SortTh>
										<SortTh col="payee">Payee</SortTh>
										{ xcols.show( 'category' ) && (
											<SortTh col="category_name">
												Category
											</SortTh>
										) }
										{ xcols.show( 'description' ) && (
											<th>Description</th>
										) }
										{ xcols.show( 'payout' ) && (
											<th>Payout</th>
										) }
										{ xcols.show( 'method' ) && (
											<th>Method</th>
										) }
										{ xcols.show( 'receipt' ) && (
											<th>Receipt</th>
										) }
										{ xcols.show( 'amount' ) && (
											<SortTh col="amount">Amount</SortTh>
										) }
										{ xcols.show( 'status' ) && (
											<th>Status</th>
										) }
										{ xcols.show( 'posted' ) && (
											<th>Posted</th>
										) }
										{ xcols.show( 'balanced' ) && (
											<th>Balanced</th>
										) }
										<th></th>
									</tr>
								</thead>
								<tbody>
									{ loading && (
										<tr>
											<td colSpan={ 13 }>
												<div className="lsfh-loading">
													Loading…
												</div>
											</td>
										</tr>
									) }
									{ ! loading && expenses.length === 0 && (
										<tr>
											<td colSpan={ 13 }>
												<div className="lsfh-empty">
													No expenses yet. Click + Add
													Expense to get started.
												</div>
											</td>
										</tr>
									) }
									{ expenses.map( ( e ) => (
										<ExpenseRow
											key={ e.id }
											checked={ checked }
											del={ del }
											e={ e }
											editing={ editing }
											selectedExp={ selectedExp }
											setEditExp={ setEditExp }
											setEditing={ setEditing }
											setModal={ setModal }
											setSelExp={ setSelExp }
											toggleBalanced={ toggleBalanced }
											toggleCheck={ toggleCheck }
											updatePosted={ updatePosted }
											xcols={ xcols }
										/>
									) ) }
								</tbody>
							</table>
						</div>
					</div>

					<Pagination
						page={ page }
						pages={ pages }
						setPage={ setPage }
						titled
					/>
					{ total > 0 && (
						<TableTotals
							count={ `${ total.toLocaleString() } expenditure${
								1 === total ? '' : 's'
							}` }
							stats={ [
								{
									label: 'Total spent',
									value: fmtC( totalAmt ),
									tone: 'alert',
								},
							] }
						/>
					) }
				</>
			) }

			{ ( modal === 'add' || modal === 'edit' ) && (
				<ExpenseModal
					expense={ modal === 'edit' ? editExp : null }
					categories={ categories }
					periods={ periods }
					onClose={ () => {
						setModal( null );
						setEditExp( null );
					} }
					onSaved={ onSaved }
				/>
			) }

			{ showImport && (
				<CsvImportModal
					config={ EXPENDITURE_IMPORT }
					periods={ periods }
					onClose={ () => setShowImport( false ) }
					onDone={ load }
				/>
			) }

			{ selectedExp && (
				<ExpenseDetailPanel
					expense={ selectedExp }
					periods={ periods }
					onClose={ () => setSelExp( null ) }
					onEdit={ ( e ) => {
						setEditExp( e );
						setModal( 'edit' );
						setSelExp( null );
					} }
					onDelete={ ( id ) => {
						del( id );
						setSelExp( null );
					} }
				/>
			) }
		</>
	);
}
