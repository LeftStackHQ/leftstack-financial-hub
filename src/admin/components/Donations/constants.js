import { __ } from '@wordpress/i18n';
import { electionsHidden } from '../shared/elections';

/* ─────────────── State Export Modal ───────────────────────── */
export const STATE_ENDPOINTS = {
	tn: 'export/tn-contributions',
};

export const SOURCES = [ 'actblue', 'cash', 'check', 'stripe', 'manual' ];

// alphabetical, Other pinned last
// Display names for the stored source values. 'manual' shows as "Other"
// because it is the catch-all for anything entered by hand — ACH, a wire, a
// Democracy Engine import — and "Manual" read as a data-entry method rather
// than a category of money. Only the LABEL changes: the stored value stays
// 'manual', so every existing row remains valid and no migration is needed.
// democracyengine is kept only so rows imported before 2026-09-10 still render
// a real name in the audit breakdown; new DE imports store 'manual'.
export const SOURCE_LABELS = {
	actblue: 'ActBlue',
	cash: 'Cash',
	check: 'Check',
	stripe: 'Stripe',
	manual: 'Other',
	democracyengine: 'Democracy Engine',
};

/**
 * Columns of the Donations → Transactions table, in display order.
 *
 * The checkbox and Donor columns are `locked`: the frozen-column CSS targets
 * `:first-child` and `:nth-child(2)` positionally, so hiding either would
 * silently freeze the wrong column while scrolling sideways.
 */
export const TX_COLUMNS = [
	{ key: 'check', label: 'Select', locked: true },
	{ key: 'donor', label: 'Donor', locked: true },
	{ key: 'source', label: 'Source' },
	{ key: 'gross', label: 'Gross' },
	{ key: 'fee', label: 'Fee' },
	{ key: 'net', label: 'Net' },
	{ key: 'election', label: 'Election', off: electionsHidden() },
	{ key: 'type', label: 'Type' },
	{ key: 'status', label: 'Status' },
	{ key: 'date', label: 'Date' },
	{ key: 'balanced', label: 'Balanced' },
];

// Filter values when everything is off. The date range, the amount range and the rest are
// separate so each can be cleared on its own.
export const NO_DATE = { fDateFrom: '', fDateTo: '', fDateLabel: '' };
export const NO_AMOUNT = { fAmountMin: '', fAmountMax: '' };
export const NO_OTHER_FILTERS = {
	fElec: '',
	fReport: '',
	fStatus: '',
	fSource: '',
	fPeriod: '',
	fState: '',
	fCity: '',
	fZip: '',
	fPage: '',
	fDisbId: '',
	fHasRefund: false,
};
export const NO_FILTERS = { ...NO_OTHER_FILTERS, ...NO_DATE, ...NO_AMOUNT };

/**
 * The words for what the Before you file check can find missing, by the key the server uses.
 *
 * @return {Object} Key => label.
 */
export const filingCheckLabels = () => ( {
	name: __( 'Name', 'leftstack-financial-hub' ),
	street: __( 'Street', 'leftstack-financial-hub' ),
	city: __( 'City', 'leftstack-financial-hub' ),
	state: __( 'State', 'leftstack-financial-hub' ),
	zip: __( 'ZIP', 'leftstack-financial-hub' ),
	occupation: __( 'Occupation', 'leftstack-financial-hub' ),
	employer: __( 'Employer', 'leftstack-financial-hub' ),
} );
