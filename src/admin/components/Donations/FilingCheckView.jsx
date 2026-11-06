import { useState, useEffect } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { apiGet, fmtC, Pagination, periodForDate, todayISO } from '../shared';
import { useFilingCheck } from '../../hooks/useFilingCheck';
import { DonationModal } from './DonationModal';
import { FilingCheckDonor } from './FilingCheckDonor';
import { AmendmentsList } from './AmendmentsList';
import { PayoutProgressNote } from './PayoutProgressNote';
import { StateCompare } from './StateCompare';

/**
 * Donations → Before you file. Pick a filing period and see which of the contributions a state report would contain are
 * missing something the state needs, donor by donor, with a way to fix each one, and below it the refunds that still have
 * to be reported to a period that was already filed. Fixing a contribution opens it in the usual form.
 *
 * @param {Object} props
 * @param {Array}  props.periods Filing periods from /filing-periods.
 */
export function FilingCheckView( { periods } ) {
	const [ periodId, setPeriodId ] = useState( '' );
	const [ editDon, setEditDon ] = useState( null );
	const [ saves, setSaves ] = useState( 0 );
	const {
		result,
		loading,
		error,
		page,
		setPage,
		reload,
		saveBestEfforts,
		removeBestEfforts,
	} = useFilingCheck( periodId );

	// Start on the period that covers today, or the newest one.
	useEffect( () => {
		if ( ! periodId && periods.length ) {
			const now = periodForDate( periods, todayISO() ) || periods[ 0 ];
			setPeriodId( String( now.id ) );
		}
	}, [ periods, periodId ] );

	const openContribution = ( id ) => {
		apiGet( `/donations/${ id }` )
			.then( ( r ) => r.json() )
			.then( ( d ) => d.id && setEditDon( d ) );
	};

	const needs = result?.problem_rows ?? 0;
	let summary = '';
	if ( result ) {
		summary = needs
			? sprintf(
					/* translators: 1: contributions checked, 2: contributions with something missing, 3: donors. */
					__(
						'Checked %1$d contributions. %2$d are missing something, from %3$d donors.',
						'leftstack-financial-hub'
					),
					result.checked,
					needs,
					result.total
			  )
			: sprintf(
					/* translators: %d: contributions checked. */
					_n(
						'Checked %d contribution. Nothing is missing.',
						'Checked %d contributions. Nothing is missing.',
						result.checked,
						'leftstack-financial-hub'
					),
					result.checked
			  );
	}

	return (
		<>
			<div className="lsfh-toolbar">
				<label htmlFor="lsfh-filing-check-period">
					{ __( 'Filing period', 'leftstack-financial-hub' ) }
				</label>
				<select
					id="lsfh-filing-check-period"
					className="lsfh-input"
					value={ periodId }
					onChange={ ( e ) => setPeriodId( e.target.value ) }
				>
					{ periods.map( ( p ) => (
						<option key={ p.id } value={ p.id }>
							{ p.name }
						</option>
					) ) }
				</select>
			</div>
			<p className="lsfh-meta">
				{ __(
					'Looks at the itemized contributions that would go in the state report for this period. Fix a contribution with Edit. For a donor who never gives an occupation or employer, use Best efforts to record that you asked.',
					'leftstack-financial-hub'
				) }
			</p>
			<PayoutProgressNote periodId={ periodId } />
			{ error && <div className="lsfh-alert-box">{ error }</div> }
			{ loading && ! result && (
				<div className="lsfh-loading">
					{ __( 'Loading…', 'leftstack-financial-hub' ) }
				</div>
			) }
			{ result && (
				<>
					<p className="lsfh-meta">
						<strong>{ summary }</strong>
					</p>
					{ result.donors.length > 0 && (
						<div className="lsfh-box lsfh-box--table">
							<div
								className="lsfh-tscroll"
								tabIndex={ 0 }
								role="region"
								aria-label={ __(
									'Contributions missing information',
									'leftstack-financial-hub'
								) }
							>
								<table className="lsfh-table">
									<thead>
										<tr>
											<th>
												{ __(
													'Donor',
													'leftstack-financial-hub'
												) }
											</th>
											<th>
												{ __(
													'Gifts',
													'leftstack-financial-hub'
												) }
											</th>
											<th>
												{ __(
													'Total',
													'leftstack-financial-hub'
												) }
											</th>
											<th>
												{ __(
													'Missing',
													'leftstack-financial-hub'
												) }
											</th>
											<th></th>
										</tr>
									</thead>
									<tbody>
										{ result.donors.map( ( d ) => (
											<FilingCheckDonor
												key={ `${ d.first_name }|${ d.last_name }` }
												donor={ d }
												onEdit={ openContribution }
												onBestEfforts={
													saveBestEfforts
												}
											/>
										) ) }
									</tbody>
								</table>
							</div>
						</div>
					) }
					<Pagination
						page={ page }
						pages={ result.pages }
						setPage={ setPage }
					/>
					{ result.covered.length > 0 && (
						<>
							<h3 className="lsfh-subheading">
								{ __(
									'Best efforts on file',
									'leftstack-financial-hub'
								) }
							</h3>
							<ul className="lsfh-plain-list">
								{ result.covered.map( ( d ) => (
									<li key={ d.best_efforts.id }>
										{ sprintf(
											/* translators: 1: donor name, 2: date asked, 3: total given. */
											__(
												'%1$s: asked on %2$s (%3$s given in this period).',
												'leftstack-financial-hub'
											),
											`${ d.first_name } ${ d.last_name }`.trim(),
											d.best_efforts.requested_on,
											fmtC( d.total )
										) }{ ' ' }
										{ d.best_efforts.note }{ ' ' }
										<button
											className="btn btn-ghost btn-sm"
											onClick={ () =>
												removeBestEfforts(
													d.best_efforts.id
												)
											}
										>
											{ __(
												'Remove',
												'leftstack-financial-hub'
											) }
										</button>
									</li>
								) ) }
							</ul>
						</>
					) }
				</>
			) }
			{ editDon && (
				<DonationModal
					donation={ editDon }
					periods={ periods }
					onClose={ () => setEditDon( null ) }
					onSaved={ () => {
						reload();
						setSaves( ( n ) => n + 1 );
					} }
				/>
			) }
			<StateCompare key={ periodId } periodId={ periodId } />
			<AmendmentsList onEdit={ openContribution } version={ saves } />
		</>
	);
}
