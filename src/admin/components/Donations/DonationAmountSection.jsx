import { __ } from '@wordpress/i18n';
import { SmartDate } from '../SmartDate';
import { fmtC } from '../shared';
import { DisbursementPicker } from './DisbursementPicker';

/**
 * The Amount & Dates part of the donation form, and the Refund Details block when it is a refund.
 *
 * @param {Object}   props
 * @param {Object}   props.form
 * @param {Function} props.set
 * @param {Function} props.autoFee
 * @param {boolean}  props.isRefund
 * @param {Array}    props.disbursements
 * @param {Object}   props.originalDon
 * @param {boolean}  props.originalMissing
 * @param {Object}   props.fromPeriod      The filing period (and its election) the contribution date falls in.
 */
export function DonationAmountSection( {
	form,
	set,
	autoFee,
	isRefund,
	disbursements,
	originalDon,
	originalMissing,
	fromPeriod,
} ) {
	return (
		<>
			<div className="lsfh-section-hdr">Amount & Dates</div>
			<div className="lsfh-two-col">
				<div className="lsfh-field">
					<label htmlFor="lsfh-donations-gross-amount">
						Gross Amount <span className="req">*</span>
					</label>
					<input
						id="lsfh-donations-gross-amount"
						type="number"
						step="0.01"
						value={ form.gross_amount }
						onChange={ ( e ) => {
							set( 'gross_amount', e.target.value );
							autoFee( e.target.value );
						} }
					/>
				</div>
				<div className="lsfh-field">
					<label htmlFor="lsfh-donations-fee">Fee</label>
					<input
						id="lsfh-donations-fee"
						type="number"
						step="0.01"
						min="0"
						value={
							Math.abs( parseFloat( form.actblue_fee ) || 0 ) ||
							form.actblue_fee
						}
						onChange={ ( e ) =>
							set( 'actblue_fee', e.target.value )
						}
					/>
					{ isRefund && form.source && 'actblue' !== form.source && (
						<p className="lsfh-meta">
							{ __(
								'Some processors keep their fee on a refund. Match the payout net to your bank.',
								'leftstack-financial-hub'
							) }
						</p>
					) }
				</div>
			</div>
			<div className="lsfh-two-col">
				<div className="lsfh-field">
					<label htmlFor="lsfh-donations-contribution-date">
						Contribution Date
					</label>
					<SmartDate
						id="lsfh-donations-contribution-date"
						value={ form.contribution_date }
						onChange={ ( e ) =>
							set( 'contribution_date', e.target.value )
						}
					/>
					{ isRefund && originalDon && (
						<div
							style={ {
								fontSize: 'var(--fs-sm)',
								color: 'var(--muted)',
								marginTop: 4,
							} }
						>
							{ form.contribution_date ===
							originalDon.contribution_date
								? `Same date as the original, so this refund amends ${
										fromPeriod.period || 'its filing period'
								  }.`
								: `The original was given on ${ originalDon.contribution_date }. A different date puts this refund in a different period than the original.` }
						</div>
					) }
				</div>
				<div className="lsfh-field">
					<label htmlFor="lsfh-donations-date-deposited">
						Date Deposited
					</label>
					<SmartDate
						id="lsfh-donations-date-deposited"
						value={ form.date_deposited }
						onChange={ ( e ) =>
							set( 'date_deposited', e.target.value )
						}
					/>
				</div>
			</div>

			{ isRefund && (
				<>
					<div
						className="lsfh-section-hdr"
						style={ {
							color: 'var(--gold)',
							borderColor: 'var(--gold-lt)',
						} }
					>
						Refund Details
					</div>
					<div className="lsfh-field">
						<label htmlFor="lsfh-donations-original-donation-id-span-style-fontsize">
							Original Donation ID{ ' ' }
							<span
								style={ {
									fontSize: 'var(--fs-sm)',
									fontWeight: 400,
									color: 'var(--muted)',
								} }
							>
								— links refund to the original contribution
							</span>
						</label>
						<input
							id="lsfh-donations-original-donation-id-span-style-fontsize"
							type="number"
							min="1"
							step="1"
							placeholder="Enter the ID # of the donation being refunded"
							value={ form.refund_of_id || '' }
							onChange={ ( e ) =>
								set(
									'refund_of_id',
									e.target.value
										? parseInt( e.target.value )
										: ''
								)
							}
						/>
						{ originalDon && (
							<div
								style={ {
									background: 'var(--p-xlt)',
									border: '1px solid var(--p-lt)',
									borderRadius: 'var(--radius-sm)',
									padding: '8px 12px',
									marginTop: 6,
									fontSize: 'var(--fs-cmp)',
									color: 'var(--ink)',
								} }
							>
								<strong>
									{ originalDon.donor_type === 'organization'
										? originalDon.first_name
										: originalDon.first_name +
										  ' ' +
										  originalDon.last_name }
								</strong>
								{ ' — ' }
								{ fmtC( originalDon.gross_amount ) } on{ ' ' }
								{ originalDon.contribution_date }
								{ originalDon.disbursement_id && (
									<span
										style={ {
											color: 'var(--muted)',
											marginLeft: 8,
										} }
									>
										Original disbursement:{ ' ' }
										{ originalDon.disbursement_id }
									</span>
								) }
							</div>
						) }
						{ originalMissing && (
							<div
								style={ {
									color: 'var(--alert)',
									fontSize: 'var(--fs-cmp)',
									marginTop: 4,
								} }
							>
								{ __(
									'Donation not found.',
									'leftstack-financial-hub'
								) }
							</div>
						) }
					</div>
					<div className="lsfh-field">
						<label htmlFor="lsfh-donations-disbursement">
							Disbursement{ ' ' }
							<span
								style={ {
									fontSize: 'var(--fs-sm)',
									fontWeight: 400,
									color: 'var(--muted)',
								} }
							>
								(the payout this refund was taken from)
							</span>
						</label>
						<DisbursementPicker
							id="lsfh-donations-disbursement"
							value={ form.disbursement_id || '' }
							onChange={ ( v ) => set( 'disbursement_id', v ) }
							options={ disbursements }
							refundNet={
								( parseFloat( form.gross_amount ) || 0 ) +
								Math.abs( parseFloat( form.actblue_fee ) || 0 )
							}
							inheritedId={ originalDon?.disbursement_id }
						/>
					</div>
				</>
			) }
		</>
	);
}
