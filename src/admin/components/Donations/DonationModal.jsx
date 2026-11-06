import { useState } from '@wordpress/element';
import { apiSend, overLimitText } from '../shared';
import { useDonationForm } from '../../hooks/useDonationForm';
import { useRefundLookups } from '../../hooks/useRefundLookups';
import { useDonorAutofill } from '../../hooks/useDonorAutofill';
import { DonationDonorSection } from './DonationDonorSection';
import { DonationAmountSection } from './DonationAmountSection';
import { RefundOriginalFinder } from './RefundOriginalFinder';
import { DonationElectionSection } from './DonationElectionSection';

const PAYMENT_TYPES = [
	'actblue',
	'check',
	'cash',
	'money_order',
	'wire',
	'other',
];

const PAYMENT_LABELS = {
	actblue: 'ActBlue',
	check: 'Check',
	cash: 'Cash',
	money_order: 'Money Order',
	wire: 'Wire',
	other: 'Other',
};

export function DonationModal( {
	donation,
	initData,
	periods,
	onClose,
	onSaved,
} ) {
	const {
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
	} = useDonationForm( { donation, initData, periods } );
	const [ saving, setSaving ] = useState( false );
	const [ msg, setMsg ] = useState( '' );
	const { disbursements, originalDon, originalMissing } = useRefundLookups( {
		isRefund,
		refundOfId: form.refund_of_id,
	} );
	const donor = useDonorAutofill( { onPick: applyDonor } );

	const save = async () => {
		const nameOk =
			form.donor_type === 'organization'
				? !! form.first_name
				: !! form.first_name && !! form.last_name;
		if ( ! nameOk || ! form.gross_amount ) {
			setMsg(
				form.donor_type === 'organization'
					? 'Organization name and amount are required.'
					: 'First name, last name, and amount are required.'
			);
			return;
		}
		// Without this the empty values reach the API, which falls back to
		// 'primary' and 'itemized' — the silent default all over again.
		if ( ! form.election_type ) {
			setMsg( 'Choose an Election.' );
			return;
		}
		if ( ! form.report_type ) {
			setMsg( 'Choose a Report Type: Itemized or Unitemized.' );
			return;
		}
		setSaving( true );
		setMsg( '' );
		const gross = parseFloat( form.gross_amount ) || 0;
		const rawFee = Math.abs( parseFloat( form.actblue_fee ) || 0 );
		// For refunds the fee is always refunded (negated), so net = gross - (-fee) = gross + fee.
		const fee = gross < 0 ? -rawFee : rawFee;
		const net = gross - fee;
		const body = {
			...form,
			gross_amount: gross,
			actblue_fee: fee,
			net_amount: net,
		};
		try {
			const r = isEdit
				? await apiSend( 'PUT', `/donations/${ form.id }`, body )
				: await apiSend( 'POST', `/donations`, body );
			const d = await r.json();
			if ( d.id ) {
				onSaved( d, isEdit );
				const saved = isEdit ? 'Donation updated.' : 'Donation added.';
				window.lsfhToast(
					d.limit_warning
						? `${ saved } ${ overLimitText( d.limit_warning ) }`
						: saved,
					d.limit_warning ? 8000 : undefined
				);
				onClose();
			} else {
				setMsg( d.message || 'Error saving.' );
			}
		} catch {
			setMsg( 'Network error.' );
		}
		setSaving( false );
	};

	let modalTitle = 'Add Donation';
	if ( isEdit ) {
		modalTitle = 'Edit Donation';
	} else if ( isRefund ) {
		modalTitle = 'Record Refund';
	}
	let saveButtonLabel = modalTitle;
	if ( isEdit ) {
		saveButtonLabel = 'Save Changes';
	}
	if ( saving ) {
		saveButtonLabel = 'Saving…';
	}

	return (
		<div id="lsfh-modal-backdrop">
			<div className="lsfh-modal wide">
				<div className="lsfh-modal-header">
					<span>{ modalTitle }</span>
					<button className="lsfh-icon-btn" onClick={ onClose }>
						✕
					</button>
				</div>

				{ ! isEdit && ! form.refund_of_id && (
					<RefundOriginalFinder onPick={ applyOriginal } collapsed />
				) }

				<div className="lsfh-section-hdr">Payment Method</div>
				<div className="lsfh-field">
					<label htmlFor="lsfh-donations-payment-type">
						Payment Type
					</label>
					<select
						id="lsfh-donations-payment-type"
						value={ form.payment_type }
						onChange={ ( e ) => {
							set( 'payment_type', e.target.value );
							set(
								'source',
								{
									actblue: 'actblue',
									check: 'check',
									cash: 'cash',
								}[ e.target.value ] || 'manual'
							);
						} }
					>
						{ PAYMENT_TYPES.map( ( t ) => (
							<option key={ t } value={ t }>
								{ PAYMENT_LABELS[ t ] }
							</option>
						) ) }
					</select>
				</div>
				{ form.payment_type === 'check' && (
					<div className="lsfh-field">
						<label htmlFor="lsfh-donations-check">Check #</label>
						<input
							id="lsfh-donations-check"
							type="text"
							value={ form.check_number }
							onChange={ ( e ) =>
								set( 'check_number', e.target.value )
							}
							placeholder="1001"
						/>
					</div>
				) }

				<DonationDonorSection
					form={ form }
					set={ set }
					isEdit={ isEdit }
					donor={ donor }
				/>

				<DonationAmountSection
					form={ form }
					set={ set }
					autoFee={ autoFee }
					fromPeriod={ fromPeriod }
					isRefund={ isRefund }
					disbursements={ disbursements }
					originalDon={ originalDon }
					originalMissing={ originalMissing }
				/>

				<DonationElectionSection
					form={ form }
					set={ set }
					periods={ periods }
					followsPeriod={ followsPeriod }
					fromPeriod={ fromPeriod }
					setElectionTouched={ setElectionTouched }
				/>

				<div className="lsfh-edit-footer">
					<button
						className="btn btn-primary"
						onClick={ save }
						disabled={ saving }
					>
						{ saveButtonLabel }
					</button>
					<button className="btn btn-ghost" onClick={ onClose }>
						Cancel
					</button>
					{ msg && (
						<span
							className="form-msg"
							style={ { color: 'var(--alert)' } }
						>
							{ msg }
						</span>
					) }
				</div>
			</div>
		</div>
	);
}
