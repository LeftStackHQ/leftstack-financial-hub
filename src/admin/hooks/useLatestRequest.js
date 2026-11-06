import { useRef, useCallback } from '@wordpress/element';

/**
 * Lets a screen ignore answers that arrive late. Call the returned function when a request
 * starts; it hands back a function that says whether a newer request has started since. When it
 * does, the older answer is stale and must not be shown, otherwise a slow reply to an old search
 * can replace the results of the newer one (the pattern React recommends for fetching in effects).
 *
 * @return {Function} begin(): returns isStale(), true once a newer request has begun.
 */
export function useLatestRequest() {
	const latest = useRef( 0 );
	return useCallback( () => {
		const mine = ++latest.current;
		return () => mine !== latest.current;
	}, [] );
}
