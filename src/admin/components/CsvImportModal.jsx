import { useState } from '@wordpress/element';
import { apiSend } from './shared';
import { parseCSV } from './csv';
import { FileUp } from 'lucide-react';

function autoMap( headers, fieldAliases ) {
	const mapping = {};
	const norm = ( h ) => h.toLowerCase().trim();
	for ( const [ field, aliases ] of Object.entries( fieldAliases ) ) {
		for ( const h of headers ) {
			if ( aliases.includes( norm( h ) ) ) {
				mapping[ field ] = h;
				break;
			}
		}
	}
	return mapping;
}

export function CsvImportModal( { config, periods, onClose, onDone } ) {
	const [ step, setStep ] = useState( 'upload' );
	const [ headers, setHeaders ] = useState( [] );
	const [ rows, setRows ] = useState( [] );
	const [ mapping, setMapping ] = useState( {} );
	const [ periodId, setPeriodId ] = useState( '' );
	const [ importing, setImporting ] = useState( false );
	const [ result, setResult ] = useState( null );
	const [ err, setErr ] = useState( '' );

	const setMap = ( field, col ) =>
		setMapping( ( m ) => ( { ...m, [ field ]: col } ) );

	const onFile = ( e ) => {
		const file = e.target.files[ 0 ];
		if ( ! file ) {
			return;
		}
		const reader = new window.FileReader();
		reader.onload = ( ev ) => {
			const { headers: h, rows: r } = parseCSV( ev.target.result );
			if ( ! h.length ) {
				setErr(
					'Could not parse CSV — make sure the first row contains column headers.'
				);
				return;
			}
			setHeaders( h );
			setRows( r );
			setMapping( autoMap( h, config.aliases ) );
			setStep( 'map' );
			setErr( '' );
		};
		reader.readAsText( file );
	};

	const doImport = async () => {
		if ( ! rows.length ) {
			return;
		}
		setImporting( true );
		setErr( '' );
		try {
			const r = await apiSend( 'POST', config.endpoint, {
				rows,
				mapping,
				default_period_id: periodId || null,
			} );
			const d = await r.json();
			setResult( d );
			setStep( 'done' );
		} catch {
			setErr( 'Network error during import.' );
		}
		setImporting( false );
	};

	const previewRows = rows.slice( 0, 5 );
	const mappedFields = config.fields.filter( ( f ) => mapping[ f.key ] );

	return (
		<div id="lsfh-modal-backdrop">
			<div className="lsfh-modal wide">
				<div className="lsfh-modal-header">
					<span>{ config.title }</span>
					<button className="lsfh-icon-btn" onClick={ onClose }>
						✕
					</button>
				</div>

				{ step === 'upload' && (
					<div className="lsfh-import-upload">
						<div className="lsfh-import-upload__hint">
							Upload a CSV file. The first row must be column
							headers.
							<br />
							{ config.recognized }
						</div>
						<label
							htmlFor={ `lsfh-${ config.idPrefix }-choose-csv-file-input-type-file-accept-c` }
							className="btn btn-primary lsfh-file-btn"
						>
							<FileUp size={ 15 } /> Choose CSV file
							<input
								id={ `lsfh-${ config.idPrefix }-choose-csv-file-input-type-file-accept-c` }
								type="file"
								accept=".csv,text/csv"
								onChange={ onFile }
								className="lsfh-hidden"
							/>
						</label>
						{ err && (
							<div className="lsfh-import-error">{ err }</div>
						) }
					</div>
				) }

				{ step === 'map' && (
					<>
						<div className="lsfh-import-body">
							<div className="lsfh-import-period-row">
								<span className="lsfh-meta lsfh-bold">
									{ rows.length } rows detected
								</span>
								{ periods.length > 0 && (
									<div className="lsfh-import-period-select">
										<label
											htmlFor={ `lsfh-${ config.idPrefix }-filing-period-2` }
											className="lsfh-import-period-label"
										>
											Filing Period
										</label>
										<select
											id={ `lsfh-${ config.idPrefix }-filing-period-2` }
											className="lsfh-input lsfh-input--period"
											value={ periodId }
											onChange={ ( e ) =>
												setPeriodId( e.target.value )
											}
										>
											<option value="">— None —</option>
											{ periods.map( ( p ) => (
												<option
													key={ p.id }
													value={ p.id }
												>
													{ p.name }
												</option>
											) ) }
										</select>
									</div>
								) }
							</div>

							<div className="lsfh-section-hdr">
								Column Mapping
							</div>
							<div className="lsfh-import-map-grid">
								{ config.fields.map(
									( { key, label, req } ) => (
										<div
											key={ key }
											className="lsfh-field lsfh-field--flush"
										>
											<label
												htmlFor={ `lsfh-${ config.idPrefix }-map-${ key }` }
												className="lsfh-import-map-label"
											>
												{ label }
												{ req && (
													<span className="req">
														{ ' ' }
														*
													</span>
												) }
											</label>
											<select
												id={ `lsfh-${ config.idPrefix }-map-${ key }` }
												className="lsfh-input"
												value={ mapping[ key ] || '' }
												onChange={ ( e ) =>
													setMap(
														key,
														e.target.value
													)
												}
											>
												<option value="">
													— Skip —
												</option>
												{ headers.map( ( h ) => (
													<option
														key={ h }
														value={ h }
													>
														{ h }
													</option>
												) ) }
											</select>
										</div>
									)
								) }
							</div>

							{ previewRows.length > 0 &&
								mappedFields.length > 0 && (
									<>
										<div className="lsfh-section-hdr">
											Preview — first{ ' ' }
											{ previewRows.length } rows
										</div>
										<div className="lsfh-import-preview">
											<table className="lsfh-table lsfh-table--dense">
												<thead>
													<tr>
														{ mappedFields.map(
															( f ) => (
																<th
																	key={
																		f.key
																	}
																>
																	{ f.label }
																</th>
															)
														) }
													</tr>
												</thead>
												<tbody>
													{ previewRows.map(
														( row, i ) => (
															<tr key={ i }>
																{ mappedFields.map(
																	( f ) => (
																		<td
																			key={
																				f.key
																			}
																			className="lsfh-td-truncate"
																		>
																			{ row[
																				mapping[
																					f
																						.key
																				]
																			] || (
																				<span className="lsfh-subtle">
																					—
																				</span>
																			) }
																		</td>
																	)
																) }
															</tr>
														)
													) }
												</tbody>
											</table>
										</div>
									</>
								) }

							{ err && (
								<div className="lsfh-import-error">{ err }</div>
							) }
						</div>
						<div className="lsfh-edit-footer">
							<button
								className="btn btn-primary"
								onClick={ doImport }
								disabled={ importing || ! rows.length }
							>
								{ importing
									? 'Importing…'
									: `Import ${ rows.length } rows` }
							</button>
							<button
								className="btn btn-ghost"
								onClick={ () => setStep( 'upload' ) }
							>
								← Back
							</button>
						</div>
					</>
				) }

				{ step === 'done' && result && (
					<div className="lsfh-import-done">
						<div className="lsfh-import-done__icon">✓</div>
						<div className="lsfh-import-done__title">
							Import complete
						</div>
						<div className="lsfh-import-done__stats">
							<div>
								<div className="lsfh-import-stat__num">
									{ result.imported }
								</div>
								<div className="lsfh-import-stat__label">
									imported
								</div>
							</div>
							{ result.duplicates > 0 && (
								<div>
									<div className="lsfh-import-stat__num--dim">
										{ result.duplicates }
									</div>
									<div className="lsfh-import-stat__label">
										already existed
									</div>
								</div>
							) }
							{ result.skipped > 0 && (
								<div>
									<div className="lsfh-import-stat__num--dim">
										{ result.skipped }
									</div>
									<div className="lsfh-import-stat__label">
										skipped (no amount)
									</div>
								</div>
							) }
						</div>
						<button
							className="btn btn-primary"
							onClick={ () => {
								onDone();
								onClose();
							} }
						>
							Done
						</button>
					</div>
				) }
			</div>
		</div>
	);
}
