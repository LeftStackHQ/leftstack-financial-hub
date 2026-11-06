export const PAYMENT_METHODS = [
	'check',
	'debit',
	'credit',
	'cash',
	'ach',
	'transfer',
	'wire',
	'fee',
	'other',
];

export const METHOD_LABEL = {
	ach: 'ACH',
	transfer: 'Transfer',
	wire: 'Wire',
	check: 'Check',
	debit: 'Debit',
	credit: 'Credit',
	cash: 'Cash',
	fee: 'Fee',
	other: 'Other',
};

// Deterministic color palette for category badges (rotates by name hash)
// Background and text colour pairs for category badges, picked by category name. (The Settings colour picker uses CATEGORY_SWATCHES.)
export const CATEGORY_BADGE_COLORS = [
	{ bg: '#e0f2fe', color: '#0369a1' }, // sky
	{ bg: '#dcfce7', color: '#166534' }, // green
	{ bg: '#fef9c3', color: '#854d0e' }, // yellow
	{ bg: '#fce7f3', color: '#9d174d' }, // pink
	{ bg: '#ede9fe', color: '#5b21b6' }, // purple
	{ bg: '#ffedd5', color: '#9a3412' }, // orange
	{ bg: '#ccfbf1', color: '#0f766e' }, // teal
	{ bg: '#e0e7ff', color: '#3730a3' }, // indigo
];

export const STATUS_LABELS = {
	scheduled: 'Scheduled',
	pending: 'Pending',
	posted: 'Posted',
};

export const STATUS_BADGES = {
	scheduled: 'badge-gold',
	pending: 'badge-slate',
	posted: 'badge-green',
};

/**
 * Columns of the Expenditures → Transactions table.
 *
 * Checkbox and Date are locked because the scroll region freezes the first two
 * columns positionally; Payee is locked as the row's identity.
 */
export const EXP_TX_COLUMNS = [
	{ key: 'check', label: 'Select', locked: true },
	{ key: 'date', label: 'Date', locked: true },
	{ key: 'payee', label: 'Payee', locked: true },
	{ key: 'category', label: 'Category' },
	{ key: 'description', label: 'Description' },
	{ key: 'payout', label: 'Payout' },
	{ key: 'method', label: 'Method' },
	{ key: 'receipt', label: 'Receipt' },
	{ key: 'amount', label: 'Amount' },
	{ key: 'status', label: 'Status' },
	{ key: 'posted', label: 'Posted' },
	{ key: 'balanced', label: 'Balanced' },
];

// Filter values when everything is off, and the date range alone when it is cleared.
export const NO_DATE = { fDateFrom: '', fDateTo: '', fDateLabel: '' };
export const NO_FILTERS = {
	fCat: '',
	fMethod: '',
	fStatus: '',
	fPeriod: '',
	...NO_DATE,
};
