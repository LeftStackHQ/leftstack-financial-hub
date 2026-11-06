import { ELECTION_TYPES, electionsHidden, PeriodSelect } from '../shared';

/**
 * The Election & Reporting part of the donation form.
 *
 * @param {Object}   props
 * @param {Object}   props.form
 * @param {Array}    props.periods
 * @param {Function} props.set
 * @param {boolean}  props.followsPeriod
 * @param {Object}   props.fromPeriod
 * @param {Function} props.setElectionTouched
 */
export function DonationElectionSection( {
	form,
	set,
	periods,
	followsPeriod,
	fromPeriod,
	setElectionTouched,
} ) {
	return (
		<>
			<div className="lsfh-section-hdr">
				{ electionsHidden() ? 'Reporting' : 'Election & Reporting' }
			</div>
			<div className="lsfh-two-col">
				{ ! electionsHidden() && (
					<div className="lsfh-field">
						<label htmlFor="lsfh-donations-election">
							Election <span className="req">*</span>
						</label>
						<select
							id="lsfh-donations-election"
							value={ form.election_type }
							onChange={ ( e ) => {
								setElectionTouched( true );
								set( 'election_type', e.target.value );
							} }
						>
							<option value="">— Select —</option>
							{ ELECTION_TYPES.map( ( t ) => (
								<option key={ t } value={ t }>
									{ t.charAt( 0 ).toUpperCase() +
										t.slice( 1 ) }
								</option>
							) ) }
						</select>
						{ followsPeriod && (
							<div
								style={ {
									fontSize: 'var(--fs-sm)',
									color: 'var(--muted)',
									marginTop: 4,
								} }
							>
								{ fromPeriod.election
									? `Set from the ${ fromPeriod.period } filing period. Change it if this contribution is for a different election.`
									: 'No filing period covers this date. Choose an election.' }
							</div>
						) }
					</div>
				) }
				<div className="lsfh-field">
					<label htmlFor="lsfh-donations-report-type">
						Report Type <span className="req">*</span>
					</label>
					<select
						id="lsfh-donations-report-type"
						value={ form.report_type }
						onChange={ ( e ) =>
							set( 'report_type', e.target.value )
						}
					>
						<option value="">— Select —</option>
						<option value="itemized">Itemized</option>
						<option value="unitemized">Unitemized</option>
					</select>
				</div>
			</div>
			<div className="lsfh-two-col">
				<div className="lsfh-field">
					<label htmlFor="lsfh-donations-reporting-status">
						Reporting Status
					</label>
					<select
						id="lsfh-donations-reporting-status"
						value={ form.reporting_status }
						onChange={ ( e ) =>
							set( 'reporting_status', e.target.value )
						}
					>
						<option value="pending">Pending</option>
						<option value="filed">Filed</option>
					</select>
				</div>
				<PeriodSelect
					id="lsfh-donations-filing-period"
					value={ form.filing_period_id }
					onChange={ ( id ) => set( 'filing_period_id', id ) }
					periods={ periods }
					date={ form.contribution_date }
					disabled={ 'filed' === form.reporting_status }
				/>
			</div>
			<div style={ { display: 'flex', gap: 16, marginBottom: 14 } }>
				<label
					htmlFor="lsfh-donations-set-recurring-e-target-checked"
					className="lsfh-check-row"
				>
					<input
						id="lsfh-donations-set-recurring-e-target-checked"
						type="checkbox"
						checked={ !! form.recurring }
						onChange={ ( e ) =>
							set( 'recurring', e.target.checked )
						}
					/>
					Recurring Donor
				</label>
				<label
					htmlFor="lsfh-donations-set-balanced-e-target-checked"
					className="lsfh-check-row"
				>
					<input
						id="lsfh-donations-set-balanced-e-target-checked"
						type="checkbox"
						checked={ !! form.balanced }
						onChange={ ( e ) =>
							set( 'balanced', e.target.checked )
						}
					/>
					Balanced to Bank Stmt
				</label>
			</div>
			<div className="lsfh-field">
				<label htmlFor="lsfh-donations-notes">Notes</label>
				<textarea
					id="lsfh-donations-notes"
					rows={ 2 }
					value={ form.notes }
					onChange={ ( e ) => set( 'notes', e.target.value ) }
				/>
			</div>
		</>
	);
}
