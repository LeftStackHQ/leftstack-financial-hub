// ── Accessibility helpers ──────────────────────────────────────────────────────

/**
 * aria-sort value for a sortable column header.
 *
 * Kept as a helper rather than an inline conditional so call sites stay
 * flat — the equivalent expression inline is a nested ternary, which the
 * project's ESLint config rejects.
 *
 * @param {boolean} isActive Whether this column is the one currently sorted.
 * @param {string}  dir      Current sort direction, 'asc' or 'desc'.
 * @return {string} 'ascending', 'descending', or 'none'.
 */
export function ariaSortValue( isActive, dir ) {
	if ( ! isActive ) {
		return 'none';
	}
	return dir === 'asc' ? 'ascending' : 'descending';
}

/**
 * Wraps a click handler for use as onKeyDown on a non-native interactive
 * element (a div/span/li standing in for a button), so Enter/Space also
 * activate it — pair with role="button" tabIndex={0} on the element.
 *
 * @param {Function} fn The handler to run on Enter or Space.
 */
export function onKeyActivate( fn ) {
	return ( e ) => {
		if ( e.key === 'Enter' || e.key === ' ' ) {
			e.preventDefault();
			fn( e );
		}
	};
}
