// What the CSV import for in-kind contributions reads and where it sends it.
const FIELDS = [
	{ key: 'donation_date', label: 'Date', req: false },
	{ key: 'donor_name', label: 'Donor Name', req: true },
	{ key: 'address', label: 'Address', req: false },
	{ key: 'occupation', label: 'Occupation', req: false },
	{ key: 'employer', label: 'Employer', req: false },
	{ key: 'description', label: 'Description', req: false },
	{ key: 'value', label: 'Fair Market Value', req: true },
	{ key: 'fec_report_date', label: 'FEC Report Date', req: false },
	{ key: 'notes', label: 'Notes', req: false },
];
const ALIASES = {
	donation_date: [ 'date', 'donation date', 'donation_date' ],
	donor_name: [ 'donor name', 'donor', 'name', 'donor_name' ],
	address: [ 'address' ],
	occupation: [ 'occupation' ],
	employer: [ 'employer' ],
	description: [
		'description',
		'description of goods/services',
		'goods/services',
		'memo',
	],
	value: [ 'value', 'fair market value', 'fmv', 'amount' ],
	fec_report_date: [
		'fec report date',
		'fec date',
		'fec_report_date',
		'report date',
	],
	notes: [ 'notes', 'note', 'comment', 'comments' ],
};

export const INKIND_IMPORT = {
	title: 'Import In-Kind Donations',
	recognized:
		'Recognized columns: Date, Donor Name, Address, Occupation, Employer, Description, Value, FEC Report Date, Notes.',
	endpoint: '/import/inkind',
	idPrefix: 'inkind',
	fields: FIELDS,
	aliases: ALIASES,
};
