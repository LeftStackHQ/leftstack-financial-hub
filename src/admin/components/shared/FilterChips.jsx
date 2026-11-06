import { FilterChip } from './FilterChip';

/**
 * Row of chips showing which filters are currently narrowing a table.
 *
 * Without this a filtered table looks like an empty or short table, with the
 * cause hidden inside a dropdown — worst for filters that live behind "More
 * filters", where nothing on screen indicates they are set at all.
 *
 * Pass one entry per filter; falsy entries and entries with no label are
 * skipped, so callers can write `{ key: 'city', label: city && ... }` inline.
 * "Clear all" appears once more than one chip is active — per-chip removal
 * covers a single mistake, the bulk action covers starting over.
 *
 * @param {Object}   props              Component props.
 * @param {Array}    props.chips        [{ key, label, icon?, onRemove }]
 * @param {Function} [props.onClearAll] Reset every filter at once.
 * @return {Element|null} The chip row, or null when nothing is filtering.
 */
export function FilterChips( { chips, onClearAll } ) {
	const active = ( chips || [] ).filter( ( c ) => c && c.label );
	if ( ! active.length ) {
		return null;
	}
	return (
		<div className="lsfh-filter-chips">
			{ active.map( ( c ) => (
				<FilterChip
					key={ c.key }
					icon={ c.icon }
					label={ c.label }
					onRemove={ c.onRemove }
				/>
			) ) }
			{ onClearAll && active.length > 1 && (
				<button
					className="btn btn-ghost btn-sm lsfh-btn-muted"
					onClick={ onClearAll }
				>
					Clear all
				</button>
			) }
		</div>
	);
}
