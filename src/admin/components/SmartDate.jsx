import { useRef } from '@wordpress/element';
// @wordpress/element doesn't re-export forwardRef; importing it straight from
// 'react' is safe here — this build's webpack config (via @wordpress/scripts'
// DependencyExtractionWebpackPlugin) already externalizes 'react' to the same
// wp-element global @wordpress/element itself wraps, so there's no risk of a
// second React instance.
import { forwardRef } from 'react';

/**
 * Parse common date string formats into YYYY-MM-DD.
 * Handles: YYYY-MM-DD, MM/DD/YYYY, M/D/YYYY, MM-DD-YYYY, YYYY/MM/DD,
 * and natural-language strings like "May 19, 2026" or "19 May 2026".
 * Returns '' if the input can't be recognised.
 * @param {string} str Raw text pasted or typed into the date field.
 */
function parsePastedDate( str ) {
	const s = ( str || '' ).trim();
	if ( ! s ) {
		return '';
	}

	// Already YYYY-MM-DD — return as-is (avoid timezone shift from new Date())
	if ( /^\d{4}-\d{2}-\d{2}$/.test( s ) ) {
		return s;
	}

	// MM/DD/YYYY, M/D/YYYY, MM-DD-YYYY (US formats)
	const mdy = s.match( /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/ );
	if ( mdy ) {
		const [ , m, d, y ] = mdy;
		const year = y.length === 2 ? ( +y > 30 ? 1900 : 2000 ) + +y : +y;
		return `${ year }-${ m.padStart( 2, '0' ) }-${ d.padStart( 2, '0' ) }`;
	}

	// YYYY/MM/DD or YYYY.MM.DD
	const ymd = s.match( /^(\d{4})[\/\.](\d{1,2})[\/\.](\d{1,2})$/ );
	if ( ymd ) {
		const [ , y, m, d ] = ymd;
		return `${ y }-${ m.padStart( 2, '0' ) }-${ d.padStart( 2, '0' ) }`;
	}

	// Natural-language fallback ("May 19, 2026", "19 May 2026", etc.)
	// Use local date parts to avoid UTC→local timezone shift.
	const ts = new Date( s );
	if ( ! isNaN( ts.getTime() ) ) {
		const y = ts.getFullYear();
		const m = String( ts.getMonth() + 1 ).padStart( 2, '0' );
		const d = String( ts.getDate() ).padStart( 2, '0' );
		return `${ y }-${ m }-${ d }`;
	}

	return '';
}

/**
 * Drop-in replacement for <input type="date"> that:
 *
 * 1. Accepts pasted text in any common format (MM/DD/YYYY, YYYY-MM-DD,
 *    "May 19 2026", etc.) and normalises it to YYYY-MM-DD automatically.
 *
 * 2. Shows an optional × clear button when an `onClear` callback is provided.
 *    Clicking × clears the input and fires onClear() — ideal for optional
 *    inline-edit date fields (Date Received, Date Posted) that may need to
 *    be removed after accidental entry.
 *
 * All standard <input> props (value, defaultValue, onChange, onBlur,
 * onKeyDown, className, style, …) pass through unchanged. To focus this
 * field programmatically (e.g. instead of the autoFocus attribute, which
 * jsx-a11y/no-autofocus flags), pass a ref — it's forwarded to the
 * underlying <input>.
 * @param root0
 * @param root0.onClear
 * @param root0.onChange
 * @param root0.style
 * @param root0.className
 */
export const SmartDate = forwardRef( function SmartDate(
	{ onClear, onChange, style, className, ...rest },
	forwardedRef
) {
	const ref = useRef( null );

	// Keep our own ref (needed internally for paste-handling and the clear
	// button) in sync with whatever ref the caller passed in, supporting
	// both callback refs and object refs.
	const setRefs = ( node ) => {
		ref.current = node;
		if ( typeof forwardedRef === 'function' ) {
			forwardedRef( node );
		} else if ( forwardedRef ) {
			forwardedRef.current = node;
		}
	};

	const handlePaste = ( e ) => {
		e.preventDefault();
		const text = ( e.clipboardData || window.clipboardData ).getData(
			'text'
		);
		const normalized = parsePastedDate( text );
		if ( ! normalized ) {
			return;
		}
		// Set the DOM value so onBlur / uncontrolled usage picks it up.
		if ( ref.current ) {
			ref.current.value = normalized;
		}
		// Fire onChange for controlled (value + onChange) inputs.
		if ( onChange ) {
			onChange( { target: { value: normalized } } );
		}
	};

	return (
		<span
			style={ { display: 'inline-flex', alignItems: 'center', gap: 4 } }
		>
			<input
				type="date"
				ref={ setRefs }
				onChange={ onChange }
				onPaste={ handlePaste }
				style={ style }
				className={ className }
				{ ...rest }
			/>
			{ onClear && (
				<button
					type="button"
					title="Clear date"
					onClick={ () => {
						if ( ref.current ) {
							ref.current.value = '';
						}
						onClear();
					} }
					style={ {
						background: 'none',
						border: 'none',
						cursor: 'pointer',
						color: 'var(--muted)',
						padding: '1px 3px',
						fontSize: 'var(--fs-cmp)',
						lineHeight: 1,
						flexShrink: 0,
					} }
				>
					✕
				</button>
			) }
		</span>
	);
} );
