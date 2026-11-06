import { ColumnsBtn, DateFilterBtn, FilterChips } from '../shared';
import {
	EXP_TX_COLUMNS,
	NO_DATE,
	PAYMENT_METHODS,
	STATUS_LABELS,
} from './constants';
import { methodLabel } from './helpers';
import { Calendar, Download, FileUp } from 'lucide-react';

/**
 * The toolbar above the Expenditures table: search, Columns, Import and Export, the filter dropdowns, the date filter and the active-filter chips.
 *
 * @param {Object}   props
 * @param {Array}    props.categories    Budget categories.
 * @param {Function} props.clearFilters  Clears the search and every filter.
 * @param {Function} props.exportCSV     Downloads every expense matching the filters as a CSV.
 * @param {Object}   props.filters       Current filter values (fCat, fMethod, fStatus, fPeriod, fDateFrom, fDateTo, fDateLabel).
 * @param {Array}    props.months        Months that have expenditures, for the date menu.
 * @param {Array}    props.periods       Filing periods.
 * @param {string}   props.search        Search text.
 * @param {Function} props.setFilter     Sets one filter ( name, value ).
 * @param {Function} props.setFilters    Sets several filters at once.
 * @param {Function} props.setSearch     Sets the search text.
 * @param {Function} props.setShowImport Opens the CSV import pop-up.
 * @param {number}   props.total         Number of rows matching the filters.
 * @param {Object}   props.xcols         Column preferences, xcols.show( key ).
 */
export function ExpensesToolbar( {
	categories,
	clearFilters,
	exportCSV,
	filters,
	months,
	periods,
	search,
	setFilter,
	setFilters,
	setSearch,
	setShowImport,
	total,
	xcols,
} ) {
	const { fCat, fDateLabel, fMethod, fPeriod, fStatus } = filters;
	return (
		<>
			<div className="lsfh-toolbar lsfh-toolbar--rows">
				<div className="lsfh-toolbar-row">
					<input
						className="lsfh-input lsfh-input--search"
						placeholder="Search payee or amount…"
						value={ search }
						onChange={ ( e ) => setSearch( e.target.value ) }
					/>
					<div className="lsfh-toolbar-right">
						<ColumnsBtn
							columns={ EXP_TX_COLUMNS }
							prefs={ xcols }
							tableId="expenditures_transactions"
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
						value={ fCat }
						onChange={ ( e ) =>
							setFilter( 'fCat', e.target.value )
						}
					>
						<option value="">All Categories</option>
						{ categories.map( ( c ) => (
							<option key={ c.id } value={ c.id }>
								{ c.name }
							</option>
						) ) }
					</select>
					<select
						className="lsfh-input"
						value={ fMethod }
						onChange={ ( e ) =>
							setFilter( 'fMethod', e.target.value )
						}
					>
						<option value="">All Methods</option>
						{ PAYMENT_METHODS.map( ( m ) => (
							<option key={ m } value={ m }>
								{ methodLabel( m ) }
							</option>
						) ) }
					</select>
					<select
						className="lsfh-input"
						value={ fStatus }
						onChange={ ( e ) =>
							setFilter( 'fStatus', e.target.value )
						}
					>
						<option value="">All Statuses</option>
						<option value="scheduled">Scheduled</option>
						<option value="pending">Pending</option>
						<option value="posted">Posted</option>
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
					<DateFilterBtn
						label={ fDateLabel }
						months={ months }
						onApply={ ( from, to, lbl ) =>
							setFilters( {
								fDateFrom: from,
								fDateTo: to,
								fDateLabel: lbl,
							} )
						}
						onClear={ () => setFilters( NO_DATE ) }
					/>
				</div>
			</div>
			<FilterChips
				onClearAll={ clearFilters }
				chips={ [
					{
						key: 'search',
						label: search && `Search: ${ search }`,
						onRemove: () => setSearch( '' ),
					},
					{
						key: 'cat',
						label:
							fCat &&
							`Category: ${
								categories.find(
									( c ) => String( c.id ) === String( fCat )
								)?.name || fCat
							}`,
						onRemove: () => setFilter( 'fCat', '' ),
					},
					{
						key: 'method',
						label: fMethod && `Method: ${ methodLabel( fMethod ) }`,
						onRemove: () => setFilter( 'fMethod', '' ),
					},
					{
						key: 'status',
						label:
							fStatus &&
							`Status: ${ STATUS_LABELS[ fStatus ] || fStatus }`,
						onRemove: () => setFilter( 'fStatus', '' ),
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
					{
						key: 'date',
						icon: <Calendar size={ 11 } />,
						label: fDateLabel,
						onRemove: () => setFilters( NO_DATE ),
					},
				] }
			/>
		</>
	);
}
