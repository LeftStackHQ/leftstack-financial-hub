import { useState, useEffect, useCallback } from '@wordpress/element';

/**
 * Which tab of a screen is showing, kept in the page address (?tab=) so a tab can be linked to
 * and the browser's Back and Forward buttons move between tabs.
 *
 * @param {string} defaultTab The tab shown when the address has none.
 * @return {Array} [ tab, setTab ]: the current tab name and a function that switches to another.
 */
export function useUrlTab( defaultTab = 'transactions' ) {
	const getURLTab = useCallback(
		() =>
			new URLSearchParams( window.location.search ).get( 'tab' ) ||
			defaultTab,
		[ defaultTab ]
	);
	const [ tab, _setTab ] = useState( getURLTab );
	const setTab = useCallback( ( t ) => {
		const u = new URL( window.location.href );
		u.searchParams.set( 'tab', t );
		window.history.pushState( { tab: t }, '', u.toString() );
		_setTab( t );
	}, [] );
	useEffect( () => {
		const onPop = () => _setTab( getURLTab() );
		window.addEventListener( 'popstate', onPop );
		return () => window.removeEventListener( 'popstate', onPop );
	}, [ getURLTab ] );
	return [ tab, setTab ];
}
