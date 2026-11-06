import {
	fmtC,
	onKeyActivate,
	ariaSortValue,
	apiGet,
	ColumnsBtn,
	Pagination,
	TableTotals,
	limitStatus,
	limitsFromPage,
	donorCaps,
	orgTypeLabel,
} from '../shared';
import { useColumnPrefs } from '../../hooks/useColumnPrefs';
import { useState, useCallback, useEffect } from '@wordpress/element';
import { List } from 'lucide-react';
import { fundraisingLabel, renderSortArrow } from './helpers';
import { useListState } from '../../hooks/useListState';
import { useLatestRequest } from '../../hooks/useLatestRequest';

const LIMIT_BAR_FILL_CLASS = { near: ' near', maxed: ' maxed' };

const fmtPhone = ( raw ) => {
	if ( ! raw ) {
		return raw;
	}
	const d = raw.replace( /\D/g, '' );
	const n = d.length === 11 && d[ 0 ] === '1' ? d.slice( 1 ) : d;
	return n.length === 10
		? `(${ n.slice( 0, 3 ) }) ${ n.slice( 3, 6 ) }-${ n.slice( 6 ) }`
		: raw;
};

/* ─────────────── Donors Tab ─────────────────────────────── */
function LimitBar( { label, given, cap, nearPct } ) {
	const stat = limitStatus( given, cap, nearPct );
	if ( stat === 'none' ) {
		return null;
	}
	const barPct = Math.min( ( given / cap ) * 100, 100 );
	return (
		<div>
			<div className="lsfh-cc-limit-hdr">
				<span className="lsfh-cc-limit-label">{ label }</span>
				{ stat === 'maxed' ? (
					<span className="badge badge-xs badge-red">Maxed</span>
				) : (
					<span
						className={ `lsfh-cc-limit-val${
							stat === 'near' ? ' near' : ''
						}` }
					>
						{ fmtC( cap - given ) } left
					</span>
				) }
			</div>
			<div className="lsfh-cc-bar-track">
				<div
					className={ `lsfh-cc-bar-fill${
						LIMIT_BAR_FILL_CLASS[ stat ] || ''
					}` }
					style={ { width: `${ barPct }%` } }
				/>
			</div>
		</div>
	);
}

/** Columns of the Donations → Donors table. Donor is the frozen anchor. */
const DONOR_COLUMNS = [
	{ key: 'donor', label: 'Donor', locked: true },
	{ key: 'address', label: 'Address' },
	{ key: 'email', label: 'Email' },
	{ key: 'phone', label: 'Phone' },
	{ key: 'gifts', label: '# Gifts' },
	{ key: 'total', label: 'Total' },
	{ key: 'limit', label: 'Limit Remaining' },
];

export function DonorsView( { onViewDonor, pageOptions = [] } ) {
	const [ donors, setDonors ] = useState( [] );
	const [ loading, setLoading ] = useState( true );
	// Filters: filterType '' | 'maxed' | 'repeat'; contributorType '' | 'I' | 'O'.
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
		sortBy: 'total_given',
		filters: {
			filterType: '',
			contributorType: '',
			dState: '',
			dCity: '',
			dZip: '',
			fPage: '',
		},
	} );
	const { filterType, contributorType, dState, dCity, dZip, fPage } = filters;
	const [ total, setTotal ] = useState( 0 );
	const ncols = useColumnPrefs( 'donations_donors', DONOR_COLUMNS );
	const PER_PAGE = 100;
	const noLimit = window.LSFH?.noLimit || false;

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
		if ( contributorType ) {
			params.set( 'contributor_type', contributorType );
		}
		if ( filterType ) {
			params.set( 'filter', filterType );
		}
		if ( dState ) {
			params.set( 'state', dState );
		}
		if ( dCity ) {
			params.set( 'city', dCity );
		}
		if ( dZip ) {
			params.set( 'zip', dZip );
		}
		if ( fPage ) {
			params.set( 'fundraising_page', fPage );
		}
		apiGet( `/donors`, `${ params }` )
			.then( ( r ) => r.json() )
			.then( ( d ) => {
				if ( isStale() ) {
					return;
				}
				let donorRows = [];
				if ( Array.isArray( d.data ) ) {
					donorRows = d.data;
				} else if ( Array.isArray( d ) ) {
					donorRows = d;
				}
				setDonors( donorRows );
				setTotal( d.total || 0 );
				setLoading( false );
			} )
			.catch( () => {
				if ( ! isStale() ) {
					setLoading( false );
				}
			} );
	}, [
		begin,
		search,
		filterType,
		contributorType,
		dState,
		dCity,
		dZip,
		fPage,
		sortBy,
		sortDir,
		page,
	] );

	useEffect( () => {
		load();
	}, [ load ] );

	const hasFilter =
		search ||
		filterType ||
		contributorType ||
		dState ||
		dCity ||
		dZip ||
		fPage;

	return (
		<>
			<div className="lsfh-toolbar">
				<input
					className="lsfh-input lsfh-input--search"
					placeholder="Search donors…"
					value={ search }
					onChange={ ( e ) => setSearch( e.target.value ) }
				/>
				<>
					<div className="lsfh-filter-pair">
						<label
							htmlFor="lsfh-donations-filter"
							className="lsfh-filter-label"
						>
							Filter
						</label>
						<select
							id="lsfh-donations-filter"
							className="lsfh-input"
							value={ filterType }
							onChange={ ( e ) =>
								setFilter( 'filterType', e.target.value )
							}
						>
							<option value="">— All Donors —</option>
							{ ! noLimit && (
								<option value="maxed">Maxed Out</option>
							) }
							<option value="repeat">Repeat Donors</option>
						</select>
					</div>
					<select
						className="lsfh-input"
						value={ contributorType }
						onChange={ ( e ) =>
							setFilter( 'contributorType', e.target.value )
						}
					>
						<option value="">Everyone</option>
						<option value="I">Individuals only</option>
						<option value="O">Organizations &amp; PACs only</option>
					</select>
					<select
						className="lsfh-input"
						value={ fPage }
						onChange={ ( e ) =>
							setFilter( 'fPage', e.target.value )
						}
						style={ { maxWidth: 180 } }
					>
						<option value="">All Events</option>
						{ pageOptions.map( ( p ) => (
							<option key={ p } value={ p }>
								{ fundraisingLabel( p ) }
							</option>
						) ) }
					</select>
					<input
						className="lsfh-input"
						placeholder="State"
						value={ dState }
						onChange={ ( e ) =>
							setFilter( 'dState', e.target.value.toUpperCase() )
						}
						style={ { width: 80 } }
						maxLength={ 2 }
					/>
					<input
						className="lsfh-input"
						placeholder="City"
						value={ dCity }
						onChange={ ( e ) =>
							setFilter( 'dCity', e.target.value )
						}
						style={ { width: 120 } }
					/>
					<input
						className="lsfh-input"
						placeholder="ZIP"
						value={ dZip }
						onChange={ ( e ) =>
							setFilter( 'dZip', e.target.value )
						}
						style={ { width: 90 } }
						maxLength={ 10 }
					/>
					{ hasFilter && (
						<button
							className="btn btn-ghost btn-sm"
							onClick={ () => {
								setSearch( '' );
								setFilters( {
									filterType: '',
									contributorType: '',
									dState: '',
									dCity: '',
									dZip: '',
									fPage: '',
								} );
							} }
							style={ { color: 'var(--muted)' } }
						>
							✕ Clear
						</button>
					) }
				</>
				<div className="lsfh-toolbar-right">
					<ColumnsBtn
						columns={ DONOR_COLUMNS }
						prefs={ ncols }
						tableId="donations_donors"
					/>
				</div>
			</div>
			<div className="lsfh-box lsfh-box--table">
				<div
					className="lsfh-tscroll"
					tabIndex={ 0 }
					role="region"
					aria-label="Donors table"
				>
					<table className="lsfh-table">
						<thead>
							<tr>
								<SortTh col="last_name">Donor</SortTh>
								{ ncols.show( 'address' ) && <th>Address</th> }
								{ ncols.show( 'email' ) && <th>Email</th> }
								{ ncols.show( 'phone' ) && <th>Phone</th> }
								{ ncols.show( 'gifts' ) && (
									<SortTh col="gift_count"># Gifts</SortTh>
								) }
								{ ncols.show( 'total' ) && (
									<SortTh col="total_given">Total</SortTh>
								) }
								{ ! noLimit && ncols.show( 'limit' ) && (
									<th>Limit Remaining</th>
								) }
								<th></th>
							</tr>
						</thead>
						<tbody>
							{ loading && (
								<tr>
									<td colSpan={ 8 }>
										<div className="lsfh-loading">
											Loading…
										</div>
									</td>
								</tr>
							) }
							{ ! loading && donors.length === 0 && (
								<tr>
									<td colSpan={ 8 }>
										<div className="lsfh-empty">
											No donors found.
										</div>
									</td>
								</tr>
							) }
							{ donors.map( ( d, i ) => (
								<tr key={ i }>
									<td>
										<div className="lsfh-name-cell">
											<div className="lsfh-avatar">
												{ d.donor_type ===
												'organization'
													? '🏢'
													: `${
															d
																.first_name?.[ 0 ] ||
															''
													  }${
															d
																.last_name?.[ 0 ] ||
															''
													  }` }
											</div>
											<div>
												<div className="lsfh-name-main">
													{ d.first_name }{ ' ' }
													{ d.last_name }
													{ d.donor_type ===
														'organization' && (
														<span
															className="badge badge-slate"
															style={ {
																marginLeft: 6,
																fontSize:
																	'var(--fs-micro)',
															} }
														>
															{ orgTypeLabel(
																d.org_type
															) }
														</span>
													) }
												</div>
												{ d.occupation && (
													<div className="lsfh-name-sub">
														{ d.occupation }
													</div>
												) }
												{ d.employer && (
													<div className="lsfh-name-sub lsfh-label-xs lsfh-subtle">
														{ d.employer }
													</div>
												) }
											</div>
										</div>
									</td>
									{ ncols.show( 'address' ) && (
										<td
											className="lsfh-meta-xs"
											style={ { lineHeight: 1.4 } }
										>
											{ d.address ? (
												<>
													{ d.address }
													<br />
												</>
											) : null }
											{ [ d.city, d.state, d.zip ]
												.filter( Boolean )
												.join( ', ' ) || (
												<span className="lsfh-subtle">
													—
												</span>
											) }
										</td>
									) }
									{ ncols.show( 'email' ) && (
										<td className="lsfh-meta-sm">
											{ d.email ? (
												<a
													href={ `mailto:${ d.email }` }
													className="lsfh-primary"
												>
													{ d.email }
												</a>
											) : (
												<span className="lsfh-subtle">
													—
												</span>
											) }
										</td>
									) }
									{ ncols.show( 'phone' ) && (
										<td className="lsfh-meta-sm">
											{ d.phone ? (
												<a
													href={ `tel:${ d.phone }` }
													className="lsfh-primary"
												>
													{ fmtPhone( d.phone ) }
												</a>
											) : (
												<span className="lsfh-subtle">
													—
												</span>
											) }
										</td>
									) }
									{ ncols.show( 'gifts' ) && (
										<td>
											<span
												className="lsfh-bold"
												style={ {
													color:
														d.gift_count > 1
															? 'var(--p)'
															: 'var(--muted)',
												} }
											>
												{ d.gift_count }
											</span>
											{ d.gift_count > 1 && (
												<span
													className="lsfh-label-xs"
													style={ { marginLeft: 4 } }
												>
													repeat
												</span>
											) }
										</td>
									) }
									{ ncols.show( 'total' ) && (
										<td className="lsfh-amount positive">
											{ fmtC( d.total_given ) }
										</td>
									) }
									{ ! noLimit && ncols.show( 'limit' ) && (
										<td style={ { minWidth: 180 } }>
											{ ( () => {
												const caps = donorCaps(
													d,
													limitsFromPage()
												);
												if ( caps.isOrg && caps.off ) {
													return (
														<span className="lsfh-label-xs lsfh-subtle">
															No limit
														</span>
													);
												}
												return (
													<>
														<LimitBar
															label="Primary"
															given={
																d.primary_total_all ??
																d.primary_total
															}
															cap={ caps.primary }
															nearPct={
																caps.near
															}
														/>
														<LimitBar
															label="General"
															given={
																d.general_total_all ??
																d.general_total
															}
															cap={ caps.general }
															nearPct={
																caps.near
															}
														/>
													</>
												);
											} )() }
										</td>
									) }
									<td
										onClick={ ( e ) => e.stopPropagation() }
									>
										<button
											className="btn btn-ghost btn-sm"
											onClick={ () => onViewDonor?.( d ) }
											title="View transactions"
										>
											<List size={ 12 } /> Transactions
										</button>
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
					count={ `${ total.toLocaleString() } donor${
						1 === total ? '' : 's'
					}` }
				/>
			) }
			{ ! noLimit && (
				<p className="page-desc" style={ { marginTop: 12 } }>
					Individual limits: Primary{ ' ' }
					{ fmtC( window.LSFH?.primaryLimit || 3300 ) } · General{ ' ' }
					{ fmtC( window.LSFH?.generalLimit || 3300 ) }
					{ ! window.LSFH?.orgNoLimit && (
						<>
							{ ' ' }
							&nbsp;·&nbsp; Org limits: Primary{ ' ' }
							{ fmtC( window.LSFH?.orgPrimaryLimit || 5000 ) } ·
							General{ ' ' }
							{ fmtC( window.LSFH?.orgGeneralLimit || 5000 ) }
						</>
					) }
					{ window.LSFH?.orgNoLimit && (
						<> &nbsp;·&nbsp; No limits for organizations</>
					) }{ ' ' }
					· Near-limit warning at { window.LSFH?.nearLimitPct || 80 }%
				</p>
			) }
		</>
	);
}
