// What the CSV import for expenditures reads and where it sends it.
const FIELDS = [
	{ key: 'expense_date', label: 'Date', req: false },
	{ key: 'payee', label: 'Payee', req: true },
	{ key: 'address', label: 'Address', req: false },
	{ key: 'category_name', label: 'Category', req: false },
	{ key: 'description', label: 'Description', req: false },
	{ key: 'amount', label: 'Amount', req: true },
	{ key: 'payment_method', label: 'Method', req: false },
	{ key: 'check_number', label: 'Check #', req: false },
	{ key: 'balanced', label: 'Balanced (Y/N)', req: false },
	{ key: 'notes', label: 'Notes/Comments', req: false },
	{ key: 'paid_by', label: 'Paid By', req: false },
];
const ALIASES = {
	expense_date: [ 'date', 'expense date', 'expense_date' ],
	payee: [ 'payee', 'vendor', 'to', 'recipient' ],
	address: [ 'address' ],
	category_name: [
		'expense',
		'category',
		'category name',
		'expense category',
	],
	description: [ 'description', 'memo', 'detail', 'details' ],
	amount: [ 'amount', 'total', 'cost', 'expense amount', 'amt' ],
	payment_method: [
		'method of payment',
		'payment method',
		'method',
		'payment type',
	],
	check_number: [
		'check #',
		'check no',
		'check number',
		'check',
		'chk #',
		'chk no',
	],
	balanced: [
		'balanced',
		'balanced (y/n)',
		'balanced to bank stmt',
		'balanced to bank statement',
		'reconciled',
		'cleared',
	],
	notes: [ 'comment', 'comments', 'notes', 'note' ],
	paid_by: [ 'paid by', 'paid_by', 'payer' ],
};

export const EXPENDITURE_IMPORT = {
	title: 'Import Expenditures',
	recognized:
		'Recognized columns: Date, Payee, Amount, Category, Method of Payment, Check #, Balanced, Comment, Paid By.',
	endpoint: '/import/expenditures',
	idPrefix: 'expenditures',
	fields: FIELDS,
	aliases: ALIASES,
};
