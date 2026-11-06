import { useEffect, useRef } from '@wordpress/element';
import { periodForDate } from '../components/shared';

/**
 * Keeps a form's filing period in step with its date. When the date changes, the period moves to the one
 * that covers the new date (or is cleared when none does), but only if the form was following the date:
 * its period was empty, or was the one that covered the old date. A period someone picked by hand stays.
 * The first time it runs, a period the form already has is left alone, and one is only filled in if the
 * form had none.
 *
 * @param {Object}   options
 * @param {string}   options.date        The form's date, YYYY-MM-DD.
 * @param {Array}    options.periods     Filing periods from /filing-periods.
 * @param {string}   options.periodId    The form's current filing period id.
 * @param {Function} options.setPeriodId Sets the form's filing period id.
 * @param {boolean}  options.enabled     False to leave the period alone (a filed record keeps its period).
 */
export function usePeriodFollowsDate( {
	date,
	periods,
	periodId,
	setPeriodId,
	enabled = true,
} ) {
	const lastDate = useRef( null );
	// The latest period id and setter, so the effect below reacts only to the date and the
	// periods and still never works from a stale copy of the form.
	const latest = useRef( { periodId, setPeriodId } );
	useEffect( () => {
		latest.current = { periodId, setPeriodId };
	} );

	useEffect( () => {
		if ( ! enabled || ! date || ! periods.length ) {
			return;
		}
		const match = periodForDate( periods, date );
		const { periodId: current, setPeriodId: apply } = latest.current;
		const before = lastDate.current;
		lastDate.current = date;
		if ( before === null ) {
			if ( ! current && match ) {
				apply( String( match.id ) );
			}
			return;
		}
		const was = periodForDate( periods, before );
		if ( current && String( was?.id ?? '' ) !== String( current ) ) {
			return;
		}
		apply( match ? String( match.id ) : '' );
	}, [ date, periods, enabled ] );
}
