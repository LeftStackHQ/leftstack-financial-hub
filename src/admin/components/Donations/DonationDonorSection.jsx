import { onKeyActivate, ORG_TYPES } from '../shared';

/**
 * The Donor Information part of the donation form: lookup box, organization toggle, name, address, contact.
 *
 * @param {Object}   props
 * @param {Object}   props.form
 * @param {Function} props.set
 * @param {boolean}  props.isEdit
 * @param {Object}   props.donor
 */
export function DonationDonorSection( { form, set, isEdit, donor } ) {
	const {
		donorQ,
		setDonorQ,
		donorHits,
		donorOpen,
		setDonorOpen,
		donorRef,
		pickDonor,
	} = donor;
	return (
		<>
			<div className="lsfh-section-hdr">Donor Information</div>
			{ ! isEdit && (
				<div className="lsfh-donor-lookup" ref={ donorRef }>
					<input
						type="text"
						className="lsfh-donor-lookup-input"
						placeholder="Search existing donor to autofill…"
						value={ donorQ }
						onChange={ ( e ) => setDonorQ( e.target.value ) }
						onFocus={ () =>
							donorHits.length && setDonorOpen( true )
						}
						autoComplete="off"
					/>
					{ donorOpen && donorHits.length > 0 && (
						<ul className="lsfh-donor-suggest">
							{ donorHits.map( ( d, i ) => (
								<li
									key={ i }
									onMouseDown={ () => pickDonor( d ) }
									onKeyDown={ onKeyActivate( () =>
										pickDonor( d )
									) }
									role="option"
									aria-selected="false"
									tabIndex={ 0 }
								>
									<span className="lsfh-suggest-name">
										{ d.donor_type === 'organization'
											? d.first_name
											: `${ d.first_name } ${ d.last_name }` }
									</span>
									{ d.city && (
										<span className="lsfh-suggest-loc">
											{ d.city }
											{ d.state ? `, ${ d.state }` : '' }
										</span>
									) }
									<span className="lsfh-suggest-count">
										{ d.gift_count } gift
										{ d.gift_count !== 1 ? 's' : '' }
									</span>
								</li>
							) ) }
						</ul>
					) }
				</div>
			) }
			<div style={ { marginBottom: 12 } }>
				<label htmlFor="lsfh-donations-set" className="lsfh-check-row">
					<input
						id="lsfh-donations-set"
						type="checkbox"
						checked={ form.donor_type === 'organization' }
						onChange={ ( e ) => {
							set(
								'donor_type',
								e.target.checked ? 'organization' : 'individual'
							);
							if ( ! e.target.checked ) {
								set( 'org_type', '' );
							}
						} }
					/>
					PAC / Organization (no individual name)
				</label>
			</div>
			{ form.donor_type === 'organization' ? (
				<>
					<div className="lsfh-field">
						<label htmlFor="lsfh-donations-organization-name">
							Organization Name <span className="req">*</span>
						</label>
						<input
							id="lsfh-donations-organization-name"
							type="text"
							value={ form.first_name }
							onChange={ ( e ) =>
								set( 'first_name', e.target.value )
							}
						/>
					</div>
					<div className="lsfh-field">
						<label htmlFor="lsfh-donations-org-type">
							Type of organization
						</label>
						<select
							id="lsfh-donations-org-type"
							value={ form.org_type || '' }
							onChange={ ( e ) =>
								set( 'org_type', e.target.value )
							}
						>
							<option value="">Not chosen</option>
							{ ORG_TYPES.map( ( t ) => (
								<option key={ t.value } value={ t.value }>
									{ t.label }
								</option>
							) ) }
						</select>
						<p className="page-desc">
							A PAC or a party committee has no organization
							limit. Any other type, or none, keeps it.
						</p>
					</div>
				</>
			) : (
				<div className="lsfh-two-col">
					<div className="lsfh-field">
						<label htmlFor="lsfh-donations-first-name">
							First Name <span className="req">*</span>
						</label>
						<input
							id="lsfh-donations-first-name"
							type="text"
							value={ form.first_name }
							onChange={ ( e ) =>
								set( 'first_name', e.target.value )
							}
						/>
					</div>
					<div className="lsfh-field">
						<label htmlFor="lsfh-donations-last-name">
							Last Name <span className="req">*</span>
						</label>
						<input
							id="lsfh-donations-last-name"
							type="text"
							value={ form.last_name }
							onChange={ ( e ) =>
								set( 'last_name', e.target.value )
							}
						/>
					</div>
				</div>
			) }
			<div className="lsfh-field">
				<label htmlFor="lsfh-donations-address">Address</label>
				<input
					id="lsfh-donations-address"
					type="text"
					value={ form.address }
					onChange={ ( e ) => set( 'address', e.target.value ) }
				/>
			</div>
			<div className="lsfh-three-col">
				<div className="lsfh-field">
					<label htmlFor="lsfh-donations-city">City</label>
					<input
						id="lsfh-donations-city"
						type="text"
						value={ form.city }
						onChange={ ( e ) => set( 'city', e.target.value ) }
					/>
				</div>
				<div className="lsfh-field">
					<label htmlFor="lsfh-donations-state">State</label>
					<input
						id="lsfh-donations-state"
						type="text"
						maxLength={ 2 }
						value={ form.state }
						onChange={ ( e ) =>
							set( 'state', e.target.value.toUpperCase() )
						}
					/>
				</div>
				<div className="lsfh-field">
					<label htmlFor="lsfh-donations-zip">ZIP</label>
					<input
						id="lsfh-donations-zip"
						type="text"
						value={ form.zip }
						onChange={ ( e ) => set( 'zip', e.target.value ) }
					/>
				</div>
			</div>
			<div className="lsfh-two-col">
				<div className="lsfh-field">
					<label htmlFor="lsfh-donations-occupation">
						Occupation
					</label>
					<input
						id="lsfh-donations-occupation"
						type="text"
						value={ form.occupation }
						onChange={ ( e ) =>
							set( 'occupation', e.target.value )
						}
					/>
				</div>
				<div className="lsfh-field">
					<label htmlFor="lsfh-donations-employer">Employer</label>
					<input
						id="lsfh-donations-employer"
						type="text"
						value={ form.employer }
						onChange={ ( e ) => set( 'employer', e.target.value ) }
					/>
				</div>
			</div>
			<div className="lsfh-two-col">
				<div className="lsfh-field">
					<label htmlFor="lsfh-donations-email">Email</label>
					<input
						id="lsfh-donations-email"
						type="email"
						value={ form.email }
						onChange={ ( e ) => set( 'email', e.target.value ) }
					/>
				</div>
				<div className="lsfh-field">
					<label htmlFor="lsfh-donations-phone">Phone</label>
					<input
						id="lsfh-donations-phone"
						type="tel"
						value={ form.phone }
						onChange={ ( e ) => set( 'phone', e.target.value ) }
					/>
				</div>
			</div>
		</>
	);
}
