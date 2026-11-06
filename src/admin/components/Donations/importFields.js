// The columns the donations CSV import understands: what each one is, how a file's
// column names are matched to them, and the template file offered for download.
// Grouped so the mapping screen can show them in the order the money flows,
// and flagged so the importer can refuse a file that would silently misreport.
// `required` blocks the import outright; `critical` blocks unless the user
// states the file genuinely has no such column. Everything else is optional.
export const DONATION_IMPORT_FIELDS = [
	// ── Donor ─────────────────────────────────────────────────
	{ key: 'first_name', label: 'First Name', group: 'donor' },
	{ key: 'last_name', label: 'Last Name', group: 'donor' },
	{ key: 'donor_email', label: 'Email', group: 'donor' },
	{ key: 'donor_phone', label: 'Phone', group: 'donor' },
	{ key: 'address', label: 'Address', group: 'donor' },
	{ key: 'city', label: 'City', group: 'donor' },
	{ key: 'state', label: 'State', group: 'donor' },
	{ key: 'zip', label: 'ZIP', group: 'donor' },
	{
		key: 'donor_type',
		label: 'Organization? (Y/N)',
		group: 'donor',
		advanced: true,
		help: 'Marks the contribution as coming from an organization rather than a person. Drives CONTRIBUTORTYPE on the TN export and the PAC exclusion.',
	},
	{
		key: 'org_name',
		label: 'Organization Name',
		group: 'donor',
		advanced: true,
		help: 'Used instead of first/last name when the donor is an organization.',
	},
	{ key: 'occupation', label: 'Occupation', group: 'donor' },
	{ key: 'employer', label: 'Employer', group: 'donor' },
	// ── Contribution ──────────────────────────────────────────
	{
		key: 'gross_amount',
		label: 'Gross Amount',
		group: 'contribution',
		required: true,
		help: 'The amount the donor gave, before fees.',
	},
	{
		key: 'contribution_date',
		label: 'Contribution Date',
		group: 'contribution',
		required: true,
		help: 'When the donor gave. Not the deposit date.',
	},
	{
		key: 'payment_type',
		label: 'Payment Method',
		group: 'contribution',
		advanced: true,
	},
	{
		key: 'check_number',
		label: 'Check #',
		group: 'contribution',
		advanced: true,
	},
	{
		key: 'recurring',
		label: 'Recurring (Y/N)',
		group: 'contribution',
		advanced: true,
	},
	{
		key: 'source',
		label: 'Source',
		group: 'contribution',
		advanced: true,
	},
	{
		key: 'notes',
		label: 'Notes',
		group: 'contribution',
		advanced: true,
	},
	// ── Deposit ───────────────────────────────────────────────
	{
		key: 'actblue_fee',
		label: 'Processing Fee',
		group: 'deposit',
		critical: true,
		help: 'Subtracted from gross to get what reached the bank. Without it every donation looks like it deposited in full.',
	},
	{
		key: 'disbursement_id',
		label: 'Disbursement / Payout ID',
		group: 'deposit',
		critical: true,
		help: 'Groups donations into one bank deposit. ActBlue calls it Disbursement ID, Stripe calls it payout_id, Democracy Engine calls it Transmittal Reference.',
	},
	{
		key: 'disbursement_date',
		label: 'Disbursement Date',
		group: 'deposit',
		critical: true,
		help: 'When the batch was paid out.',
	},
	{
		key: 'actblue_id',
		label: 'Receipt / Transaction ID',
		group: 'deposit',
		help: 'Used to detect re-imported rows.',
	},
	{
		key: 'payment_date',
		label: 'Payment Date',
		group: 'deposit',
		advanced: true,
	},
	// ── Attribution ───────────────────────────────────────────
	{
		key: 'fundraising_page',
		label: 'Fundraising Page',
		group: 'attribution',
		advanced: true,
	},
	{
		key: 'reference_code',
		label: 'Reference Code',
		group: 'attribution',
		advanced: true,
	},
];

export const FIELD_GROUPS = [
	{
		id: 'contribution',
		label: 'Contribution',
		note: 'Required — the import will not run without these.',
	},
	{
		id: 'deposit',
		label: 'Deposit & fees',
		note: 'How donations roll up into a bank deposit. Getting these wrong is what makes totals disagree with the bank.',
	},
	{ id: 'donor', label: 'Donor', note: 'Needed for itemized state filings.' },
	{ id: 'attribution', label: 'Attribution', note: 'Optional.' },
];

// Known column name synonyms for auto-mapping. Handles ActBlue exports, our own
// template, and Stripe payout exports (payouts_acct_*.csv — all snake_case:
// donor_first_name, donation_amount, processing_fee, transaction_date, payout_id, etc.).
export const AUTO_MAP_HINTS = {
	first_name: [
		'first name',
		'firstname',
		'first_name',
		'donor first name',
		'donor_first_name',
		'fname',
	],
	last_name: [
		'last name',
		'lastname',
		'last_name',
		'donor last name',
		'donor_last_name',
		'lname',
	],
	donor_email: [ 'donor email', 'email', 'donor_email', 'e-mail' ],
	donor_phone: [
		'donor phone',
		'phone',
		'donor_phone',
		'phone number',
		'mobile',
	],
	gross_amount: [
		'gross amount',
		'donation_amount',
		'gross_amount',
		'amount',
		'contribution amount',
		'total',
		'donation_amount',
		'donation amount',
	],
	contribution_date: [
		// Specific names first — Democracy Engine ships five timezone variants
		// (ET/CT/MT/PT and an FEC-format column) and none of them is just "date".
		'donation date (et)',
		'contribution date',
		'contribution_date',
		'date',
		'receipt date',
		'donation date',
		'transaction_date',
		'transaction date',
	],
	address: [
		'address',
		'address1',
		'billing address 1',
		'street address',
		'donor addr1',
		'addr1',
	],
	city: [ 'city', 'billing city', 'donor city' ],
	state: [ 'state', 'billing state', 'donor state' ],
	zip: [
		'zip',
		'zip code',
		'zipcode',
		'postal code',
		'billing zip',
		'donor zip',
		'zip_code',
	],
	donor_type: [
		'donor is an organization (not an individual)?',
		'donor is an organization',
		'is organization',
		'organization?',
		'donor_type',
	],
	org_name: [
		'donor organization name (only applicable to non-individual donations)',
		'donor organization name',
		'organization name',
		'org name',
	],
	occupation: [ 'occupation', 'job title', 'donor occupation' ],
	employer: [ 'employer', 'company', 'employer name', 'donor employer' ],
	source: [ 'source', 'payment source' ],
	payment_type: [ 'payment type', 'payment_type', 'payment method' ],
	check_number: [ 'check #', 'check number', 'check_number' ],
	recurring: [
		'recurrence number',
		'recurring total months',
		'recurring',
		'is recurring',
	],
	notes: [ 'notes', 'note', 'comments', 'memo' ],
	actblue_id: [
		'receipt id',
		'receiptid',
		'actblue receipt id',
		'actblue id',
		'actblue_id',
		'receipt',
		'transaction_id',
		'transaction id',
	],
	actblue_fee: [
		'convenience fee (if applicable)',
		'actblue fee',
		'fee',
		'processing fee',
		'actblue_fee',
		'processing_fee',
	],
	disbursement_id: [
		// Same concept, three vendor words for it.
		'transmittal reference',
		'disbursement id',
		'disbursement_id',
		'disbursementid',
		'disb id',
		'payout_id',
		'payout id',
	],
	disbursement_date: [
		'transmittal payment posted on',
		'disbursement date',
		'disbursement_date',
		'date received',
		'payout_available_on',
	],
	payment_date: [ 'payment date', 'payment_date', 'paid date' ],
	fundraising_page: [
		'fundraiser recipient id',
		'fundraiser_recipient_id',
		'fundraising page',
		'fundraiser page',
		'fundraiser',
	],
	reference_code: [ 'reference code', 'reference_code', 'ref code', 'ref' ],
};

export const TEMPLATE_HEADERS =
	'First Name,Last Name,Email,Phone,Address,City,State,ZIP,Occupation,Employer,Gross Amount,Contribution Date,Source,Payment Method,Check #,Recurring,Election Type,Reporting Status,Notes,Receipt ID,Processing Fee,Disbursement ID,Disbursement Date,Payment Date,Fundraising Page,Reference Code';

export const TEMPLATE_EXAMPLE =
	'Jane,Smith,jane@example.com,,123 Main St,Nashville,TN,37201,Teacher,Metro Schools,250.00,2024-01-15,check,check,1001,N,primary,pending,,,,,,,,';
