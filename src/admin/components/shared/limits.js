import { __, sprintf } from '@wordpress/i18n';
import { isOrgTypeExempt } from './orgTypes';
import { electionLabels } from './elections';
import { fmtC } from './format';

/**
 * How far a total is toward a cap.
 *
 * @param {number} given   The amount given so far.
 * @param {number} cap     The cap, zero or blank for none.
 * @param {number} nearPct The share of the cap (0 to 1) where the status turns to "near".
 * @return {string} 'none', 'ok', 'near' or 'maxed'.
 */
export const limitStatus = ( given, cap, nearPct ) => {
	if ( ! cap ) {
		return 'none';
	}
	if ( given >= cap ) {
		return 'maxed';
	}
	if ( given >= cap * nearPct ) {
		return 'near';
	}
	return 'ok';
};

/**
 * The limit settings the page was loaded with (window.LSFH), in the shape donorCaps() reads.
 *
 * @return {Object} noLimit, orgNoLimit, indPrimary, indGeneral, orgPrimary, orgGeneral and nearPct.
 */
export const limitsFromPage = () => {
	const p = window.LSFH || {};
	return {
		noLimit: !! p.noLimit,
		orgNoLimit: !! p.orgNoLimit,
		indPrimary: p.primaryLimit || 3300,
		indGeneral: p.generalLimit || 3300,
		orgPrimary: p.orgPrimaryLimit || 5000,
		orgGeneral: p.orgGeneralLimit || 5000,
		nearPct: p.nearLimitPct || 80,
	};
};

/**
 * The limit settings the dashboard response carries (its `limits` object), in the shape donorCaps() reads.
 *
 * @param {Object} lim The `limits` object of /dashboard.
 * @return {Object} The same shape as limitsFromPage().
 */
export const limitsFromDashboard = ( lim = {} ) => ( {
	noLimit: !! lim.no_limit,
	orgNoLimit: !! lim.org_no_limit,
	indPrimary: lim.ind_primary,
	indGeneral: lim.ind_general,
	orgPrimary: lim.org_primary,
	orgGeneral: lim.org_general,
	nearPct: lim.near_pct || 80,
} );

/**
 * The caps that apply to one donor: the individual caps, or the organization caps for an organization. No cap applies
 * when the site turned that kind of limit off, or when the organization is a PAC or a party committee.
 *
 * @param {Object} donor  A donor row (donor_type, org_type).
 * @param {Object} limits limitsFromPage() or limitsFromDashboard().
 * @return {{isOrg: boolean, off: boolean, primary: number, general: number, near: number}} off is true when no cap applies;
 *         near is the share of a cap (0 to 1) where a donor counts as near it.
 */
export const donorCaps = ( donor, limits ) => {
	const isOrg = donor.donor_type === 'organization';
	const off = isOrg
		? limits.orgNoLimit || isOrgTypeExempt( donor.org_type )
		: limits.noLimit;
	return {
		isOrg,
		off,
		primary: isOrg ? limits.orgPrimary : limits.indPrimary,
		general: isOrg ? limits.orgGeneral : limits.indGeneral,
		near: limits.nearPct / 100,
	};
};

/**
 * The sentence for a donor who is over a limit, from an entry in `limit_warning` or `over_limit` in a response.
 *
 * @param {Object} over name, election, total and limit.
 * @return {string} For example "Jane Doe is at $3,500.00 for the General election, over the $3,300.00 limit."
 */
export const overLimitText = ( over ) =>
	sprintf(
		/* translators: 1: donor name, 2: amount given, 3: election name, 4: the limit. */
		__(
			'%1$s is at %2$s for the %3$s election, over the %4$s limit.',
			'leftstack-financial-hub'
		),
		over.name,
		fmtC( over.total ),
		electionLabels()[ over.election ] || over.election,
		fmtC( over.limit )
	);
