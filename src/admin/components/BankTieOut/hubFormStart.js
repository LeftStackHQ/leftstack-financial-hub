// Starting values for the add-expense and add-donation forms, taken from a bank line, so adding what the bank
// shows is a matter of filling in who it was for or from.

/**
 * What a payment out probably was, from its bank description.
 *
 * @param {Object} line Bank line: description and check_number.
 * @return {string} A payment method the expense form knows: check, debit or transfer.
 */
function methodFor( line ) {
	if ( line.check_number ) {
		return 'check';
	}
	return /PURCHASE|VISA|DEBIT CARD/i.test( line.description )
		? 'debit'
		: 'transfer';
}

/**
 * What a payment in probably was, from its bank description.
 *
 * @param {string} description The bank's description.
 * @return {string} A payment type the donation form knows: check, cash, wire or other.
 */
function paymentTypeFor( description ) {
	if ( /CHECK/i.test( description ) ) {
		return 'check';
	}
	if ( /WIRE/i.test( description ) ) {
		return 'wire';
	}
	return /TRANSFER DEPOSIT|CASH/i.test( description ) ? 'cash' : 'other';
}

/**
 * Starting values for the expense form from a payment that left the bank. The bank's date is both the date of the
 * payment and the date it posted, so the new expense pairs with its bank line at once.
 *
 * @param {Object} line Bank line: date, amount (negative), description, check_number.
 * @return {Object} Values for the expense form.
 */
export function expenseStart( line ) {
	return {
		expense_date: line.date,
		date_posted: line.date,
		amount: String( Math.abs( line.amount ) ),
		payment_method: methodFor( line ),
		check_number: line.check_number || '',
		description: line.description,
	};
}

/**
 * Starting values for the donation form from a deposit that reached the bank.
 *
 * @param {Object} line Bank line: date, amount (positive), description.
 * @return {Object} Values for the donation form.
 */
export function donationStart( line ) {
	return {
		contribution_date: line.date,
		date_deposited: line.date,
		gross_amount: String( line.amount ),
		payment_type: paymentTypeFor( line.description ),
	};
}
