import { useState, useEffect } from '@wordpress/element';
import { apiGet, onKeyActivate, ariaSortValue, Pagination } from '../shared';
import { useColumnPrefs } from '../../hooks/useColumnPrefs';

import { NO_DATE, NO_FILTERS, TX_COLUMNS } from './constants';
import { DonorsView } from './DonorsView';
import { DisbursementsView } from './DisbursementsView';
import { FilingCheckView } from './FilingCheckView';

import { DonationModal } from './DonationModal';
import { SyncModal } from './SyncModal';
import { ImportModal } from './ImportModal';
import { AllocateModal } from './AllocateModal';
import { DetailPanel } from './DetailPanel';
import { StateExportModal } from './StateExportModal';
import { SplitModal } from './SplitModal';
import { DonationRow } from './DonationRow';
import { DonationDisbursementChips } from './DonationDisbursementChips';
import { DonationsBulkBar } from './DonationsBulkBar';
import { DonationsToolbar } from './DonationsToolbar';
import { useRowSelection } from '../../hooks/useRowSelection';
import { useDonationsList } from '../../hooks/useDonationsList';
import { useUrlTab } from '../../hooks/useUrlTab';
import { DonationsTabs } from './DonationsTabs';
import { DonationsTotals } from './DonationsTotals';
import { useDonationActions } from '../../hooks/useDonationActions';
import { useListState } from '../../hooks/useListState';

const sortIconText = ( isActive, dir ) => {
	if ( ! isActive ) {
		return ' ↕';
	}
	return dir === 'asc' ? ' ↑' : ' ↓';
};

/* ─────────────── Main Donations Page ─────────────────────── */

export default function Donations() {
	// ── URL-synced tab navigation ─────────────────────────────
	// Reading from and writing to ?tab= keeps the active sub-tab
	// alive across page refreshes and wires up the browser back/forward buttons.
	const [ tab, setTab ] = useUrlTab();

	const cols = useColumnPrefs( 'donations_transactions', TX_COLUMNS );
	const PER_PAGE = 50;
	const [ modal, setModal ] = useState( null ); // null | 'add' | 'edit' | 'refund' | 'sync'
	const [ editDon, setEditDon ] = useState( null );
	const [ refundOf, setRefundOf ] = useState( null );
	const [ periods, setPeriods ] = useState( [] );

	// Seed filters from URL params (e.g. dashboard "Pending Filing" link)
	const _qs = new URLSearchParams( window.location.search );

	const [ pageOptions, setPageOptions ] = useState( [] );
	const [ months, setMonths ] = useState( [] );

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
		sortBy: 'contribution_date',
		search: _qs.get( 'donor_search' ) || '',
		filters: {
			...NO_FILTERS,
			fStatus: _qs.get( 'reporting_status' ) || '',
		},
	} );
	const {
		fElec,
		fReport,
		fStatus,
		fSource,
		fPeriod,
		fState,
		fCity,
		fZip,
		fAmountMin,
		fAmountMax,
		fDateFrom,
		fDateTo,
		fPage,
		fDisbId,
		fHasRefund,
	} = filters;

	const {
		donations,
		setDon,
		total,
		setTotal,
		totalContributions,
		totalGross,
		totalNet,
		totalFees,
		loading,
		load,
		buildFilterParams,
	} = useDonationsList( {
		search,
		filters,
		page,
		sortBy,
		sortDir,
		perPage: PER_PAGE,
	} );
	const {
		selected,
		setSelected: setSel,
		toggleOne,
		toggleAll,
	} = useRowSelection();

	// Unitemized allocation
	const [ showAllocate, setShowAllocate ] = useState( false );

	// Bumped whenever a sync/import may have changed disbursement rows, so the
	// Disbursements tab (which keeps its own list state) knows to refetch even
	// though it stays mounted while its sync/import modals are open.
	const [ disbRefresh, setDisbRefresh ] = useState( 0 );

	// Detail drawer
	const [ selectedDon, setSelectedDon ] = useState( null );
	const [ splitDon, setSplitDon ] = useState( null );

	useEffect( () => {
		apiGet( `/filing-periods` )
			.then( ( r ) => r.json() )
			.then( ( d ) => setPeriods( Array.isArray( d ) ? d : [] ) )
			.catch( () => {} );
		apiGet( `/donations/fundraising-pages` )
			.then( ( r ) => r.json() )
			.then( ( d ) => setPageOptions( Array.isArray( d ) ? d : [] ) )
			.catch( () => {} );
		apiGet( `/months` )
			.then( ( r ) => r.json() )
			.then( ( d ) =>
				setMonths( Array.isArray( d.donations ) ? d.donations : [] )
			)
			.catch( () => {} );
	}, [] );

	// Listen for header Add button
	useEffect( () => {
		const h = () => setModal( 'add' );
		document.addEventListener( 'lsfh:add', h );
		return () => document.removeEventListener( 'lsfh:add', h );
	}, [] );

	const { selectingAll, selectAllMatching, deleteDon, bulk, exportAll } =
		useDonationActions( {
			buildFilterParams,
			selected,
			setSel,
			load,
			setDon,
			setTotal,
			selectedDon,
			setSelectedDon,
		} );

	const onSaved = ( d, isEdit ) => {
		if ( isEdit ) {
			setDon( ( prev ) =>
				prev.map( ( x ) => ( x.id === d.id ? d : x ) )
			);
		} else {
			load();
		}
		setModal( null );
	};

	// Build a Set of donation IDs that already have a refund on this page — used to hide the ↩ button.
	const refundedIds = new Set(
		donations
			.filter( ( d ) => d.refund_of_id )
			.map( ( d ) => Number( d.refund_of_id ) )
	);

	const hasFilters =
		search ||
		fElec ||
		fReport ||
		fStatus ||
		fSource ||
		fPeriod ||
		fState ||
		fCity ||
		fZip ||
		fAmountMin ||
		fAmountMax ||
		fDateFrom ||
		fDateTo ||
		fDisbId ||
		fHasRefund ||
		fPage;
	const clearFilters = () => {
		setSearch( '' );
		setFilters( NO_FILTERS );
	};
	const clearDate = () => setFilters( NO_DATE );
	const applyDate = ( from, to, lbl ) =>
		setFilters( { fDateFrom: from, fDateTo: to, fDateLabel: lbl } );
	// The More panel calls the election field fElection; the state it sets is fElec.
	const handleMore = ( key, val ) => {
		setFilter( key === 'fElection' ? 'fElec' : key, val );
	};

	const SortTh = ( { col, children, style } ) => (
		<th
			className="lsfh-th-sort"
			style={ style }
			onClick={ () => toggleSort( col ) }
			onKeyDown={ onKeyActivate( () => toggleSort( col ) ) }
			tabIndex={ 0 }
			aria-sort={ ariaSortValue( sortBy === col, sortDir ) }
		>
			{ children }
			<span
				className={ `lsfh-sort-icon${ sortBy === col ? ' on' : '' }` }
			>
				{ sortIconText( sortBy === col, sortDir ) }
			</span>
		</th>
	);

	const [ showStateExport, setShowStateExport ] = useState( false );
	const filingState = window.LSFH?.filingState || '';

	const pages = Math.max( 1, Math.ceil( total / PER_PAGE ) );

	return (
		<>
			<DonationsTabs setTab={ setTab } tab={ tab } total={ total } />

			{ tab === 'donors' && (
				<DonorsView
					pageOptions={ pageOptions }
					onViewDonor={ ( donor ) => {
						setSearch(
							`${ donor.first_name } ${ donor.last_name }`
						);
						setFilter( 'fDisbId', '' );
						setTab( 'transactions' );
					} }
				/>
			) }
			{ tab === 'disbursements' && (
				<DisbursementsView
					onShowSync={ () => setModal( 'sync' ) }
					onShowImport={ () => setModal( 'import' ) }
					refreshKey={ disbRefresh }
					onViewDisbursement={ ( disbId ) => {
						setSearch( '' );
						setFilters( {
							...NO_FILTERS,
							fDisbId: disbId,
							fHasRefund: false,
						} );
						setTab( 'transactions' );
					} }
					onViewAmendments={ ( disbId ) => {
						setSearch( '' );
						setFilters( {
							...NO_FILTERS,
							fDisbId: disbId,
							fHasRefund: true,
						} );
						setTab( 'transactions' );
					} }
					periods={ periods }
				/>
			) }

			{ tab === 'filing-check' && (
				<FilingCheckView periods={ periods } />
			) }

			{ tab === 'transactions' && (
				<>
					<DonationsToolbar
						applyDate={ applyDate }
						clearDate={ clearDate }
						clearFilters={ clearFilters }
						cols={ cols }
						exportAll={ exportAll }
						filters={ filters }
						filingState={ filingState }
						handleMore={ handleMore }
						hasFilters={ hasFilters }
						months={ months }
						pageOptions={ pageOptions }
						periods={ periods }
						search={ search }
						setFilter={ setFilter }
						setSearch={ setSearch }
						setShowAllocate={ setShowAllocate }
						setShowStateExport={ setShowStateExport }
					/>

					<DonationDisbursementChips
						fDisbId={ fDisbId }
						fHasRefund={ fHasRefund }
						setFilter={ setFilter }
						setFilters={ setFilters }
					/>

					<DonationsBulkBar
						bulk={ bulk }
						donations={ donations }
						selectAllMatching={ selectAllMatching }
						selected={ selected }
						selectingAll={ selectingAll }
						setSel={ setSel }
						total={ total }
					/>

					<div className="lsfh-box lsfh-box--table">
						<div
							className="lsfh-tscroll lsfh-tscroll--frz2"
							tabIndex={ 0 }
							role="region"
							aria-label="Contributions table"
						>
							<table className="lsfh-table">
								<thead>
									<tr>
										<th className="lsfh-th-check">
											<input
												type="checkbox"
												checked={
													donations.length > 0 &&
													donations.every( ( d ) =>
														selected.has( d.id )
													)
												}
												onChange={ () =>
													toggleAll( donations )
												}
											/>
										</th>
										<SortTh col="last_name">Donor</SortTh>
										{ cols.show( 'source' ) && (
											<SortTh col="source">Source</SortTh>
										) }
										{ cols.show( 'gross' ) && (
											<SortTh col="gross_amount">
												Gross
											</SortTh>
										) }
										{ cols.show( 'fee' ) && <th>Fee</th> }
										{ cols.show( 'net' ) && (
											<SortTh col="net_amount">
												Net
											</SortTh>
										) }
										{ cols.show( 'election' ) && (
											<SortTh col="election_type">
												Election
											</SortTh>
										) }
										{ cols.show( 'type' ) && <th>Type</th> }
										{ cols.show( 'status' ) && (
											<SortTh col="reporting_status">
												Status
											</SortTh>
										) }
										{ cols.show( 'date' ) && (
											<SortTh col="contribution_date">
												Date
											</SortTh>
										) }
										{ cols.show( 'balanced' ) && (
											<th>Balanced</th>
										) }
										<th></th>
									</tr>
								</thead>
								<tbody>
									{ loading && (
										<tr>
											<td colSpan={ 12 }>
												<div className="lsfh-loading">
													Loading…
												</div>
											</td>
										</tr>
									) }
									{ ! loading && donations.length === 0 && (
										<tr>
											<td colSpan={ 12 }>
												<div className="lsfh-empty">
													{ hasFilters
														? 'No donations match your filters.'
														: 'No donations yet. Choose + Add Donation to enter one.' }
												</div>
											</td>
										</tr>
									) }
									{ donations.map( ( d ) => (
										<DonationRow
											key={ d.id }
											cols={ cols }
											d={ d }
											deleteDon={ deleteDon }
											refundedIds={ refundedIds }
											selected={ selected }
											selectedDon={ selectedDon }
											setEditDon={ setEditDon }
											setModal={ setModal }
											setRefundOf={ setRefundOf }
											setSelectedDon={ setSelectedDon }
											toggleOne={ toggleOne }
										/>
									) ) }
								</tbody>
							</table>
						</div>
					</div>

					{ /* Pagination */ }
					<Pagination
						page={ page }
						pages={ pages }
						setPage={ setPage }
						titled
					/>
					<DonationsTotals
						total={ total }
						totalContributions={ totalContributions }
						totalFees={ totalFees }
						totalGross={ totalGross }
						totalNet={ totalNet }
					/>
				</>
			) }

			{ /* Modals */ }
			{ ( modal === 'add' || modal === 'edit' || modal === 'refund' ) && (
				<DonationModal
					donation={ modal === 'edit' ? editDon : null }
					initData={ modal === 'refund' ? refundOf : null }
					periods={ periods }
					onClose={ () => {
						setModal( null );
						setEditDon( null );
						setRefundOf( null );
					} }
					onSaved={ onSaved }
				/>
			) }
			{ modal === 'sync' && (
				<SyncModal
					onClose={ () => setModal( null ) }
					onDone={ () => {
						load();
						setDisbRefresh( ( n ) => n + 1 );
					} }
				/>
			) }
			{ modal === 'import' && (
				<ImportModal
					onClose={ () => setModal( null ) }
					onDone={ () => {
						load();
						setDisbRefresh( ( n ) => n + 1 );
					} }
				/>
			) }
			{ showAllocate && fPeriod && (
				<AllocateModal
					periodId={ parseInt( fPeriod ) }
					periodName={
						periods.find(
							( p ) => String( p.id ) === String( fPeriod )
						)?.name || 'Selected Period'
					}
					onClose={ () => setShowAllocate( false ) }
					onDone={ () => {
						setShowAllocate( false );
						load();
					} }
				/>
			) }

			{ selectedDon && (
				<DetailPanel
					donation={ selectedDon }
					periods={ periods }
					onClose={ () => setSelectedDon( null ) }
					onEdit={ ( d ) => {
						setEditDon( d );
						setModal( 'edit' );
						setSelectedDon( null );
					} }
					onDelete={ ( id ) => {
						deleteDon( id );
						setSelectedDon( null );
					} }
					onShowSplit={ ( d ) => {
						setSplitDon( d );
						setSelectedDon( null );
					} }
				/>
			) }
			{ showStateExport && (
				<StateExportModal
					onClose={ () => setShowStateExport( false ) }
					filters={ {
						search,
						fElec,
						fReport,
						fStatus,
						fSource,
						fPeriod,
						fState,
						fCity,
						fZip,
						fAmountMin,
						fAmountMax,
						fDateFrom,
						fDateTo,
						fDisbId,
						fHasRefund,
						fPage,
					} }
				/>
			) }
			{ splitDon && (
				<SplitModal
					donation={ splitDon }
					onClose={ () => setSplitDon( null ) }
					onSplit={ ( primary, general ) => {
						setDon( ( prev ) => {
							const idx = prev.findIndex(
								( x ) => x.id === primary.id
							);
							if ( idx === -1 ) {
								return [ ...prev, primary, general ];
							}
							const next = [ ...prev ];
							next.splice( idx, 1, primary, general );
							return next;
						} );
						setTotal( ( t ) => t + 1 );
						setSplitDon( null );
					} }
				/>
			) }
		</>
	);
}
