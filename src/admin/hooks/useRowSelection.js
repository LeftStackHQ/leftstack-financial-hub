import { useState, useCallback } from '@wordpress/element';

/**
 * Which rows of a table are ticked: tick one, tick all of the page, clear.
 *
 * @return {Object} selected (a Set of ids), setSelected, toggleOne( id ), toggleAll( rows ), clear().
 */
export function useRowSelection() {
	const [ selected, setSelected ] = useState( () => new Set() );
	const toggleOne = useCallback(
		( id ) =>
			setSelected( ( prev ) => {
				const next = new Set( prev );
				if ( next.has( id ) ) {
					next.delete( id );
				} else {
					next.add( id );
				}
				return next;
			} ),
		[]
	);
	// Ticks every row of the page, or clears them all when they are already all ticked.
	const toggleAll = ( rows ) => {
		if ( rows.every( ( row ) => selected.has( row.id ) ) ) {
			setSelected( new Set() );
		} else {
			setSelected( new Set( rows.map( ( row ) => row.id ) ) );
		}
	};
	const clear = useCallback( () => setSelected( new Set() ), [] );
	return { selected, setSelected, toggleOne, toggleAll, clear };
}
