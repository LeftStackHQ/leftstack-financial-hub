import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { fmtDate } from '../shared';
import { BankAmount } from './BankAmount';

/**
 * A list of items to pick from, with a search box. Used for bank lines and for Hub records.
 *
 * @param {Object}   props
 * @param {string}   props.name     Short name used in element ids, such as bank or hub.
 * @param {string}   props.title    Heading, such as "Bank lines".
 * @param {Object[]} props.items    Items: id, date, amount, and text (what to show).
 * @param {string[]} props.picked   Ids picked.
 * @param {Function} props.onToggle Called with an id.
 */
export function BankPickList( { name, title, items, picked, onToggle } ) {
	const [ search, setSearch ] = useState( '' );
	const needle = search.trim().toLowerCase();
	const shown = items.filter(
		( item ) =>
			! needle ||
			picked.includes( item.id ) ||
			item.text.toLowerCase().includes( needle ) ||
			item.amount.toFixed( 2 ).includes( needle.replace( /[$,]/g, '' ) )
	);
	return (
		<section className="lsfh-bank-pick" aria-label={ title }>
			<h4>{ title }</h4>
			<input
				className="lsfh-input"
				type="search"
				aria-label={ __(
					'Search this list',
					'leftstack-financial-hub'
				) }
				placeholder={ __(
					'Search by name or amount',
					'leftstack-financial-hub'
				) }
				value={ search }
				onChange={ ( e ) => setSearch( e.target.value ) }
			/>
			<ul className="lsfh-bank-pick__list">
				{ shown.map( ( item ) => (
					<li key={ item.id }>
						<label htmlFor={ `${ name }-${ item.id }` }>
							<input
								id={ `${ name }-${ item.id }` }
								type="checkbox"
								checked={ picked.includes( item.id ) }
								onChange={ () => onToggle( item.id ) }
							/>
							<span className="lsfh-bank-item__date">
								{ fmtDate( item.date ) }
							</span>
							<span className="lsfh-bank-item__text">
								{ item.text }
							</span>
							<BankAmount amount={ item.amount } direction />
						</label>
					</li>
				) ) }
				{ ! shown.length && (
					<li className="lsfh-meta">
						{ __( 'Nothing found.', 'leftstack-financial-hub' ) }
					</li>
				) }
			</ul>
		</section>
	);
}
