/**
 * Copies each column heading onto the cells beneath it as a data-label.
 *
 * On a phone the CSS turns table rows into cards and shows that label above
 * each value. Doing it here, once, means no table needs its own markup, and
 * it keeps working as columns are shown, hidden or reordered.
 */
const PRIMARY = /^(donor|payee|name|description|item)\b/i;

function labelTable( table ) {
	const heads = Array.from( table.querySelectorAll( 'thead th' ) );
	if ( ! heads.length ) {
		return;
	}
	// The sort arrows are part of the heading's text, so drop them.
	const labels = heads.map( ( th ) =>
		th.textContent.replace( /[↕↑↓]/g, '' ).trim()
	);
	table.querySelectorAll( 'tbody tr' ).forEach( ( row ) => {
		Array.from( row.children ).forEach( ( cell, i ) => {
			if ( cell.hasAttribute( 'colspan' ) ) {
				return;
			}
			const label = labels[ i ] || '';
			if ( cell.dataset.label !== label ) {
				cell.dataset.label = label;
			}
			if ( PRIMARY.test( label ) ) {
				cell.dataset.primary = '1';
			}
		} );
	} );
}

export default function watchTableLabels() {
	const app = document.getElementById( 'lsfh-app' );
	if ( ! app ) {
		return;
	}
	let queued = false;
	const run = () => {
		queued = false;
		app.querySelectorAll( '.lsfh-tscroll table' ).forEach( labelTable );
	};
	// Only structure changes are watched, so setting the attributes above
	// does not trigger another pass.
	new window.MutationObserver( () => {
		if ( ! queued ) {
			queued = true;
			window.requestAnimationFrame( run );
		}
	} ).observe( app, { childList: true, subtree: true } );
	run();
}
