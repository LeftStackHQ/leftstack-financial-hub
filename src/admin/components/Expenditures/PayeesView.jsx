import { useState, useCallback, useEffect } from '@wordpress/element';
import {
	onKeyActivate,
	ariaSortValue,
	apiGet,
	fmtC,
	Pagination,
	TableTotals,
} from '../shared';
import { Building2, Pencil, List } from 'lucide-react';
import { CatBadge } from './parts';
import { useListState } from '../../hooks/useListState';
import { EditPayeeModal } from './EditPayeeModal';
import { useLatestRequest } from '../../hooks/useLatestRequest';

/* ─────────────── Payees View ────────────────────────────── */
export function PayeesView( { onViewPayee } ) {
	const [ payees, setPayees ] = useState( [] );
	const [ loading, setLoading ] = useState( true );
	const { page, search, sortBy, sortDir, setPage, setSearch, toggleSort } =
		useListState( { sortBy: 'total_spent' } );
	const [ total, setTotal ] = useState( 0 );
	const [ editPayee, setEditPayee ] = useState( null );
	const PER_PAGE = 100;

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
	const pages = Math.max( 1, Math.ceil( total / PER_PAGE ) );

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
		apiGet( `/payees`, `${ params }` )
			.then( ( r ) => r.json() )
			.then( ( d ) => {
				if ( isStale() ) {
					return;
				}
				setPayees( Array.isArray( d.data ) ? d.data : [] );
				setTotal( d.total || 0 );
				setLoading( false );
			} )
			.catch( () => {
				if ( ! isStale() ) {
					setLoading( false );
				}
			} );
	}, [ begin, search, sortBy, sortDir, page ] );

	useEffect( () => {
		load();
	}, [ load ] );

	return (
		<>
			<div className="lsfh-toolbar">
				<input
					className="lsfh-input lsfh-input--search"
					placeholder="Search payees…"
					value={ search }
					onChange={ ( e ) => setSearch( e.target.value ) }
				/>
				{ search && (
					<button
						className="btn btn-ghost btn-sm lsfh-btn-muted"
						onClick={ () => setSearch( '' ) }
					>
						✕ Clear
					</button>
				) }
			</div>
			<div className="lsfh-box lsfh-box--table">
				<div
					className="lsfh-tscroll"
					tabIndex={ 0 }
					role="region"
					aria-label="Payees table"
				>
					<table className="lsfh-table">
						<thead>
							<tr>
								<SortTh col="payee_display">
									Payee / Organization
								</SortTh>
								<th>Categories</th>
								<SortTh col="payment_count"># Payments</SortTh>
								<SortTh col="last_payment">Last Payment</SortTh>
								<SortTh col="total_spent">Total Spent</SortTh>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{ loading && (
								<tr>
									<td colSpan={ 6 }>
										<div className="lsfh-loading">
											Loading…
										</div>
									</td>
								</tr>
							) }
							{ ! loading && payees.length === 0 && (
								<tr>
									<td colSpan={ 6 }>
										<div className="lsfh-empty">
											No payees found.
										</div>
									</td>
								</tr>
							) }
							{ payees.map( ( p, i ) => (
								<tr
									key={ i }
									className="lsfh-tr-pointer"
									onClick={ () => onViewPayee?.( p ) }
								>
									<td>
										<div className="lsfh-name-cell">
											<div className="lsfh-avatar lsfh-avatar--icon">
												<Building2 size={ 14 } />
											</div>
											<div>
												<div className="lsfh-name-main">
													{ p.payee_display }
												</div>
												{ p.address && (
													<div className="lsfh-name-sub">
														{ p.address }
													</div>
												) }
											</div>
										</div>
									</td>
									<td>
										<div className="lsfh-badge-list">
											{ ( p.categories || [] ).map(
												( cat ) => (
													<CatBadge
														key={ cat }
														name={ cat }
													/>
												)
											) }
										</div>
									</td>
									<td className="lsfh-bold lsfh-ink">
										{ p.payment_count }
									</td>
									<td className="lsfh-meta-sm">
										{ p.last_payment || '—' }
									</td>
									<td className="lsfh-bold lsfh-amount negative">
										{ fmtC( p.total_spent ) }
									</td>
									<td
										onClick={ ( e ) => e.stopPropagation() }
									>
										<div className="td-actions">
											<button
												className="lsfh-icon-btn"
												title="Edit payee"
												onClick={ () =>
													setEditPayee( p )
												}
											>
												<Pencil size={ 14 } />
											</button>
											<button
												className="btn btn-ghost btn-sm"
												onClick={ () =>
													onViewPayee?.( p )
												}
												title="View transactions"
											>
												<List size={ 12 } />{ ' ' }
												Transactions
											</button>
										</div>
									</td>
								</tr>
							) ) }
						</tbody>
					</table>
				</div>
			</div>
			<Pagination page={ page } pages={ pages } setPage={ setPage } />
			{ ! loading && total > 0 && (
				<TableTotals
					count={ `${ total.toLocaleString() } payee${
						1 === total ? '' : 's'
					}` }
				/>
			) }
			{ editPayee && (
				<EditPayeeModal
					payee={ editPayee }
					onClose={ () => setEditPayee( null ) }
					onSaved={ load }
				/>
			) }
		</>
	);
}
