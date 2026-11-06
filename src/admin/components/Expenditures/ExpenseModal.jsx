import { useState, useEffect } from '@wordpress/element';
import {
	apiGet,
	apiSend,
	apiUpload,
	onKeyActivate,
	PeriodSelect,
	todayISO,
} from '../shared';
import { SmartDate } from '../SmartDate';
import { Paperclip } from 'lucide-react';
import { usePeriodFollowsDate } from '../../hooks/usePeriodFollowsDate';
import { useSharedCheck } from '../../hooks/useSharedCheck';
import { SharedCheckNote } from './SharedCheckNote';
import { PAYMENT_METHODS } from './constants';
import { methodLabel } from './helpers';

const RECEIPT_ALLOWED_TYPES = [ 'image/jpeg', 'image/png', 'application/pdf' ];

const RECEIPT_MAX_MB = 10;

// An empty expense form. (In-kind gifts have their own: BLANK_INKIND.)
const BLANK_EXPENSE = {
	expense_date: '',
	date_posted: '',
	payee: '',
	address: '',
	category_id: '',
	description: '',
	amount: '',
	payment_method: 'check',
	check_number: '',
	receipt_attachment_id: '',
	receipt_url: '',
	balanced: false,
	paid_by: window.LSFH?.campaignName || '',
	notes: '',
	filing_period_id: '',
};

export function ExpenseModal( {
	expense,
	initData,
	categories,
	periods,
	onClose,
	onSaved,
} ) {
	const [ form, setForm ] = useState(
		expense
			? {
					...expense,
					receipt_attachment_id: expense.receipt_attachment_id || '',
					receipt_url: expense.receipt_url || '',
			  }
			: { ...BLANK_EXPENSE, expense_date: todayISO(), ...initData }
	);
	const [ saving, setSaving ] = useState( false );
	const [ msg, setMsg ] = useState( '' );
	const [ uploading, setUploading ] = useState( false );
	const isEdit = !! expense?.id;
	const sharedCheck = useSharedCheck(
		'check' === form.payment_method ? form.check_number || '' : '',
		expense?.id || 0
	);

	// Payee autocomplete
	const [ payeeQuery, setPayeeQuery ] = useState( '' );
	const [ payeeSuggestions, setPayeeSuggestions ] = useState( [] );
	const [ showSuggestions, setShowSuggestions ] = useState( false );

	useEffect( () => {
		if ( ! payeeQuery || payeeQuery.length < 2 ) {
			setPayeeSuggestions( [] );
			setShowSuggestions( false );
			return;
		}
		const t = setTimeout( async () => {
			try {
				const r = await apiGet(
					`/payees`,
					`search=${ encodeURIComponent( payeeQuery ) }&per_page=8`
				);
				const d = await r.json();
				const hits = d.data || [];
				setPayeeSuggestions( hits );
				setShowSuggestions( hits.length > 0 );
			} catch {}
		}, 280 );
		return () => clearTimeout( t );
	}, [ payeeQuery ] );

	const selectPayee = ( p ) => {
		set( 'payee', p.payee_display );
		if ( p.address ) {
			set( 'address', p.address );
		}
		setShowSuggestions( false );
		setPayeeSuggestions( [] );
		setPayeeQuery( '' );
	};

	const set = ( k, v ) => setForm( ( f ) => ( { ...f, [ k ]: v } ) );

	// The filing period follows the expense date.
	usePeriodFollowsDate( {
		date: form.expense_date,
		periods,
		periodId: form.filing_period_id,
		setPeriodId: ( id ) => set( 'filing_period_id', id ),
	} );

	const uploadReceipt = async ( file ) => {
		if ( ! RECEIPT_ALLOWED_TYPES.includes( file.type ) ) {
			setMsg( 'Only JPEG, PNG, and PDF files are accepted.' );
			return;
		}
		if ( file.size > RECEIPT_MAX_MB * 1024 * 1024 ) {
			setMsg( `Receipt must be under ${ RECEIPT_MAX_MB } MB.` );
			return;
		}
		setUploading( true );
		const fd = new FormData();
		fd.append( 'receipt', file );
		try {
			const r = await apiUpload( `/upload/receipt`, fd );
			const d = await r.json();
			if ( d.attachment_id ) {
				set( 'receipt_attachment_id', d.attachment_id );
				set( 'receipt_url', d.url );
			} else {
				setMsg( d.message || 'Upload failed.' );
			}
		} catch {
			setMsg( 'Upload error.' );
		}
		setUploading( false );
	};

	const save = async () => {
		if ( ! form.payee || ! form.amount ) {
			setMsg( 'Payee and amount are required.' );
			return;
		}
		setSaving( true );
		setMsg( '' );
		const body = { ...form, amount: parseFloat( form.amount ) || 0 };
		try {
			const r = isEdit
				? await apiSend( 'PUT', `/expenditures/${ form.id }`, body )
				: await apiSend( 'POST', `/expenditures`, body );
			const d = await r.json();
			if ( d.id ) {
				onSaved( d, isEdit );
				window.lsfhToast(
					isEdit ? 'Expense updated.' : 'Expense added.'
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

	let saveLabel = 'Add Expense';
	if ( saving ) {
		saveLabel = 'Saving…';
	} else if ( isEdit ) {
		saveLabel = 'Save Changes';
	}

	return (
		<div id="lsfh-modal-backdrop">
			<div className="lsfh-modal wide">
				<div className="lsfh-modal-header">
					<span>{ isEdit ? 'Edit Expense' : 'Add Expense' }</span>
					<button className="lsfh-icon-btn" onClick={ onClose }>
						✕
					</button>
				</div>

				<div className="lsfh-section-hdr">Payee</div>
				<div className="lsfh-two-col">
					<div className="lsfh-field lsfh-field--relative">
						<label htmlFor="lsfh-expenditures-payee">
							Payee <span className="req">*</span>
						</label>
						<input
							id="lsfh-expenditures-payee"
							type="text"
							value={ form.payee }
							autoComplete="off"
							onChange={ ( e ) => {
								set( 'payee', e.target.value );
								setPayeeQuery( e.target.value );
							} }
							onFocus={ () => {
								if ( payeeSuggestions.length ) {
									setShowSuggestions( true );
								}
							} }
							onBlur={ () =>
								setTimeout(
									() => setShowSuggestions( false ),
									150
								)
							}
						/>
						{ showSuggestions && payeeSuggestions.length > 0 && (
							<div className="lsfh-autocomplete-dropdown">
								{ payeeSuggestions.map( ( p, i ) => (
									<div
										key={ i }
										className="lsfh-autocomplete-item"
										onMouseDown={ () => selectPayee( p ) }
										onKeyDown={ onKeyActivate( () =>
											selectPayee( p )
										) }
										role="option"
										aria-selected="false"
										tabIndex={ 0 }
									>
										<div className="lsfh-autocomplete-item__name">
											{ p.payee_display }
										</div>
										{ p.address && (
											<div className="lsfh-meta-xs lsfh-autocomplete-item__addr">
												{ p.address }
											</div>
										) }
									</div>
								) ) }
							</div>
						) }
					</div>
					<div className="lsfh-field">
						<label htmlFor="lsfh-expenditures-address">
							Address
						</label>
						<input
							id="lsfh-expenditures-address"
							type="text"
							value={ form.address }
							onChange={ ( e ) =>
								set( 'address', e.target.value )
							}
						/>
					</div>
				</div>
				<div className="lsfh-two-col">
					<div className="lsfh-field">
						<label htmlFor="lsfh-expenditures-expense-date">
							Expense Date
						</label>
						<SmartDate
							id="lsfh-expenditures-expense-date"
							value={ form.expense_date }
							onChange={ ( e ) => {
								const v = e.target.value;
								setForm( ( f ) => ( {
									...f,
									expense_date: v,
									date_posted:
										v > todayISO() ? '' : f.date_posted,
								} ) );
							} }
						/>
					</div>
					<div className="lsfh-field">
						<label htmlFor="lsfh-expenditures-date-posted-when-it-left-the-bank">
							Date Posted{ ' ' }
							<span className="hint">
								—{ ' ' }
								{ form.expense_date > todayISO()
									? 'available once the payment date arrives'
									: 'when it left the bank' }
							</span>
						</label>
						<SmartDate
							id="lsfh-expenditures-date-posted-when-it-left-the-bank"
							value={ form.date_posted }
							disabled={ form.expense_date > todayISO() }
							onChange={ ( e ) =>
								set( 'date_posted', e.target.value )
							}
						/>
					</div>
				</div>

				<div className="lsfh-section-hdr">Amount & Payment</div>
				<div className="lsfh-two-col">
					<div className="lsfh-field">
						<label htmlFor="lsfh-expenditures-amount">
							Amount <span className="req">*</span>
						</label>
						<input
							id="lsfh-expenditures-amount"
							type="number"
							step="0.01"
							min="0"
							value={ form.amount }
							onChange={ ( e ) =>
								set( 'amount', e.target.value )
							}
						/>
					</div>
					<div className="lsfh-field">
						<label htmlFor="lsfh-expenditures-payment-method">
							Payment Method
						</label>
						<select
							id="lsfh-expenditures-payment-method"
							value={ form.payment_method }
							onChange={ ( e ) =>
								set( 'payment_method', e.target.value )
							}
						>
							{ PAYMENT_METHODS.map( ( m ) => (
								<option key={ m } value={ m }>
									{ methodLabel( m ) }
								</option>
							) ) }
						</select>
					</div>
				</div>
				<div className="lsfh-two-col">
					{ [ 'check' ].includes( form.payment_method ) && (
						<div className="lsfh-field">
							<label htmlFor="lsfh-expenditures-check">
								Check #
							</label>
							<input
								id="lsfh-expenditures-check"
								type="text"
								value={ form.check_number }
								onChange={ ( e ) =>
									set( 'check_number', e.target.value )
								}
							/>
							<SharedCheckNote
								number={ form.check_number || '' }
								others={ sharedCheck.others }
								amount={ Number( form.amount ) || 0 }
							/>
						</div>
					) }
					<div className="lsfh-field">
						<label htmlFor="lsfh-expenditures-category">
							Category
						</label>
						<select
							id="lsfh-expenditures-category"
							value={ form.category_id }
							onChange={ ( e ) =>
								set( 'category_id', e.target.value )
							}
						>
							<option value="">Uncategorized</option>
							{ categories.map( ( c ) => (
								<option key={ c.id } value={ c.id }>
									{ c.name }
								</option>
							) ) }
						</select>
					</div>
				</div>
				<div className="lsfh-field">
					<label htmlFor="lsfh-expenditures-description">
						Description
					</label>
					<textarea
						id="lsfh-expenditures-description"
						rows={ 2 }
						value={ form.description }
						onChange={ ( e ) =>
							set( 'description', e.target.value )
						}
					/>
				</div>

				<div className="lsfh-section-hdr">Receipt</div>
				<div className="lsfh-field">
					<label htmlFor="lsfh-expenditures-upload-receipt">
						Upload Receipt
					</label>
					<input
						id="lsfh-expenditures-upload-receipt"
						type="file"
						accept="image/jpeg,image/png,application/pdf"
						onChange={ ( e ) =>
							e.target.files[ 0 ] &&
							uploadReceipt( e.target.files[ 0 ] )
						}
						disabled={ uploading }
					/>
					<span className="hint">
						JPEG, PNG, or PDF · max { RECEIPT_MAX_MB } MB
					</span>
					{ uploading && <span className="hint">Uploading…</span> }
					{ form.receipt_url && (
						<a
							href={ form.receipt_url }
							target="_blank"
							rel="noreferrer"
							className="lsfh-receipt-link lsfh-receipt-link--mt"
						>
							<Paperclip size={ 12 } /> View uploaded receipt
						</a>
					) }
				</div>
				<div className="lsfh-field">
					<label htmlFor="lsfh-expenditures-or-paste-a-link-to-receipt">
						Or paste a link to receipt
					</label>
					<input
						id="lsfh-expenditures-or-paste-a-link-to-receipt"
						type="url"
						value={ form.receipt_url }
						onChange={ ( e ) =>
							set( 'receipt_url', e.target.value )
						}
						placeholder="https://…"
					/>
					<span className="hint">
						e.g. Google Drive, Dropbox, or any direct link
					</span>
				</div>

				<div className="lsfh-section-hdr">Other</div>
				<div className="lsfh-two-col">
					<div className="lsfh-field">
						<label htmlFor="lsfh-expenditures-paid-by">
							Paid By
						</label>
						<input
							id="lsfh-expenditures-paid-by"
							type="text"
							value={ form.paid_by }
							onChange={ ( e ) =>
								set( 'paid_by', e.target.value )
							}
						/>
					</div>
					<PeriodSelect
						id="lsfh-expenditures-filing-period"
						value={ form.filing_period_id }
						onChange={ ( id ) => set( 'filing_period_id', id ) }
						periods={ periods }
						date={ form.expense_date }
					/>
				</div>
				<label
					htmlFor="lsfh-expenditures-set-balanced-e-target-checked"
					className="lsfh-check-row lsfh-check-row--mb"
				>
					<input
						id="lsfh-expenditures-set-balanced-e-target-checked"
						type="checkbox"
						checked={ !! form.balanced }
						onChange={ ( e ) =>
							set( 'balanced', e.target.checked )
						}
					/>
					Balanced to Bank Statement
				</label>
				<div className="lsfh-field">
					<label htmlFor="lsfh-expenditures-notes">Notes</label>
					<textarea
						id="lsfh-expenditures-notes"
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
						<span className="form-msg form-msg--err">{ msg }</span>
					) }
				</div>
			</div>
		</div>
	);
}
