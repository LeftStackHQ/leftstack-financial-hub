import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { fmtC, todayISO } from '../shared';
import { filingCheckLabels } from './constants';

/**
 * One donor on the Before you file list: what is missing, their contributions, and a way to record best efforts.
 *
 * @param {Object}   props
 * @param {Object}   props.donor         The donor entry from /filing-check.
 * @param {Function} props.onEdit        Opens one contribution to fix it. Called with the contribution id.
 * @param {Function} props.onBestEfforts Saves a best-efforts record. Called with the donor, a date and a note; answers an error or ''.
 */
export function FilingCheckDonor( { donor, onEdit, onBestEfforts } ) {
	const labels = filingCheckLabels();
	const [ open, setOpen ] = useState( false );
	const [ asking, setAsking ] = useState( false );
	const [ on, setOn ] = useState( todayISO() );
	const [ note, setNote ] = useState( '' );
	const [ err, setErr ] = useState( '' );
	// Best efforts only help with what a donor may decline to give.
	const canExcuse = donor.missing.some( ( m ) =>
		[ 'occupation', 'employer' ].includes( m )
	);
	const name = donor.is_org
		? donor.first_name
		: `${ donor.first_name } ${ donor.last_name }`.trim() ||
		  __( '(no name)', 'leftstack-financial-hub' );

	const save = async () => {
		const problem = await onBestEfforts( donor, on, note );
		if ( problem ) {
			setErr( problem );
			return;
		}
		setAsking( false );
	};

	return (
		<>
			<tr>
				<td>
					<button
						className="btn btn-ghost btn-sm"
						aria-expanded={ open }
						onClick={ () => setOpen( ! open ) }
					>
						{ open ? '▾' : '▸' } { name }
					</button>
				</td>
				<td>{ donor.gifts }</td>
				<td>{ fmtC( donor.total ) }</td>
				<td>
					{ donor.missing.map( ( m ) => (
						<span
							key={ m }
							className="badge badge-xs badge-red"
							style={ { marginRight: 4 } }
						>
							{ labels[ m ] }
						</span>
					) ) }
				</td>
				<td>
					{ canExcuse && ! asking && (
						<button
							className="btn btn-ghost btn-sm"
							onClick={ () => setAsking( true ) }
						>
							{ __( 'Best efforts', 'leftstack-financial-hub' ) }
						</button>
					) }
				</td>
			</tr>
			{ asking && (
				<tr>
					<td colSpan={ 5 }>
						<div className="lsfh-toolbar">
							<label
								htmlFor={ `lsfh-be-date-${ donor.rows[ 0 ].id }` }
							>
								{ __( 'Asked on', 'leftstack-financial-hub' ) }
							</label>
							<input
								id={ `lsfh-be-date-${ donor.rows[ 0 ].id }` }
								type="date"
								className="lsfh-input"
								value={ on }
								onChange={ ( e ) => setOn( e.target.value ) }
							/>
							<input
								className="lsfh-input"
								placeholder={ __(
									'Note (for example, emailed twice)',
									'leftstack-financial-hub'
								) }
								aria-label={ __(
									'Note',
									'leftstack-financial-hub'
								) }
								value={ note }
								maxLength={ 255 }
								onChange={ ( e ) => setNote( e.target.value ) }
							/>
							<button
								className="btn btn-primary btn-sm"
								onClick={ save }
							>
								{ __( 'Save', 'leftstack-financial-hub' ) }
							</button>
							<button
								className="btn btn-ghost btn-sm"
								onClick={ () => setAsking( false ) }
							>
								{ __( 'Cancel', 'leftstack-financial-hub' ) }
							</button>
							{ err && <span className="form-msg">{ err }</span> }
						</div>
					</td>
				</tr>
			) }
			{ open &&
				donor.rows.map( ( row ) => (
					<tr key={ row.id } className="lsfh-subrow">
						<td>{ row.date }</td>
						<td></td>
						<td>{ fmtC( row.amount ) }</td>
						<td>
							{ sprintf(
								/* translators: %s: what is missing, such as Street, City. */
								__( 'Missing: %s', 'leftstack-financial-hub' ),
								row.missing
									.map( ( m ) => labels[ m ] )
									.join( ', ' )
							) }
						</td>
						<td>
							<button
								className="btn btn-ghost btn-sm"
								onClick={ () => onEdit( row.id ) }
								aria-label={ sprintf(
									/* translators: %s: the donor's name. */
									__(
										'Edit this contribution from %s',
										'leftstack-financial-hub'
									),
									name
								) }
							>
								{ __( 'Edit', 'leftstack-financial-hub' ) }
							</button>
						</td>
					</tr>
				) ) }
		</>
	);
}
