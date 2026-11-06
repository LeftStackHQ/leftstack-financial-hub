import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useBankManualMatch } from '../../hooks/useBankManualMatch';
import { BankPickList } from './BankPickList';
import { BankAmount } from './BankAmount';
import { BankFillDatesOption } from './BankFillDatesOption';
import { recordKind } from './reasons';

const byDateNewestFirst = ( a, b ) => ( a.date < b.date ? 1 : -1 );

/**
 * The pop-up for matching by hand: pick bank lines on one side and Hub records on the other, watch the
 * running difference, and confirm when it is $0.00 or with a written reason.
 *
 * @param {Object}   props
 * @param {Object}   props.bank        Open bank lines by id.
 * @param {Object}   props.hub         Open Hub records by id.
 * @param {string[]} props.startBank   Bank line ids picked at the start.
 * @param {string[]} props.startHub    Hub record ids picked at the start (and listed first).
 * @param {boolean}  props.fillDates   Whether confirming fills blank dates from the bank.
 * @param {Function} props.onFillDates Called with the new value of that option.
 * @param {Function} props.onConfirm   Called with the group to save; resolves to an error message or ''.
 * @param {Function} props.onClose     Closes the pop-up.
 */
export function BankManualMatchModal( {
	fillDates,
	onFillDates,
	bank,
	hub,
	startBank,
	startHub,
	onConfirm,
	onClose,
} ) {
	const match = useBankManualMatch( { bank, hub, startBank, startHub } );
	const [ problem, setProblem ] = useState( '' );
	const [ saving, setSaving ] = useState( false );

	const bankItems = Object.values( bank )
		.sort( byDateNewestFirst )
		.map( ( line ) => ( { ...line, text: line.description } ) );
	const hubItems = Object.values( hub )
		.sort(
			( a, b ) =>
				Number( startHub.includes( b.id ) ) -
					Number( startHub.includes( a.id ) ) ||
				byDateNewestFirst( a, b )
		)
		.map( ( record ) => ( {
			...record,
			text: `${ recordKind( record.type ) }${
				record.label ? `, ${ record.label }` : ''
			}`,
		} ) );

	const confirm = async () => {
		setSaving( true );
		const message = await onConfirm( [
			{
				bank: match.bankPicked,
				hub: match.hubPicked,
				tier: 'manual',
				reason: '',
				note: match.note.trim(),
			},
		] );
		setSaving( false );
		if ( message ) {
			setProblem( message );
		} else {
			onClose();
		}
	};

	return (
		<div id="lsfh-modal-backdrop">
			<div
				className="lsfh-modal wide"
				role="dialog"
				aria-modal="true"
				aria-label={ __( 'Match by hand', 'leftstack-financial-hub' ) }
			>
				<div className="lsfh-modal-header">
					<span>
						{ __( 'Match by hand', 'leftstack-financial-hub' ) }
					</span>
					<button
						className="lsfh-icon-btn"
						onClick={ onClose }
						aria-label={ __( 'Close', 'leftstack-financial-hub' ) }
					>
						✕
					</button>
				</div>
				<div className="lsfh-bank-pick-grid">
					<BankPickList
						name="lsfh-bank-pick-bank"
						title={ __( 'Bank lines', 'leftstack-financial-hub' ) }
						items={ bankItems }
						picked={ match.bankPicked }
						onToggle={ match.toggleBank }
					/>
					<BankPickList
						name="lsfh-bank-pick-hub"
						title={ __( 'Hub records', 'leftstack-financial-hub' ) }
						items={ hubItems }
						picked={ match.hubPicked }
						onToggle={ match.toggleHub }
					/>
				</div>
				<div className="lsfh-bank-totals" aria-live="polite">
					<div>
						<span className="lsfh-meta">
							{ __( 'Bank selected', 'leftstack-financial-hub' ) }
						</span>
						<BankAmount amount={ match.bankCents / 100 } />
					</div>
					<div>
						<span className="lsfh-meta">
							{ __( 'Hub selected', 'leftstack-financial-hub' ) }
						</span>
						<BankAmount amount={ match.hubCents / 100 } />
					</div>
					<div>
						<span className="lsfh-meta">
							{ __( 'Difference', 'leftstack-financial-hub' ) }
						</span>
						<BankAmount amount={ match.differenceCents / 100 } />
					</div>
				</div>
				{ 0 !== match.differenceCents &&
					match.bankPicked.length > 0 &&
					match.hubPicked.length > 0 && (
						<div className="lsfh-field">
							<label
								htmlFor="lsfh-bank-note"
								className="lsfh-label"
							>
								{ __(
									'Why do they differ? This is recorded as a known difference.',
									'leftstack-financial-hub'
								) }
							</label>
							<input
								id="lsfh-bank-note"
								className="lsfh-input"
								maxLength={ 255 }
								value={ match.note }
								onChange={ ( e ) =>
									match.setNote( e.target.value )
								}
							/>
						</div>
					) }
				<BankFillDatesOption
					checked={ fillDates }
					onChange={ onFillDates }
				/>
				{ problem && (
					<div className="lsfh-import-error" role="alert">
						{ problem }
					</div>
				) }
				<div className="lsfh-edit-footer">
					<button
						className="btn btn-primary"
						disabled={ ! match.canConfirm || saving }
						onClick={ confirm }
					>
						{ __( 'Confirm match', 'leftstack-financial-hub' ) }
					</button>
					<button className="btn btn-ghost" onClick={ onClose }>
						{ __( 'Cancel', 'leftstack-financial-hub' ) }
					</button>
				</div>
			</div>
		</div>
	);
}
