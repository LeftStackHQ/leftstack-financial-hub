import { useState } from '@wordpress/element';

/**
 * The Dashboard's filter: either a filing period or a date range, never both. Choosing one
 * clears the other.
 *
 * @return {Object} period, fDateFrom, fDateTo, fDateLabel and selectPeriod, applyDates, clearDates, clearAll.
 */
export function useDashboardFilter() {
	const [ period, setPeriod ] = useState( '' );
	const [ fDateFrom, setFDateFrom ] = useState( '' );
	const [ fDateTo, setFDateTo ] = useState( '' );
	const [ fDateLabel, setFDateLabel ] = useState( '' );

	const selectPeriod = ( id ) => {
		setPeriod( id );
		setFDateFrom( '' );
		setFDateTo( '' );
		setFDateLabel( '' );
	};
	const applyDates = ( from, to, label ) => {
		setFDateFrom( from );
		setFDateTo( to );
		setFDateLabel( label );
		setPeriod( '' );
	};
	const clearDates = () => {
		setFDateFrom( '' );
		setFDateTo( '' );
		setFDateLabel( '' );
	};
	const clearAll = () => {
		setPeriod( '' );
		clearDates();
	};

	return {
		period,
		fDateFrom,
		fDateTo,
		fDateLabel,
		selectPeriod,
		applyDates,
		clearDates,
		clearAll,
	};
}
