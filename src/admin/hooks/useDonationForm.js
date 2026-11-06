import { useState, useEffect } from '@wordpress/element';
import {
	ELECTION_TYPES,
	electionsHidden,
	periodForDate,
	todayISO,
} from '../components/shared';
import { usePeriodFollowsDate } from './usePeriodFollowsDate';
import {
	refundPrefill,
	isRefundEntry,
} from '../components/Donations/refundPrefill';

/**
 * The election a contribution belongs to: the Election set on the filing period
 * that covers the contribution date (Settings → Filing Periods).
 * Returns an empty election when no period covers the date, so the caller asks
 * instead of guessing. A site with elections turned off always gets Local.
 *
 * @param {Array}  periods Filing periods from /filing-periods.
 * @param {string} date    Contribution date, YYYY-MM-DD.
 */
function electionForDate( periods, date ) {
	const fp = periodForDate( periods, date );
	const period = fp?.name || '';
	if ( electionsHidden() ) {
		return { election: 'local', period };
	}
	const election = String( fp?.election_type || '' ).toLowerCase();
	return {
		election: ELECTION_TYPES.includes( election ) ? election : '',
		period,
	};
}

const BLANK_DON = {
	source: 'check',
	first_name: '',
	last_name: '',
	address: '',
	city: '',
	state: '',
	zip: '',
	occupation: '',
	employer: '',
	contribution_date: '',
	date_deposited: '',
	gross_amount: '',
	actblue_fee: '',
	payment_type: 'check',
	check_number: '',
	recurring: false,
	// Deliberately blank. A pre-filled Election or Report Type is the value that
	// gets shipped when someone forgets to look at it, and both decide how the
	// contribution appears on a state filing.
	election_type: '',
	report_type: '',
	reporting_status: 'pending',
	notes: '',
	event_id: '',
	filing_period_id: '',
	fundraising_page: '',
	reference_code: '',
	phone: '',
	email: '',
	donor_type: 'individual',
	org_type: '',
	disbursement_id: '',
	refund_of_id: '',
};

/**
 * The donation form: its values, whether it is an edit or a refund, the election that follows
 * the filing period for a new contribution, and the small rules around the amount fields.
 *
 * @param {Object} options
 * @param {Object} options.donation Donation being edited, or undefined for a new one.
 * @param {Object} options.initData Starting values for a new one (a refund prefilled from a row).
 * @param {Array}  options.periods  Filing periods from /filing-periods.
 * @return {Object} form, set, isEdit, isRefund, followsPeriod, fromPeriod, setElectionTouched, applyDonor, applyOriginal, autoFee.
 */
export function useDonationForm( { donation, initData, periods } ) {
	const [ form, setForm ] = useState( () => ( {
		...BLANK_DON,
		contribution_date: todayISO(),
		...( donation || initData ),
	} ) );
	// A new contribution takes the election of the filing period its date falls
	// in, until someone picks one by hand. Edits and refunds keep what they have.
	const [ electionTouched, setElectionTouched ] = useState( false );
	const fromPeriod = electionForDate( periods, form.contribution_date );
	const isEdit = !! donation?.id;
	const isRefund = isRefundEntry( form );
	const followsPeriod = ! isEdit && ! electionTouched && ! form.refund_of_id;
	useEffect( () => {
		if ( ! followsPeriod ) {
			return;
		}
		setForm( ( f ) =>
			f.election_type === fromPeriod.election
				? f
				: { ...f, election_type: fromPeriod.election }
		);
	}, [ followsPeriod, fromPeriod.election ] );

	// Copy a donor found by the lookup into the form.
	const applyDonor = ( d ) => {
		setForm( ( f ) => ( {
			...f,
			first_name: d.first_name || '',
			last_name: d.last_name || '',
			address: d.address || '',
			city: d.city || '',
			state: d.state || '',
			zip: d.zip || '',
			occupation: d.occupation || '',
			employer: d.employer || '',
			email: d.email || '',
			phone: d.phone || '',
			donor_type: d.donor_type || 'individual',
			org_type: d.org_type || '',
		} ) );
	};

	// Turn the form into a refund of a donation found by the search, filled as the Refund button on its row would.
	const applyOriginal = ( d ) => {
		setForm( ( f ) => ( { ...f, ...refundPrefill( d ) } ) );
	};

	const set = ( k, v ) => setForm( ( f ) => ( { ...f, [ k ]: v } ) );

	// The filing period follows the contribution date, unless it was picked by hand or the donation is filed.
	usePeriodFollowsDate( {
		date: form.contribution_date,
		periods,
		periodId: form.filing_period_id,
		setPeriodId: ( id ) => set( 'filing_period_id', id ),
		enabled: 'filed' !== form.reporting_status,
	} );

	const autoFee = ( v ) => {
		const gross = parseFloat( v ) || 0;
		if ( form.source === 'actblue' && ! form.actblue_fee ) {
			set( 'actblue_fee', ( gross * 0.0395 ).toFixed( 2 ) );
		}
	};

	return {
		form,
		set,
		isEdit,
		isRefund,
		followsPeriod,
		fromPeriod,
		setElectionTouched,
		applyDonor,
		applyOriginal,
		autoFee,
	};
}
