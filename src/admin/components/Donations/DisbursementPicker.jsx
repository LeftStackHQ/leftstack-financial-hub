import { useState } from '@wordpress/element';
import { fmtC } from '../shared';

/* ─────────────── Add / Edit Modal ─────────────────────────── */
const MONTH_NAMES = [
	'january',
	'february',
	'march',
	'april',
	'may',
	'june',
	'july',
	'august',
	'september',
	'october',
	'november',
	'december',
];

/**
 * Search-as-you-type picker for a payout. A plain dropdown is unusable once
 * there are dozens of payouts, so this matches on payout ID, bank reference,
 * date, month name or net amount.
 *
 * @param {Object}   props
 * @param {string}   props.id          Input id.
 * @param {string}   props.value       Selected disbursement_id, or ''.
 * @param {Function} props.onChange    Called with the chosen disbursement_id.
 * @param {Array}    props.options     Disbursement rows from /disbursements.
 * @param {number}   props.refundNet   Net effect of the refund on the payout.
 * @param {string}   props.inheritedId Payout the refund stays with if none is chosen.
 */
export function DisbursementPicker( {
	id,
	value,
	onChange,
	options,
	refundNet,
	inheritedId,
} ) {
	const [ query, setQuery ] = useState( '' );
	const [ open, setOpen ] = useState( false );
	const selected = options.find( ( o ) => o.disbursement_id === value );
	const q = query.trim().toLowerCase().replace( /[$,]/g, '' );
	const haystack = ( o ) =>
		[
			o.disbursement_id,
			o.disbursement_date,
			MONTH_NAMES[
				parseInt( String( o.disbursement_date ).slice( 5, 7 ), 10 ) - 1
			],
			o.bank_reference,
			Number( o.live_net ).toFixed( 2 ),
		]
			.join( ' ' )
			.toLowerCase();
	const matches = options
		.filter( ( o ) => ! q || haystack( o ).includes( q ) )
		.slice( 0, 8 );
	const choose = ( o ) => {
		onChange( o.disbursement_id );
		setQuery( '' );
		setOpen( false );
	};

	if ( value ) {
		const net = selected ? Number( selected.live_net ) : null;
		return (
			<div className="lsfh-disb-picked">
				<div
					style={ {
						display: 'flex',
						gap: 8,
						alignItems: 'center',
						flexWrap: 'wrap',
					} }
				>
					<strong>{ selected?.bank_reference || value }</strong>
					{ selected && (
						<span style={ { color: 'var(--muted)' } }>
							{ selected.disbursement_date || 'no date' } ·{ ' ' }
							{ fmtC( net ) } net
							{ selected.bank_reference
								? ` · payout ${ value }`
								: '' }
						</span>
					) }
					<button
						type="button"
						className="btn btn-ghost btn-sm"
						onClick={ () => onChange( '' ) }
					>
						Change
					</button>
				</div>
				{ net !== null && refundNet < 0 && (
					<div
						style={ {
							fontSize: 'var(--fs-sm)',
							color: 'var(--muted)',
							marginTop: 4,
						} }
					>
						Nets { fmtC( net ) } now. With this refund:{ ' ' }
						<strong>{ fmtC( net + refundNet ) }</strong>. Match that
						to your bank.
					</div>
				) }
			</div>
		);
	}

	return (
		<div style={ { position: 'relative' } }>
			<input
				id={ id }
				type="text"
				className="lsfh-input"
				autoComplete="off"
				placeholder="Search by Direct Deposit number, payout ID, date, month or amount"
				value={ query }
				onChange={ ( e ) => {
					setQuery( e.target.value );
					setOpen( true );
				} }
				onFocus={ () => setOpen( true ) }
				onKeyDown={ ( e ) => {
					if ( e.key === 'Enter' ) {
						e.preventDefault();
						if ( matches[ 0 ] ) {
							choose( matches[ 0 ] );
						}
					} else if ( e.key === 'Escape' ) {
						setOpen( false );
					}
				} }
			/>
			{ open && (
				<div
					role="listbox"
					style={ {
						position: 'absolute',
						left: 0,
						right: 0,
						zIndex: 20,
						background: 'var(--white, #fff)',
						border: '1px solid var(--border, #d6dbe1)',
						borderRadius: 'var(--radius-sm)',
						boxShadow: '0 6px 18px rgba(0,0,0,.12)',
						maxHeight: 260,
						overflowY: 'auto',
					} }
				>
					{ matches.length === 0 && (
						<div style={ { padding: 10, color: 'var(--muted)' } }>
							No payout matches.
						</div>
					) }
					{ matches.map( ( o ) => (
						<button
							key={ o.disbursement_id }
							type="button"
							role="option"
							className="btn btn-ghost"
							style={ {
								display: 'block',
								width: '100%',
								textAlign: 'left',
								borderRadius: 0,
							} }
							onClick={ () => choose( o ) }
						>
							<strong>
								{ o.bank_reference || o.disbursement_id }
							</strong>{ ' ' }
							· { o.disbursement_date || 'no date' } ·{ ' ' }
							{ fmtC( o.live_net ) } net
							{ o.bank_reference
								? ` · payout ${ o.disbursement_id }`
								: '' }
						</button>
					) ) }
				</div>
			) }
			<div
				style={ {
					fontSize: 'var(--fs-sm)',
					color: 'var(--alert)',
					marginTop: 4,
				} }
			>
				Nothing chosen: the refund stays with the original&apos;s payout
				{ inheritedId ? ` (${ inheritedId })` : '' }, so it will not
				change the payout your bank reduced.
			</div>
		</div>
	);
}
