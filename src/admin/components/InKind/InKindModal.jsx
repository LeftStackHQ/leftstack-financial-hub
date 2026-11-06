import { useState } from '@wordpress/element';
import { apiSend, PeriodSelect, todayISO } from '../shared';
import { usePeriodFollowsDate } from '../../hooks/usePeriodFollowsDate';
import { SmartDate } from '../SmartDate';

// An empty in-kind gift form. (Expenses have their own: BLANK_EXPENSE.)
const BLANK_INKIND = {
	donation_date: '',
	donor_name: '',
	address: '',
	occupation: '',
	employer: '',
	description: '',
	value: '',
	fec_report_date: '',
	notes: '',
	filing_period_id: '',
};

export function InKindModal( { item, periods, onClose, onSaved } ) {
	const [ form, setForm ] = useState(
		item ? { ...item } : { ...BLANK_INKIND, donation_date: todayISO() }
	);
	const [ saving, setSaving ] = useState( false );
	const [ msg, setMsg ] = useState( '' );
	const isEdit = !! item?.id;

	const set = ( k, v ) => setForm( ( f ) => ( { ...f, [ k ]: v } ) );

	// The filing period follows the gift's date.
	usePeriodFollowsDate( {
		date: form.donation_date,
		periods,
		periodId: form.filing_period_id,
		setPeriodId: ( id ) => set( 'filing_period_id', id ),
	} );

	const save = async () => {
		if ( ! form.donor_name || ! form.value ) {
			setMsg( 'Donor name and value are required.' );
			return;
		}
		setSaving( true );
		setMsg( '' );
		const body = { ...form, value: parseFloat( form.value ) || 0 };
		try {
			const r = isEdit
				? await apiSend( 'PUT', `/inkind/${ form.id }`, body )
				: await apiSend( 'POST', `/inkind`, body );
			const d = await r.json();
			if ( d.id ) {
				onSaved( d, isEdit );
				window.lsfhToast(
					isEdit ? 'In-kind updated.' : 'In-kind donation added.'
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

	let saveLabel = 'Add In-Kind';
	if ( saving ) {
		saveLabel = 'Saving…';
	} else if ( isEdit ) {
		saveLabel = 'Save Changes';
	}

	return (
		<div id="lsfh-modal-backdrop">
			<div className="lsfh-modal">
				<div className="lsfh-modal-header">
					<span>
						{ isEdit ? 'Edit In-Kind' : 'Add In-Kind Donation' }
					</span>
					<button className="lsfh-icon-btn" onClick={ onClose }>
						✕
					</button>
				</div>

				<div className="lsfh-section-hdr">Donor</div>
				<div className="lsfh-field">
					<label htmlFor="lsfh-inkind-donor-name">
						Donor Name <span className="req">*</span>
					</label>
					<input
						id="lsfh-inkind-donor-name"
						type="text"
						value={ form.donor_name }
						onChange={ ( e ) =>
							set( 'donor_name', e.target.value )
						}
					/>
				</div>
				<div className="lsfh-field">
					<label htmlFor="lsfh-inkind-address">Address</label>
					<input
						id="lsfh-inkind-address"
						type="text"
						value={ form.address }
						onChange={ ( e ) => set( 'address', e.target.value ) }
					/>
				</div>
				<div className="lsfh-two-col">
					<div className="lsfh-field">
						<label htmlFor="lsfh-inkind-occupation">
							Occupation
						</label>
						<input
							id="lsfh-inkind-occupation"
							type="text"
							value={ form.occupation }
							onChange={ ( e ) =>
								set( 'occupation', e.target.value )
							}
						/>
					</div>
					<div className="lsfh-field">
						<label htmlFor="lsfh-inkind-employer">Employer</label>
						<input
							id="lsfh-inkind-employer"
							type="text"
							value={ form.employer }
							onChange={ ( e ) =>
								set( 'employer', e.target.value )
							}
						/>
					</div>
				</div>

				<div className="lsfh-section-hdr">Contribution</div>
				<div className="lsfh-two-col">
					<div className="lsfh-field">
						<label htmlFor="lsfh-inkind-fair-market-value">
							Fair Market Value <span className="req">*</span>
						</label>
						<input
							id="lsfh-inkind-fair-market-value"
							type="number"
							step="0.01"
							min="0"
							value={ form.value }
							onChange={ ( e ) => set( 'value', e.target.value ) }
						/>
					</div>
					<div className="lsfh-field">
						<label htmlFor="lsfh-inkind-date">Date</label>
						<SmartDate
							id="lsfh-inkind-date"
							value={ form.donation_date }
							onChange={ ( e ) =>
								set( 'donation_date', e.target.value )
							}
						/>
					</div>
				</div>
				<div className="lsfh-field">
					<label htmlFor="lsfh-inkind-description-of-goods-services">
						Description of goods/services
					</label>
					<textarea
						id="lsfh-inkind-description-of-goods-services"
						rows={ 2 }
						value={ form.description }
						onChange={ ( e ) =>
							set( 'description', e.target.value )
						}
					/>
				</div>
				<div className="lsfh-two-col">
					<div className="lsfh-field">
						<label htmlFor="lsfh-inkind-fec-report-date">
							FEC Report Date
						</label>
						<SmartDate
							id="lsfh-inkind-fec-report-date"
							value={ form.fec_report_date }
							onChange={ ( e ) =>
								set( 'fec_report_date', e.target.value )
							}
						/>
					</div>
					<PeriodSelect
						id="lsfh-inkind-filing-period"
						value={ form.filing_period_id }
						onChange={ ( id ) => set( 'filing_period_id', id ) }
						periods={ periods }
						date={ form.donation_date }
					/>
				</div>
				<div className="lsfh-field">
					<label htmlFor="lsfh-inkind-notes">Notes</label>
					<textarea
						id="lsfh-inkind-notes"
						rows={ 2 }
						value={ form.notes }
						onChange={ ( e ) => set( 'notes', e.target.value ) }
					/>
				</div>

				<div className="lsfh-edit-footer">
					<button
						className="btn btn-primary"
						onClick={ save }
						disabled={ saving }
					>
						{ saveLabel }
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
