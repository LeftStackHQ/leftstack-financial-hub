import { createRoot } from '@wordpress/element';
import watchTableLabels from './table-labels';

// Each screen is loaded as its own file when its page opens, so a page downloads only its own code.
const screens = {
	'lsfh-mount-dashboard': () =>
		import( /* webpackChunkName: "dashboard" */ './components/Dashboard' ),
	'lsfh-mount-donations': () =>
		import( /* webpackChunkName: "donations" */ './components/Donations' ),
	'lsfh-mount-expenditures': () =>
		import(
			/* webpackChunkName: "expenditures" */ './components/Expenditures'
		),
	'lsfh-mount-inkind': () =>
		import( /* webpackChunkName: "inkind" */ './components/InKind' ),
	'lsfh-mount-bank': () =>
		import( /* webpackChunkName: "bank" */ './components/BankTieOut' ),
	'lsfh-mount-settings': () =>
		import( /* webpackChunkName: "settings" */ './components/Settings' ),
};

Object.entries( screens ).forEach( ( [ id, load ] ) => {
	const el = document.getElementById( id );
	if ( el ) {
		load().then( ( { default: Screen } ) =>
			createRoot( el ).render( <Screen /> )
		);
	}
} );

watchTableLabels();

// Wire header add button → trigger add modal in each page component
const addBtn = document.getElementById( 'lsfh-header-add' );
if ( addBtn ) {
	addBtn.addEventListener( 'click', () => {
		document.dispatchEvent( new CustomEvent( 'lsfh:add' ) );
	} );
}

// Toast helper (global)
window.lsfhToast = ( msg, duration = 3000 ) => {
	let t = document.getElementById( 'lsfh-toast' );
	if ( ! t ) {
		t = document.createElement( 'div' );
		t.id = 'lsfh-toast';
		document.body.appendChild( t );
	}
	t.textContent = msg;
	t.classList.add( 'show' );
	setTimeout( () => t.classList.remove( 'show' ), duration );
};
