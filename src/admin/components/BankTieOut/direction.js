import { __ } from '@wordpress/i18n';

export const IN = 'in';
export const OUT = 'out';

/**
 * Which way money moves: a negative amount leaves the bank, anything else comes in.
 *
 * @param {number} amount Dollars, negative for money out.
 * @return {string} IN or OUT.
 */
export const directionOf = ( amount ) => ( amount < 0 ? OUT : IN );

/**
 * The words for a direction.
 *
 * @param {string} direction IN or OUT.
 * @return {string} Money in, or Money out.
 */
export const directionLabel = ( direction ) =>
	IN === direction
		? __( 'Money in', 'leftstack-financial-hub' )
		: __( 'Money out', 'leftstack-financial-hub' );

/**
 * What a match or to-do moves: the bank lines it holds added up, or, when it has none, its Hub records.
 *
 * @param {Object} item Anything with bank (line ids) and hub (record ids).
 * @param {Object} bank Bank lines by id.
 * @param {Object} hub  Hub records by id.
 * @return {number} Dollars, negative for money out.
 */
export const itemAmount = ( item, bank, hub ) => {
	const sum = ( ids, from ) =>
		ids.reduce( ( n, id ) => n + ( from[ id ]?.amount ?? 0 ), 0 );
	return item.bank.length ? sum( item.bank, bank ) : sum( item.hub, hub );
};

/**
 * Sort items into Money in and Money out, in that order, leaving out a direction that has none.
 *
 * @param {Object[]} items    The items.
 * @param {Function} amountOf Gives an item's amount in dollars (negative is out).
 * @return {Object[]} Groups: direction, items, and total (dollars, always positive).
 */
export function splitByDirection( items, amountOf ) {
	return [ IN, OUT ]
		.map( ( direction ) => {
			const own = items.filter(
				( item ) => directionOf( amountOf( item ) ) === direction
			);
			return {
				direction,
				items: own,
				total: Math.abs(
					own.reduce( ( n, item ) => n + amountOf( item ), 0 )
				),
			};
		} )
		.filter( ( group ) => group.items.length );
}
