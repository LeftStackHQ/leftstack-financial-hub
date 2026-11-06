import { __, _n, sprintf } from '@wordpress/i18n';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { fmtC } from '../shared';
import { IN, directionOf, directionLabel } from './direction';

/**
 * A small arrow that says which way money moved: into the bank or out of it.
 *
 * @param {Object} props
 * @param {number} props.amount Dollars; negative is money out.
 */
export function BankDirectionMark( { amount } ) {
	const direction = directionOf( amount );
	const Arrow = IN === direction ? ArrowDownLeft : ArrowUpRight;
	return (
		<span
			className="lsfh-bank-dir"
			role="img"
			aria-label={ directionLabel( direction ) }
			title={ directionLabel( direction ) }
		>
			<Arrow size={ 14 } />
		</span>
	);
}

/**
 * What a Money in or Money out section holds: how many, and what they add up to.
 *
 * @param {Object} group A group from splitByDirection().
 * @return {string} For example "3 items, $120.00".
 */
const groupSummary = ( group ) =>
	sprintf(
		/* translators: 1: how many items, 2: their total in dollars. */
		_n(
			'%1$d item, %2$s',
			'%1$d items, %2$s',
			group.items.length,
			'leftstack-financial-hub'
		),
		group.items.length,
		fmtC( group.total )
	);

/**
 * A heading row inside a table that starts a Money in or Money out section.
 *
 * @param {Object} props
 * @param {Object} props.group   A group from splitByDirection().
 * @param {number} props.colSpan How many columns the table has.
 */
export function BankDirectionRow( { group, colSpan } ) {
	return (
		<tr className={ `lsfh-bank-direction-row is-${ group.direction }` }>
			<th scope="colgroup" colSpan={ colSpan }>
				<BankDirectionMark amount={ IN === group.direction ? 1 : -1 } />{ ' ' }
				{ directionLabel( group.direction ) }
				<span className="lsfh-meta"> · { groupSummary( group ) }</span>
			</th>
		</tr>
	);
}

/**
 * A heading above a list of cards that starts a Money in or Money out section.
 *
 * @param {Object} props
 * @param {Object} props.group A group from splitByDirection().
 */
export function BankDirectionHeading( { group } ) {
	return (
		<h4 className={ `lsfh-bank-direction is-${ group.direction }` }>
			<BankDirectionMark amount={ IN === group.direction ? 1 : -1 } />{ ' ' }
			{ directionLabel( group.direction ) }
			<span className="lsfh-meta"> · { groupSummary( group ) }</span>
		</h4>
	);
}

/**
 * Buttons that show all matches, only money in, or only money out.
 *
 * @param {Object}   props
 * @param {string}   props.value    '' for all, or IN or OUT.
 * @param {Function} props.onChange Called with the new value.
 */
export function BankDirectionFilter( { value, onChange } ) {
	const choices = [
		[ '', __( 'All', 'leftstack-financial-hub' ) ],
		[ IN, directionLabel( IN ) ],
		[ 'out', directionLabel( 'out' ) ],
	];
	return (
		<div
			className="lsfh-bank-filter"
			role="group"
			aria-label={ __( 'Show', 'leftstack-financial-hub' ) }
		>
			{ choices.map( ( [ key, label ] ) => (
				<button
					key={ key }
					type="button"
					className={ `btn btn-sm ${
						value === key ? 'btn-primary' : 'btn-ghost'
					}` }
					aria-pressed={ value === key }
					onClick={ () => onChange( key ) }
				>
					{ label }
				</button>
			) ) }
		</div>
	);
}
