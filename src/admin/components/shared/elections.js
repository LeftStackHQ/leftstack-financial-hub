import { __ } from '@wordpress/i18n';

/**
 * The elections a contribution or a filing period can belong to. The one list on the screen side; the server's is
 * LSFH_Period_Elections::TYPES. Local is for a PAC or a party that does not report by election: it has no limit and
 * nothing special happens to it.
 */
export const ELECTION_TYPES = [
	'primary',
	'general',
	'runoff',
	'special',
	'local',
];

/**
 * Whether this site has elections turned off (Settings, General), for a PAC or a party that does not report by
 * election. The screens then leave the election fields out. It is read once per page load, so changing the setting
 * reloads the page.
 *
 * @return {boolean} True when the election fields are hidden.
 */
export const electionsHidden = () => !! window.LSFH?.noElections;

/**
 * What each election is called on screen.
 *
 * @return {Object} Election => label.
 */
export const electionLabels = () => ( {
	primary: __( 'Primary', 'leftstack-financial-hub' ),
	general: __( 'General', 'leftstack-financial-hub' ),
	runoff: __( 'Runoff', 'leftstack-financial-hub' ),
	special: __( 'Special', 'leftstack-financial-hub' ),
	local: __( 'Local', 'leftstack-financial-hub' ),
} );
