/**
 * The kinds of organization a donation can come from. Mirrors LSFH_Org_Types on the PHP side; the server is the
 * judge of what is stored, this list only builds the choices and the labels.
 */
export const ORG_TYPES = [
	{ value: 'pac', label: 'PAC' },
	{ value: 'party', label: 'Party committee' },
	{ value: 'union', label: 'Union' },
	{ value: 'business', label: 'Business' },
	{ value: 'other', label: 'Other organization' },
];

/** The types the organization limit does not apply to. */
const EXEMPT_ORG_TYPES = [ 'pac', 'party' ];

/**
 * Whether the organization limit is waived for this type.
 *
 * @param {string|null} type An org_type value, blank when none was chosen.
 * @return {boolean} True for a PAC or a party committee.
 */
export const isOrgTypeExempt = ( type ) => EXEMPT_ORG_TYPES.includes( type );

/**
 * The short name shown on a badge for an organization donor.
 *
 * @param {string|null} type An org_type value, blank when none was chosen.
 * @return {string} The type's label, or "Org" when no type was chosen.
 */
export const orgTypeLabel = ( type ) =>
	ORG_TYPES.find( ( t ) => t.value === type )?.label ?? 'Org';
