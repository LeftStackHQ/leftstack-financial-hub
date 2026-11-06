import { todayISO } from '../shared';

/**
 * Whether an entry is a refund: a negative amount, or a link to the donation it refunds. Works on a row of
 * /donations and on the donation form, whose amount is still text.
 *
 * @param {Object} d Anything with gross_amount and refund_of_id.
 * @return {boolean} True for a refund.
 */
export function isRefundEntry( d ) {
	return parseFloat( d.gross_amount ) < 0 || !! d.refund_of_id;
}

/**
 * The starting values of a refund of one donation, used by the Refund button on a row and by the "find the original"
 * search in the donation form, so both fill a refund the same way.
 *
 * A refund keeps the original's date, so it lands in the original's filing period and amends it. The filing period
 * is left blank on purpose: it is chosen at filing time by setting it on the disbursement, which passes it on to
 * every donation linked to it, so a guess here would only be overwritten.
 *
 * The fee is a credit only for ActBlue, which returns its fee on a refund. Other processors may keep it (Democracy
 * Engine did), so the fee starts at 0 for them and the person checks the bank deposit.
 *
 * @param {Object} d The original donation (a row of /donations).
 * @return {Object} Form values for a refund of it.
 */
export function refundPrefill( d ) {
	const amount = Math.abs( parseFloat( d.gross_amount || 0 ) );
	let fee = '0';
	if ( 'actblue' === d.source ) {
		fee = d.actblue_fee
			? String( Math.abs( parseFloat( d.actblue_fee ) ) )
			: '';
	}
	return {
		source: d.source,
		first_name: d.first_name,
		last_name: d.last_name,
		donor_type: d.donor_type || 'individual',
		org_type: d.org_type || '',
		address: d.address || '',
		city: d.city || '',
		state: d.state || '',
		zip: d.zip || '',
		occupation: d.occupation || '',
		employer: d.employer || '',
		gross_amount: String( -amount ),
		actblue_fee: fee,
		payment_type: d.payment_type,
		election_type: d.election_type,
		report_type: d.report_type,
		filing_period_id: '',
		contribution_date: d.contribution_date || todayISO(),
		refund_of_id: String( d.id ),
	};
}
