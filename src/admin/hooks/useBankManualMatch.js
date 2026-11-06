import { useState, useMemo, useCallback } from '@wordpress/element';

const cents = ( amount ) => Math.round( amount * 100 );

const toggled = ( list, id ) =>
	list.includes( id ) ? list.filter( ( x ) => x !== id ) : [ ...list, id ];

/**
 * A match made by hand: which bank lines and Hub records are picked, what they add up to, and whether
 * the match can be confirmed (the sides agree to the cent, or a reason is given).
 *
 * @param {Object}   options
 * @param {Object}   options.bank      Open bank lines by id.
 * @param {Object}   options.hub       Open Hub records by id.
 * @param {string[]} options.startBank Bank line ids picked when the screen opens.
 * @param {string[]} options.startHub  Hub record ids picked when the screen opens.
 * @return {Object} bankPicked, hubPicked, toggleBank(id), toggleHub(id), bankCents, hubCents, differenceCents,
 *                  note, setNote(text) and canConfirm.
 */
export function useBankManualMatch( { bank, hub, startBank, startHub } ) {
	const [ bankPicked, setBankPicked ] = useState( startBank );
	const [ hubPicked, setHubPicked ] = useState( startHub );
	const [ note, setNote ] = useState( '' );

	const bankCents = useMemo(
		() =>
			bankPicked.reduce(
				( sum, id ) => sum + cents( bank[ id ].amount ),
				0
			),
		[ bankPicked, bank ]
	);
	const hubCents = useMemo(
		() =>
			hubPicked.reduce(
				( sum, id ) => sum + cents( hub[ id ].amount ),
				0
			),
		[ hubPicked, hub ]
	);
	const differenceCents = bankCents - hubCents;

	return {
		bankPicked,
		hubPicked,
		toggleBank: useCallback(
			( id ) => setBankPicked( ( list ) => toggled( list, id ) ),
			[]
		),
		toggleHub: useCallback(
			( id ) => setHubPicked( ( list ) => toggled( list, id ) ),
			[]
		),
		bankCents,
		hubCents,
		differenceCents,
		note,
		setNote,
		canConfirm:
			bankPicked.length > 0 &&
			hubPicked.length > 0 &&
			( 0 === differenceCents || '' !== note.trim() ),
	};
}
