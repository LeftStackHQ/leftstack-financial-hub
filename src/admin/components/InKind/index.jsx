import { useState, useEffect, useCallback } from '@wordpress/element';
import {
	onKeyActivate,
	ariaSortValue,
	apiGet,
	confirmAction,
	apiSend,
	saveFile,
	ColumnsBtn,
	FilterChips,
	fmtC,
	Pagination,
	TableTotals,
} from '../shared';
import { useColumnPrefs } from '../../hooks/useColumnPrefs';
import { FileUp, Download, Pencil, Trash2 } from 'lucide-react';
import { InKindModal } from './InKindModal';
import { CsvImportModal } from '../CsvImportModal';
import { INKIND_IMPORT } from './importConfig';
import { InKindDetailPanel } from './InKindDetailPanel';
import { useListState } from '../../hooks/useListState';
import { useLatestRequest } from '../../hooks/useLatestRequest';

/** Columns of the In-Kind table. Checkbox and Donor are the frozen pair. */
const INKIND_COLUMNS = [
	{ key: 'check', label: 'Select', locked: true },
	{ key: 'donor', label: 'Donor', locked: true },
	{ key: 'address', label: 'Address' },
	{ key: 'description', label: 'Description' },
	{ key: 'fmv', label: 'FMV' },
	{ key: 'date', label: 'Date' },
	{ key: 'fec', label: 'FEC Report Date' },
	{ key: 'notes', label: 'Notes' },
];

export default function InKind() {
	const [ items, setItems ] = useState( [] );
	const [ total, setTotal ] = useState( 0 );
	const kcols = useColumnPrefs( 'inkind', INKIND_COLUMNS );
	const PER_PAGE = 50;
	const [ loading, setLoading ] = useState( true );
	const [ periods, setPeriods ] = useState( [] );
	const [ modal, setModal ] = useState( null );
	const [ editItem, setEditItem ] = useState( null );
	const [ selectedItem, setSelItem ] = useState( null );
	const [ totalVal, setTotalVal ] = useState( 0 );
	const [ checked, setChecked ] = useState( new Set() );
	const [ showImport, setShowImport ] = useState( false );
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
		sortBy: 'donation_date',
		newColumnDir: 'asc',
		filters: { fPeriod: '' },
	} );
	const { fPeriod } = filters;
	const SortTh = ( { col, children } ) => {
		let sortIndicator = <span className="lsfh-sort-icon">↕</span>;
		if ( sortBy === col ) {
			sortIndicator = sortDir === 'asc' ? '↑' : '↓';
		}
		return (
			<th
				className="lsfh-th-sort"
				onClick={ () => toggleSort( col ) }
				onKeyDown={ onKeyActivate( () => toggleSort( col ) ) }
				tabIndex={ 0 }
				aria-sort={ ariaSortValue( sortBy === col, sortDir ) }
			>
				{ children } { sortIndicator }
			</th>
		);
	};

	useEffect( () => {
		// Filing periods drive the toolbar filter as well as the add/edit
		// modal, the import modal and the detail drawer. Only the DATE range
		// filter was dropped — in-kind records are rare enough that search
		// plus a period filter covers how the page is actually used.
		apiGet( `/filing-periods` )
			.then( ( r ) => r.json() )
			.then( ( d ) => setPeriods( Array.isArray( d ) ? d : [] ) )
			.catch( () => {} );
	}, [] );

	const begin = useLatestRequest();
	const load = useCallback( () => {
		const isStale = begin();
		setLoading( true );
		const params = new URLSearchParams( {
			per_page: PER_PAGE,
			page,
			orderby: sortBy,
			order: sortDir.toUpperCase(),
			_t: Date.now(),
		} );
		if ( search ) {
			params.set( 'search', search );
		}
		if ( fPeriod ) {
			params.set( 'filing_period_id', fPeriod );
		}
		apiGet( `/inkind`, `${ params }` )
			.then( ( r ) => r.json() )
			.then( ( d ) => {
				if ( isStale() ) {
					return;
				}
				const rows = d.data || [];
				setItems( rows );
				setTotal( d.total || 0 );
				setTotalVal( parseFloat( d.total_value ) || 0 );
				setChecked( new Set() );
				setLoading( false );
			} )
			.catch( () => {
				if ( ! isStale() ) {
					setLoading( false );
				}
			} );
	}, [ begin, page, search, fPeriod, sortBy, sortDir ] );

	useEffect( () => {
		load();
	}, [ load ] );

	useEffect( () => {
		const h = () => setModal( 'add' );
		document.addEventListener( 'lsfh:add', h );
		return () => document.removeEventListener( 'lsfh:add', h );
	}, [] );

	const onSaved = ( d, isEdit ) => {
		if ( isEdit ) {
			setItems( ( prev ) =>
				prev.map( ( x ) => ( x.id === d.id ? d : x ) )
			);
		} else {
			load();
		}
		setModal( null );
	};

	const del = async ( id ) => {
		const ok = await confirmAction( 'Delete this in-kind donation?' );
		if ( ! ok ) {
			return;
		}
		await apiSend( 'DELETE', `/inkind/${ id }` );
		setItems( ( prev ) => prev.filter( ( x ) => x.id !== id ) );
		setTotal( ( t ) => t - 1 );
		if ( selectedItem?.id === id ) {
			setSelItem( null );
		}
		window.lsfhToast( 'In-kind deleted.' );
	};

	const toggleCheck = ( id, e ) => {
		e.stopPropagation();
		setChecked( ( prev ) => {
			const n = new Set( prev );
			if ( n.has( id ) ) {
				n.delete( id );
			} else {
				n.add( id );
			}
			return n;
		} );
	};
	const allChecked =
		items.length > 0 && items.every( ( x ) => checked.has( x.id ) );
	const someChecked = items.some( ( x ) => checked.has( x.id ) );
	const toggleAll = () =>
		setChecked(
			allChecked ? new Set() : new Set( items.map( ( x ) => x.id ) )
		);

	const bulkDelete = async () => {
		if ( ! checked.size ) {
			return;
		}
		const ok = await confirmAction(
			`Delete ${ checked.size } in-kind donation${
				checked.size > 1 ? 's' : ''
			}? This cannot be undone.`
		);
		if ( ! ok ) {
			return;
		}
		await apiSend( 'POST', `/inkind/bulk-delete`, { ids: [ ...checked ] } );
		window.lsfhToast(
			`Deleted ${ checked.size } in-kind donation${
				checked.size > 1 ? 's' : ''
			}.`
		);
		load();
	};

	const exportCSV = async () => {
		const r = await apiGet( `/export/inkind` );
		saveFile( await r.blob(), 'inkind.csv' );
	};

	const pages = Math.max( 1, Math.ceil( total / PER_PAGE ) );

	return (
		<>
			<p className="page-desc">
				Non-cash contributions — goods or services donated to the
				campaign. Tracked separately for FEC/state reporting.
			</p>

			<div className="lsfh-toolbar lsfh-toolbar--rows">
				<div className="lsfh-toolbar-row">
					<input
						className="lsfh-input lsfh-input--search"
						placeholder="Search donor or amount…"
						value={ search }
						onChange={ ( e ) => setSearch( e.target.value ) }
					/>
					<div className="lsfh-toolbar-right">
						<ColumnsBtn
							columns={ INKIND_COLUMNS }
							prefs={ kcols }
							tableId="inkind"
						/>
						<button
							className="btn btn-ghost btn-sm"
							onClick={ () => setShowImport( true ) }
						>
							<FileUp size={ 14 } /> Import
						</button>
						<button
							className="btn btn-ghost btn-sm"
							onClick={ exportCSV }
						>
							<Download size={ 14 } /> Export{ ' ' }
							{ total > 0 ? total : '' }
						</button>
					</div>
				</div>
				<div className="lsfh-toolbar-row">
					<select
						className="lsfh-input"
						value={ fPeriod }
						onChange={ ( e ) =>
							setFilter( 'fPeriod', e.target.value )
						}
					>
						<option value="">All Periods</option>
						{ periods.map( ( p ) => (
							<option key={ p.id } value={ p.id }>
								{ p.name }
							</option>
						) ) }
					</select>
				</div>
			</div>
			<FilterChips
				onClearAll={ () => {
					setSearch( '' );
					setFilters( { fPeriod: '' } );
				} }
				chips={ [
					{
						key: 'search',
						label: search && `Search: ${ search }`,
						onRemove: () => setSearch( '' ),
					},
					{
						key: 'period',
						label:
							fPeriod &&
							`Period: ${
								periods.find(
									( p ) =>
										String( p.id ) === String( fPeriod )
								)?.name || fPeriod
							}`,
						onRemove: () => setFilter( 'fPeriod', '' ),
					},
				] }
			/>

			{ someChecked && (
				<div className="lsfh-bulk-bar">
					<span className="lsfh-bulk-count">
						{ checked.size } selected
					</span>
					<button
						className="btn btn-sm btn-danger"
						onClick={ bulkDelete }
					>
						Delete { checked.size }
					</button>
					<button
						className="btn btn-ghost btn-sm"
						onClick={ () => setChecked( new Set() ) }
					>
						Clear
					</button>
				</div>
			) }

			<div className="lsfh-box lsfh-box--table">
				<div
					className="lsfh-tscroll lsfh-tscroll--frz2"
					tabIndex={ 0 }
					role="region"
					aria-label="In-kind contributions table"
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
													someChecked && ! allChecked;
											}
										} }
										onChange={ toggleAll }
									/>
								</th>
								<SortTh col="donor_name">Donor</SortTh>
								{ kcols.show( 'address' ) && <th>Address</th> }
								{ kcols.show( 'description' ) && (
									<th>Description</th>
								) }
								{ kcols.show( 'fmv' ) && (
									<SortTh col="value">FMV</SortTh>
								) }
								{ kcols.show( 'date' ) && (
									<SortTh col="donation_date">Date</SortTh>
								) }
								{ kcols.show( 'fec' ) && (
									<SortTh col="fec_report_date">
										FEC Report Date
									</SortTh>
								) }
								{ kcols.show( 'notes' ) && <th>Notes</th> }
								<th></th>
							</tr>
						</thead>
						<tbody>
							{ loading && (
								<tr>
									<td colSpan={ 9 }>
										<div className="lsfh-loading">
											Loading…
										</div>
									</td>
								</tr>
							) }
							{ ! loading && items.length === 0 && (
								<tr>
									<td colSpan={ 9 }>
										<div className="lsfh-empty">
											No in-kind donations yet. Click +
											Add In-Kind to get started.
										</div>
									</td>
								</tr>
							) }
							{ items.map( ( item ) => (
								<tr
									key={ item.id }
									className={ `${
										selectedItem?.id === item.id
											? 'lsfh-row-active'
											: ''
									}${
										checked.has( item.id )
											? ' lsfh-row-checked'
											: ''
									}` }
									onClick={ ( ev ) => {
										if (
											! ev.target.closest(
												'button,a,input'
											)
										) {
											setSelItem( item );
										}
									} }
								>
									<td
										className="lsfh-td-check"
										onClick={ ( ev ) =>
											ev.stopPropagation()
										}
									>
										<input
											type="checkbox"
											checked={ checked.has( item.id ) }
											onChange={ ( ev ) =>
												toggleCheck( item.id, ev )
											}
										/>
									</td>
									<td>
										<div className="lsfh-name-main">
											{ item.donor_name }
										</div>
										{ item.occupation && (
											<div className="lsfh-name-sub">
												{ item.occupation }
											</div>
										) }
										{ item.employer && (
											<div className="lsfh-name-sub">
												{ item.employer }
											</div>
										) }
									</td>
									{ kcols.show( 'address' ) && (
										<td className="lsfh-meta-sm">
											{ item.address || '—' }
										</td>
									) }
									{ kcols.show( 'description' ) && (
										<td
											style={ {
												maxWidth: 180,
												fontSize: 'var(--fs-cmp)',
											} }
										>
											{ item.description || '—' }
										</td>
									) }
									{ kcols.show( 'fmv' ) && (
										<td className="lsfh-amount positive">
											{ fmtC( item.value ) }
										</td>
									) }
									{ kcols.show( 'date' ) && (
										<td className="lsfh-meta-sm">
											{ item.donation_date || '—' }
										</td>
									) }
									{ kcols.show( 'fec' ) && (
										<td className="lsfh-meta-sm">
											{ item.fec_report_date || '—' }
										</td>
									) }
									{ kcols.show( 'notes' ) && (
										<td
											style={ {
												fontSize: 'var(--fs-cmp)',
												color: 'var(--muted)',
												maxWidth: 150,
											} }
										>
											{ item.notes || '—' }
										</td>
									) }
									<td>
										<div className="td-actions">
											<button
												className="lsfh-icon-btn"
												title="Edit in-kind contribution"
												aria-label={ `Edit in-kind contribution from ${
													item.donor_name || 'donor'
												}` }
												onClick={ () => {
													setEditItem( item );
													setModal( 'edit' );
												} }
											>
												<Pencil size={ 14 } />
											</button>
											<button
												className="lsfh-icon-btn lsfh-icon-btn-danger"
												title="Delete in-kind contribution"
												aria-label={ `Delete in-kind contribution from ${
													item.donor_name || 'donor'
												}` }
												onClick={ () => del( item.id ) }
											>
												<Trash2 size={ 14 } />
											</button>
										</div>
									</td>
								</tr>
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
					count={ `${ total.toLocaleString() } contribution${
						1 === total ? '' : 's'
					}` }
					stats={ [
						{
							label: 'Total value',
							value: fmtC( totalVal ),
							tone: 'positive',
						},
					] }
				/>
			) }
			{ ( modal === 'add' || modal === 'edit' ) && (
				<InKindModal
					item={ modal === 'edit' ? editItem : null }
					periods={ periods }
					onClose={ () => {
						setModal( null );
						setEditItem( null );
					} }
					onSaved={ onSaved }
				/>
			) }

			{ showImport && (
				<CsvImportModal
					config={ INKIND_IMPORT }
					periods={ periods }
					onClose={ () => setShowImport( false ) }
					onDone={ load }
				/>
			) }

			{ selectedItem && (
				<InKindDetailPanel
					item={ selectedItem }
					periods={ periods }
					onClose={ () => setSelItem( null ) }
					onEdit={ ( d ) => {
						setEditItem( d );
						setModal( 'edit' );
						setSelItem( null );
					} }
					onDelete={ ( id ) => {
						del( id );
						setSelItem( null );
					} }
				/>
			) }
		</>
	);
}
