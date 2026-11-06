import {
	ColumnsBtn,
	DateFilterBtn,
	FilterChip,
	ELECTION_TYPES,
	electionsHidden,
	MoreFiltersBtn,
	fmtC,
} from '../shared';
import { SOURCES, STATE_ENDPOINTS, TX_COLUMNS } from './constants';
import { fundraisingLabel, srcLabel } from './helpers';
import { Calendar, Download, Landmark, Layers } from 'lucide-react';

/**
 * The toolbar above the Donations table: search, the action buttons, the filter dropdowns, the date and More filters, and the active-filter chips.
 *
 * @param {Object}   props
 * @param {Function} props.applyDate          Applies a date range ( from, to, label ).
 * @param {Function} props.clearDate          Clears the date range.
 * @param {Function} props.clearFilters       Clears the search and every filter.
 * @param {Object}   props.cols               Column preferences, cols.show( key ).
 * @param {Function} props.exportAll          Downloads every row matching the filters as a CSV.
 * @param {Object}   props.filters            Current filter values (fElec, fReport, ... fPage).
 * @param {string}   props.filingState        The campaign's filing state, or an empty string.
 * @param {Function} props.handleMore         Applies a change from the More filters panel ( key, value ).
 * @param {boolean}  props.hasFilters         Whether any search or filter is active.
 * @param {Array}    props.months             Months that have donations, for the date menu.
 * @param {Array}    props.pageOptions        Fundraising pages seen in the data.
 * @param {Array}    props.periods            Filing periods.
 * @param {string}   props.search             Search text.
 * @param {Function} props.setFilter          Sets one filter ( name, value ).
 * @param {Function} props.setSearch          Sets the search text.
 * @param {Function} props.setShowAllocate    Opens or closes the Auto-Allocate dialog.
 * @param {Function} props.setShowStateExport Opens or closes the State Report dialog.
 */
export function DonationsToolbar( {
	applyDate,
	clearDate,
	clearFilters,
	cols,
	exportAll,
	filters,
	filingState,
	handleMore,
	hasFilters,
	months,
	pageOptions,
	periods,
	search,
	setFilter,
	setSearch,
	setShowAllocate,
	setShowStateExport,
} ) {
	const {
		fAmountMax,
		fAmountMin,
		fCity,
		fDateLabel,
		fElec,
		fPage,
		fPeriod,
		fReport,
		fSource,
		fState,
		fStatus,
		fZip,
	} = filters;
	return (
		<>
			<div className="lsfh-toolbar lsfh-toolbar--rows">
				{ /* Row 1: search + action buttons */ }
				<div className="lsfh-toolbar-row">
					<input
						className="lsfh-input lsfh-input--search"
						placeholder="Search name or amount…"
						value={ search }
						onChange={ ( e ) => setSearch( e.target.value ) }
						style={ { width: 220 } }
					/>
					<div className="lsfh-toolbar-right">
						<ColumnsBtn columns={ TX_COLUMNS } prefs={ cols } />
						{ /* Always rendered, disabled until a period
								     is chosen. It used to be hidden entirely,
								     which gave no clue the feature existed or
								     that the period filter one row below was
								     what unlocked it. */ }
						<button
							className="btn btn-ghost btn-sm"
							onClick={ () => setShowAllocate( true ) }
							disabled={ ! fPeriod }
							title={
								fPeriod
									? 'Re-check which contributions fall under the unitemized threshold for this filing period.'
									: 'Pick a filing period in the filters below to run Auto-Allocate.'
							}
						>
							<Layers size={ 14 } /> Auto-Allocate
						</button>
						{ filingState && STATE_ENDPOINTS[ filingState ] && (
							<button
								className="btn btn-primary btn-sm"
								onClick={ () => setShowStateExport( true ) }
								title="Formatted for your state's campaign finance filing system — this is the one to upload to the state"
							>
								<Landmark size={ 14 } /> State Report
							</button>
						) }
						<button
							className="btn btn-ghost btn-sm"
							onClick={ exportAll }
							title="All columns, matching your active filters, with no row limit — for internal use, not formatted for state filing"
						>
							<Download size={ 14 } /> Data Export
						</button>
					</div>
				</div>
				{ /* Row 2: filters */ }
				<div className="lsfh-toolbar-row">
					<select
						className="lsfh-input"
						value={ fReport }
						onChange={ ( e ) =>
							setFilter( 'fReport', e.target.value )
						}
					>
						<option value="">All Types</option>
						<option value="itemized">Itemized</option>
						<option value="unitemized">Unitemized</option>
					</select>
					<select
						className="lsfh-input"
						value={ fSource }
						onChange={ ( e ) =>
							setFilter( 'fSource', e.target.value )
						}
					>
						<option value="">All Sources</option>
						{ SOURCES.map( ( s ) => (
							<option key={ s } value={ s }>
								{ srcLabel( s ) }
							</option>
						) ) }
					</select>
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
					<div
						style={ {
							display: 'flex',
							gap: 6,
							alignItems: 'center',
						} }
					>
						<DateFilterBtn
							label={ fDateLabel }
							months={ months }
							onApply={ applyDate }
							onClear={ clearDate }
						/>
						<MoreFiltersBtn
							fPage={ fPage }
							fState={ fState }
							fCity={ fCity }
							fZip={ fZip }
							fAmountMin={ fAmountMin }
							fAmountMax={ fAmountMax }
							fElection={ fElec }
							fStatus={ fStatus }
							electionOptions={
								electionsHidden()
									? []
									: ELECTION_TYPES.map( ( t ) => ( {
											value: t,
											label:
												t.charAt( 0 ).toUpperCase() +
												t.slice( 1 ),
									  } ) )
							}
							statusOptions={ [
								{ value: 'pending', label: 'Pending' },
								{ value: 'filed', label: 'Filed' },
							] }
							pageOptions={ pageOptions }
							onChange={ handleMore }
							fundraisingLabel={ fundraisingLabel }
						/>
						{ hasFilters && (
							<button
								className="btn btn-ghost btn-sm"
								onClick={ clearFilters }
								style={ {
									color: 'var(--muted)',
									whiteSpace: 'nowrap',
								} }
							>
								✕ Clear
							</button>
						) }
					</div>
				</div>
				{ /* Row 3: active filter chips */ }
				{ ( fDateLabel ||
					fPage ||
					fState ||
					fCity ||
					fZip ||
					fAmountMin ||
					fAmountMax ||
					fElec ||
					fStatus ) && (
					<div
						className="lsfh-toolbar-row"
						style={ {
							paddingTop: 8,
							borderTop: '1px solid var(--border-lt)',
							gap: 6,
							flexWrap: 'wrap',
						} }
					>
						{ fElec && (
							<FilterChip
								label={ `Election: ${
									fElec.charAt( 0 ).toUpperCase() +
									fElec.slice( 1 )
								}` }
								onRemove={ () => setFilter( 'fElec', '' ) }
							/>
						) }
						{ fStatus && (
							<FilterChip
								label={ `Status: ${
									fStatus.charAt( 0 ).toUpperCase() +
									fStatus.slice( 1 )
								}` }
								onRemove={ () => setFilter( 'fStatus', '' ) }
							/>
						) }
						{ fDateLabel && (
							<FilterChip
								icon={ <Calendar size={ 11 } /> }
								label={ fDateLabel }
								onRemove={ clearDate }
							/>
						) }
						{ fPage && (
							<FilterChip
								label={ fundraisingLabel( fPage ) }
								onRemove={ () => setFilter( 'fPage', '' ) }
							/>
						) }
						{ fState && (
							<FilterChip
								label={ `State: ${ fState }` }
								onRemove={ () => setFilter( 'fState', '' ) }
							/>
						) }
						{ fCity && (
							<FilterChip
								label={ `City: ${ fCity }` }
								onRemove={ () => setFilter( 'fCity', '' ) }
							/>
						) }
						{ fZip && (
							<FilterChip
								label={ `ZIP: ${ fZip }` }
								onRemove={ () => setFilter( 'fZip', '' ) }
							/>
						) }
						{ fAmountMin && (
							<FilterChip
								label={ `Min: ${ fmtC(
									parseFloat( fAmountMin )
								) }` }
								onRemove={ () => setFilter( 'fAmountMin', '' ) }
							/>
						) }
						{ fAmountMax && (
							<FilterChip
								label={ `Max: ${ fmtC(
									parseFloat( fAmountMax )
								) }` }
								onRemove={ () => setFilter( 'fAmountMax', '' ) }
							/>
						) }
						<button
							className="btn btn-ghost btn-sm"
							style={ {
								color: 'var(--muted)',
								marginLeft: 'auto',
							} }
							onClick={ clearFilters }
						>
							Clear all
						</button>
					</div>
				) }
			</div>
		</>
	);
}
