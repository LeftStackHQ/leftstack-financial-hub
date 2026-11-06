import { useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { fmtC } from '../shared';
import { useOriginalSearch } from '../../hooks/useOriginalSearch';

/**
 * How many gifts in the list share the donor, the amount and the day of this one. Two $25 gifts from one donor on one
 * day look the same on a refund screen, so the person is told to tell them apart by the receipt number.
 *
 * @param {Object[]} rows The matches.
 * @param {Object}   row  One of them.
 * @return {number} How many gifts in the list look like this one, itself included.
 */
function lookAlikes( rows, row ) {
	const key = ( r ) =>
		[
			r.first_name,
			r.last_name,
			Number( r.gross_amount ),
			r.contribution_date,
		].join( '|' );
	return rows.filter( ( r ) => key( r ) === key( row ) ).length;
}

/**
 * Search for the donation a refund is for by name, order number or amount, and pick it. Picking one fills the refund
 * the same way the Refund button on a row does.
 *
 * @param {Object}   props
 * @param {Function} props.onPick    Called with the chosen donation.
 * @param {boolean}  props.collapsed Start as a quiet prompt that opens the search, for a form that is not yet a refund.
 */
export function RefundOriginalFinder( { onPick, collapsed = false } ) {
	const [ query, setQuery ] = useState( '' );
	const [ open, setOpen ] = useState( ! collapsed );
	const { results, searching } = useOriginalSearch( query );
	const typed = query.trim().length >= 2;
	if ( ! open ) {
		return (
			<div className="lsfh-field">
				<button
					type="button"
					className="btn btn-ghost btn-sm"
					onClick={ () => setOpen( true ) }
				>
					{ __(
						'Refunding a gift? Find the original',
						'leftstack-financial-hub'
					) }
				</button>
			</div>
		);
	}
	return (
		<div className="lsfh-field">
			<label htmlFor="lsfh-refund-find-original">
				{ __( 'Find the original', 'leftstack-financial-hub' ) }
			</label>
			<input
				id="lsfh-refund-find-original"
				type="text"
				className="lsfh-input"
				autoComplete="off"
				placeholder={ __(
					'Donor name, order number or amount',
					'leftstack-financial-hub'
				) }
				value={ query }
				onChange={ ( e ) => setQuery( e.target.value ) }
			/>
			{ typed && ! searching && 0 === results.length && (
				<p className="lsfh-meta">
					{ __( 'No gift matches.', 'leftstack-financial-hub' ) }
				</p>
			) }
			{ results.map( ( r ) => {
				const twins = lookAlikes( results, r );
				return (
					<div key={ r.id } className="lsfh-original-result">
						<div className="lsfh-original-match">
							<strong>
								{ 'organization' === r.donor_type
									? r.first_name
									: `${ r.first_name } ${ r.last_name }` }
							</strong>
							<span className="lsfh-meta">
								{ fmtC( r.gross_amount ) } ·{ ' ' }
								{ r.contribution_date }
								{ r.actblue_id
									? ` · ${ sprintf(
											/* translators: %s: the receipt or order number of a gift. */
											__(
												'receipt %s',
												'leftstack-financial-hub'
											),
											r.actblue_id
									  ) }`
									: '' }
							</span>
							<button
								type="button"
								className="btn btn-ghost btn-sm"
								onClick={ () => {
									onPick( r );
									setQuery( '' );
								} }
							>
								{ __(
									'Use this one',
									'leftstack-financial-hub'
								) }
							</button>
						</div>
						{ twins > 1 && (
							<span className="badge badge-gold">
								{ sprintf(
									/* translators: %d: how many gifts look the same. */
									_n(
										'%d gift looks the same',
										'%d gifts look the same: check the receipt number',
										twins,
										'leftstack-financial-hub'
									),
									twins
								) }
							</span>
						) }
					</div>
				);
			} ) }
		</div>
	);
}
