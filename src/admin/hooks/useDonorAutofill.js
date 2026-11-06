import { useState, useEffect, useRef } from '@wordpress/element';
import { apiGet } from '../components/shared';

/**
 * The "search existing donor" box on the donation form: debounced lookup, the suggestion list,
 * closing it on an outside click, and choosing one.
 *
 * @param {Object}   options
 * @param {Function} options.onPick Called with the chosen donor.
 * @return {Object} The search text, the hits, whether the list is open, a ref for the wrapper and pickDonor.
 */
export function useDonorAutofill( { onPick } ) {
	const [ donorQ, setDonorQ ] = useState( '' );
	const [ donorHits, setDonorHits ] = useState( [] );
	const [ donorOpen, setDonorOpen ] = useState( false );
	const donorRef = useRef( null );

	useEffect( () => {
		if ( donorQ.length < 2 ) {
			setDonorHits( [] );
			setDonorOpen( false );
			return;
		}
		// A slow answer for text typed earlier must not replace the hits for the current text.
		let ignore = false;
		const t = setTimeout( async () => {
			try {
				const r = await apiGet(
					`/donors`,
					`${ new URLSearchParams( {
						search: donorQ,
						per_page: 8,
					} ) }`
				);
				const d = await r.json();
				if ( ignore ) {
					return;
				}
				const hits = Array.isArray( d.data ) ? d.data : [];
				setDonorHits( hits );
				setDonorOpen( hits.length > 0 );
			} catch {}
		}, 300 );
		return () => {
			ignore = true;
			clearTimeout( t );
		};
	}, [ donorQ ] );

	useEffect( () => {
		const handler = ( e ) => {
			if ( donorRef.current && ! donorRef.current.contains( e.target ) ) {
				setDonorOpen( false );
			}
		};
		document.addEventListener( 'mousedown', handler );
		return () => document.removeEventListener( 'mousedown', handler );
	}, [] );

	const pickDonor = ( d ) => {
		onPick( d );
		setDonorQ( '' );
		setDonorHits( [] );
		setDonorOpen( false );
	};

	return {
		donorQ,
		setDonorQ,
		donorHits,
		donorOpen,
		setDonorOpen,
		donorRef,
		pickDonor,
	};
}
