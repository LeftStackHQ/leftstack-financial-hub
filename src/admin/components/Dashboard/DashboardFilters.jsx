import { DateFilterBtn } from '../shared';

/**
 * The Dashboard's filter bar: a filing period or a date range, and a button to clear it.
 *
 * @param {Object}   props
 * @param {Array}    props.periods      Filing periods.
 * @param {Array}    props.months       Months that have data, for the date menu.
 * @param {string}   props.period       The chosen filing period id, or ''.
 * @param {string}   props.fDateFrom    Start of the chosen date range, or ''.
 * @param {string}   props.fDateLabel   Label of the chosen date range.
 * @param {Function} props.selectPeriod Chooses a filing period.
 * @param {Function} props.applyDates   Chooses a date range ( from, to, label ).
 * @param {Function} props.clearDates   Clears the date range.
 * @param {Function} props.clearAll     Clears the period and the date range.
 */
export function DashboardFilters( {
	periods,
	months,
	period,
	fDateFrom,
	fDateLabel,
	selectPeriod,
	applyDates,
	clearDates,
	clearAll,
} ) {
	return (
		<div className="lsfh-filter-bar">
			<div className="lsfh-filter-pair">
				<label
					htmlFor="lsfh-dashboard-filing-period"
					className="lsfh-filter-label"
				>
					Filing Period
				</label>
				<select
					id="lsfh-dashboard-filing-period"
					className="lsfh-input"
					value={ period }
					onChange={ ( e ) => selectPeriod( e.target.value ) }
				>
					<option value="">— All Periods —</option>
					{ periods.map( ( p ) => (
						<option key={ p.id } value={ p.id }>
							{ p.name }
						</option>
					) ) }
				</select>
			</div>
			<DateFilterBtn
				label={ fDateLabel }
				months={ months }
				onApply={ applyDates }
				onClear={ clearDates }
			/>
			{ ( period || fDateFrom ) && (
				<button
					className="btn btn-ghost btn-sm lsfh-btn-muted"
					onClick={ clearAll }
				>
					✕ Clear
				</button>
			) }
		</div>
	);
}
