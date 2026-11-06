import { useState, useRef, useEffect, useCallback } from '@wordpress/element';
import { apiGet, apiSend } from '../components/shared/api';

// ── Per-user column visibility ────────────────────────────────────────────────

/**
 * Load and persist which table columns the current user has hidden.
 *
 * Preferences live in user meta rather than localStorage so they follow the
 * user between browsers and machines — each person on the campaign keeps their
 * own view. HIDDEN columns are stored rather than visible ones, so a column
 * added in a later release appears for everyone by default instead of being
 * invisible to existing users.
 *
 * Columns marked `off` are never shown and are not offered in the Columns control (a feature the site has turned off).
 *
 * Columns marked `locked` can never be hidden. That is not only cosmetic: the
 * frozen-column CSS targets `:first-child` and `:nth-child(2)` positionally, so
 * allowing either of the first two columns to be hidden would silently freeze
 * the wrong column.
 *
 * @param {string} tableId Stable id for this table, e.g. 'donations_transactions'.
 * @param {Array}  columns [{ key, label, locked }] in display order.
 * @return {Object} { show, hidden, toggle, reset, ready }
 */
export function useColumnPrefs( tableId, columns ) {
	const [ hidden, setHidden ] = useState( [] );
	const [ ready, setReady ] = useState( false );

	// toggle() must never compute from the `hidden` captured in a render
	// closure: two toggles in quick succession would then both start from the
	// same stale array, so the second silently discards the first. The ref
	// always holds the committed value, independent of render timing.
	const hiddenRef = useRef( [] );

	const apply = useCallback( ( next ) => {
		hiddenRef.current = next;
		setHidden( next );
	}, [] );

	useEffect( () => {
		let cancelled = false;
		apiGet( '/prefs/columns' )
			.then( ( r ) => r.json() )
			.then( ( d ) => {
				if ( cancelled ) {
					return;
				}
				const forTable = d && d[ tableId ];
				apply( Array.isArray( forTable ) ? forTable : [] );
				setReady( true );
			} )
			.catch( () => {
				if ( ! cancelled ) {
					setReady( true );
				}
			} );
		return () => {
			cancelled = true;
		};
	}, [ tableId, apply ] );

	const persist = ( next ) => {
		apply( next );
		apiSend( 'POST', '/prefs/columns', {
			table: tableId,
			hidden: next,
		} ).catch( () => {} );
	};

	const lockedKeys = columns
		.filter( ( c ) => c.locked )
		.map( ( c ) => c.key );
	const offKeys = columns.filter( ( c ) => c.off ).map( ( c ) => c.key );

	return {
		ready,
		hidden,
		show: ( key ) => ! hidden.includes( key ) && ! offKeys.includes( key ),
		toggle: ( key ) => {
			if ( lockedKeys.includes( key ) ) {
				return;
			}
			const cur = hiddenRef.current;
			persist(
				cur.includes( key )
					? cur.filter( ( k ) => k !== key )
					: [ ...cur, key ]
			);
		},
		reset: () => persist( [] ),
	};
}
