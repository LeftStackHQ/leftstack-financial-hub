import { useReducer, useCallback, useMemo } from '@wordpress/element';

/**
 * State for a paged, searchable, sortable list: the page, the search text and the sort.
 *
 * The shape follows WordPress's own list model (the `view` object in @wordpress/dataviews:
 * page, search, sort with a field and a direction, filters). The one rule that every list shares
 * lives here, in the reducer: changing the search, the sort or a filter goes back to page 1.
 * Changing the page does not touch the rest.
 *
 * Loading stays in each screen; this hook only holds the state that decides what to load.
 *
 * @param {Object} options
 * @param {string} options.sortBy       Column the list starts sorted by.
 * @param {string} options.sortDir      Starting direction, 'asc' or 'desc'.
 * @param {string} options.newColumnDir Direction used when a different column is clicked.
 * @param {string} options.search       Starting search text.
 * @param {Object} options.filters      Starting filter values, by name (empty string means off).
 * @return {Object} page, search, sortBy, sortDir, filters and setPage, setSearch, toggleSort,
 *                  setFilter, setFilters.
 */
export function useListState( {
	sortBy,
	sortDir = 'desc',
	newColumnDir = 'desc',
	search = '',
	filters = {},
} ) {
	const [ state, dispatch ] = useReducer( listReducer, {
		page: 1,
		search,
		sort: { field: sortBy, direction: sortDir },
		filters,
	} );

	// A number, or a function from the current page to the next one (as React's setState).
	const setPage = useCallback(
		( page ) => dispatch( { type: 'page', page } ),
		[]
	);
	const setSearch = useCallback(
		( text ) => dispatch( { type: 'search', text } ),
		[]
	);
	const toggleSort = useCallback(
		( field ) => dispatch( { type: 'sort', field, newColumnDir } ),
		[ newColumnDir ]
	);

	// Several filters at once, for example { city: '', zip: '' } to clear two of them.
	const setFilters = useCallback(
		( patch ) => dispatch( { type: 'filters', patch } ),
		[]
	);
	const setFilter = useCallback(
		( name, value ) => setFilters( { [ name ]: value } ),
		[ setFilters ]
	);

	return useMemo(
		() => ( {
			page: state.page,
			search: state.search,
			sortBy: state.sort.field,
			sortDir: state.sort.direction,
			filters: state.filters,
			setPage,
			setSearch,
			toggleSort,
			setFilter,
			setFilters,
		} ),
		[ state, setPage, setSearch, toggleSort, setFilter, setFilters ]
	);
}

function listReducer( state, action ) {
	switch ( action.type ) {
		case 'page':
			return {
				...state,
				page:
					typeof action.page === 'function'
						? action.page( state.page )
						: action.page,
			};
		case 'search':
			return { ...state, search: action.text, page: 1 };
		case 'sort': {
			const { field, direction } = state.sort;
			if ( field === action.field ) {
				return {
					...state,
					sort: {
						field,
						direction: direction === 'asc' ? 'desc' : 'asc',
					},
					page: 1,
				};
			}
			return {
				...state,
				sort: { field: action.field, direction: action.newColumnDir },
				page: 1,
			};
		}
		case 'filters':
			return {
				...state,
				filters: { ...state.filters, ...action.patch },
				page: 1,
			};
		default:
			return state;
	}
}
