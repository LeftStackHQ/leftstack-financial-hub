import { useState, useEffect, useRef } from '@wordpress/element';
import { _n, __, sprintf } from '@wordpress/i18n';
import { apiGet, saveFile } from '../shared';
import { useLatestRequest } from '../../hooks/useLatestRequest';
import { buildDonationFilterParams } from './helpers';
import { STATE_ENDPOINTS } from './constants';
import { PayoutProgressNote } from './PayoutProgressNote';

const BATCH_SIZE = 500;

export function StateExportModal( { onClose, filters } ) {
	const elecYear = window.LSFH?.electionYear || new Date().getFullYear();
	const state = window.LSFH?.filingState || '';
	const [ fundCode, setFundCode ] = useState( '' );
	const [ contributorType, setContributorType ] = useState( '' );
	const [ format, setFormat ] = useState( 'tsv' );
	const [ preflight, setPreflight ] = useState( null );
	const [ pfLoading, setPfLoading ] = useState( false );
	const [ downloading, setDownloading ] = useState( null );
	const [ showIndividual, setShowIndividual ] = useState( false ); // null | batch index
	const [ dlError, setDlError ] = useState( '' );

	const buildParams = ( extra = {} ) => {
		const p = buildDonationFilterParams( filters );
		if ( contributorType ) {
			p.set( 'contributor_type', contributorType );
		}
		if ( state === 'tn' ) {
			// '' only ever reaches the preflight — fundBlock stops a download
			// until a code is chosen, because FUNDCODE is what tells the state
			// which election a contribution counts toward. There is deliberately
			// no "leave blank" choice: it had no documented purpose, and it was
			// how a filing went out on 2026-09-10 with the column empty.
			p.set( 'fund_code', fundCode );
		}
		p.set( 'format', format );
		Object.entries( extra ).forEach( ( [ k, v ] ) => p.set( k, v ) );
		return p;
	};

	const beginPreflight = useLatestRequest();
	const runPreflight = async () => {
		if ( ! state || ! STATE_ENDPOINTS[ state ] ) {
			return;
		}
		const isStale = beginPreflight();
		setPfLoading( true );
		setPreflight( null );
		try {
			const r = await apiGet(
				`/${ STATE_ENDPOINTS[ state ] }`,
				`${ buildParams( {
					preflight: '1',
				} ) }`
			);
			const d = await r.json();
			if ( isStale() ) {
				return;
			}
			setPreflight( d );
		} catch {
			/* ignore */
		}
		if ( ! isStale() ) {
			setPfLoading( false );
		}
	};

	// Re-run preflight whenever the fund code or contributor scope changes —
	// both change which contributions land in the file.
	const runPreflightRef = useRef( runPreflight );
	useEffect( () => {
		runPreflightRef.current = runPreflight;
	} );
	useEffect( () => {
		runPreflightRef.current();
	}, [ fundCode, contributorType ] );

	/**
	 * Download the export.
	 *
	 * @param {number} batchIndex   Zero-based batch, or -1 for "all as ZIP".
	 * @param {number} totalBatches How many batches the filing splits into.
	 */
	const downloadBatch = async ( batchIndex, totalBatches ) => {
		setDownloading( batchIndex );
		setDlError( '' );
		let extra = {};
		if ( batchIndex === -1 ) {
			extra = { limit: BATCH_SIZE, archive: 1 };
		} else if ( totalBatches > 1 ) {
			extra = { offset: batchIndex * BATCH_SIZE, limit: BATCH_SIZE };
		}
		try {
			const r = await apiGet(
				`/${ STATE_ENDPOINTS[ state ] }`,
				`${ buildParams( extra ) }`
			);
			if ( ! r.ok ) {
				throw new Error();
			}
			// Row count, not the name list: the header carries DISTINCT names
			// (a handful) while this is how many PAC contributions are in the
			// file. They used to be excluded and the count was the only hint.
			const pacRows = Number( r.headers.get( 'X-LSFH-PAC-Rows' ) || 0 );
			saveFile(
				await r.blob(),
				r.headers
					.get( 'Content-Disposition' )
					?.match( /filename="([^"]+)"/ )?.[ 1 ] ||
					`${ state }-import.txt`
			);
			if ( pacRows > 0 ) {
				window.lsfhToast(
					`Downloaded — includes ${ pacRows } PAC row(s).`
				);
			} else {
				window.lsfhToast(
					`Batch ${ batchIndex + 1 } of ${ totalBatches } downloaded.`
				);
			}
			if ( batchIndex === totalBatches - 1 ) {
				onClose();
			}
		} catch {
			setDlError( 'Download failed. Please try again.' );
		}
		setDownloading( null );
	};

	// FUNDCODE is the only field in the file that says which election a
	// contribution is for, and fund_code does NOT filter rows — choosing P
	// stamps every exported row P whatever its own election. So an unchosen
	// code cannot be the default, and a code contradicted by the rows must not
	// download: on a mixed file that silently files contributions under the
	// wrong election.
	const total = preflight?.total ?? 0;
	const fundBlock = ( () => {
		if ( state !== 'tn' || ! preflight ) {
			return '';
		}
		if ( fundCode === '' ) {
			return 'Choose a fund code before downloading.';
		}
		if ( fundCode === 'P' && preflight.elec_general > 0 ) {
			return `${ preflight.elec_general } of these ${ total } contributions are General. Exporting them as P would file them under the wrong election — choose All instead.`;
		}
		if ( fundCode === 'G' && preflight.elec_primary > 0 ) {
			return `${ preflight.elec_primary } of these ${ total } contributions are Primary. Exporting them as G would file them under the wrong election — choose All instead.`;
		}
		return '';
	} )();
	const totalBatches = Math.max( 1, Math.ceil( total / BATCH_SIZE ) );

	return (
		<div id="lsfh-modal-backdrop">
			<div className="lsfh-modal" style={ { maxWidth: 440 } }>
				<div className="lsfh-modal-header">
					<span>Export</span>
					<button className="lsfh-icon-btn" onClick={ onClose }>
						✕
					</button>
				</div>
				<div className="lsfh-modal-body">
					<PayoutProgressNote periodId={ filters.fPeriod } warnOnly />
					{ ! state || ! STATE_ENDPOINTS[ state ] ? (
						<div className="lsfh-alert-box">
							<strong>No filing state selected.</strong> Go to{ ' ' }
							<a
								href={ `${ window.LSFH?.adminUrl }?page=lsfh-settings&tab=general` }
							>
								Settings → General
							</a>{ ' ' }
							and choose a Filing State before using this tool.
						</div>
					) : (
						<>
							{ state === 'tn' && (
								<div className="lsfh-field">
									<label htmlFor="lsfh-donations-fund-code">
										Fund Code
									</label>
									<select
										id="lsfh-donations-fund-code"
										className="lsfh-input"
										value={ fundCode }
										onChange={ ( e ) =>
											setFundCode( e.target.value )
										}
									>
										<option value="">— Choose —</option>
										<option value="all">
											All — use each contribution&apos;s
											own election
										</option>
										<option value="P">
											P — Primary { elecYear }
										</option>
										<option value="G">
											G — General { elecYear }
										</option>
									</select>
									<span className="hint">
										This is the only field telling the state
										which election a contribution is for.
									</span>
								</div>
							) }

							<div className="lsfh-field">
								<label htmlFor="lsfh-donations-contributor">
									Contributors
								</label>
								<select
									id="lsfh-donations-contributor"
									className="lsfh-input"
									value={ contributorType }
									onChange={ ( e ) =>
										setContributorType( e.target.value )
									}
								>
									<option value="">Everyone</option>
									<option value="I">Individuals only</option>
									<option value="O">
										Organizations &amp; PACs only
									</option>
								</select>
								<span className="hint">
									TN loads organizations and PACs on a
									separate schedule from individuals.
								</span>
							</div>

							<div className="lsfh-field">
								<label htmlFor="lsfh-donations-format">
									Format
								</label>
								<select
									id="lsfh-donations-format"
									className="lsfh-input"
									value={ format }
									onChange={ ( e ) =>
										setFormat( e.target.value )
									}
								>
									<option value="tsv">Tab-delimited</option>
									<option value="csv">CSV</option>
								</select>
							</div>

							<div style={ { marginTop: '1.25rem' } }>
								{ pfLoading && (
									<p
										style={ {
											color: 'var(--muted)',
											fontSize: 'var(--fs-base)',
											margin: '0 0 12px',
										} }
									>
										Calculating…
									</p>
								) }
								{ ! pfLoading && preflight && (
									<>
										{ totalBatches > 1 && (
											<p
												style={ {
													color: 'var(--slate)',
													fontSize: 'var(--fs-base)',
													margin: '0 0 12px',
													lineHeight: 1.5,
												} }
											>
												<strong>
													{ total.toLocaleString() }{ ' ' }
													contributions
												</strong>{ ' ' }
												in{ ' ' }
												<strong>
													{ totalBatches } files
												</strong>{ ' ' }
												— the state site accepts{ ' ' }
												{ BATCH_SIZE.toLocaleString() }{ ' ' }
												rows per upload.
											</p>
										) }
										{ preflight?.org_rows > 0 && (
											<p
												className="hint"
												style={ {
													margin: '0 0 12px',
													lineHeight: 1.5,
												} }
											>
												Includes{ ' ' }
												<strong>
													{ preflight.org_rows }
												</strong>{ ' ' }
												organization
												{ preflight.org_rows === 1
													? ''
													: 's' }
												{ preflight.pac_rows > 0 && (
													<>
														, of which{ ' ' }
														<strong>
															{
																preflight.pac_rows
															}
														</strong>{ ' ' }
														{ preflight.pac_rows ===
														1
															? 'is a PAC'
															: 'are PACs' }
														:{ ' ' }
														{ (
															preflight.pac_names ||
															[]
														).join( ', ' ) }
													</>
												) }
												. These upload to TN separately
												from individuals.
											</p>
										) }
										{ ( preflight?.elec_primary > 0 ||
											preflight?.elec_general > 0 ||
											preflight?.elec_other > 0 ) && (
											<p
												className="hint"
												style={ {
													margin: '0 0 12px',
													lineHeight: 1.5,
												} }
											>
												<strong>
													{ preflight.elec_primary }
												</strong>{ ' ' }
												Primary ·{ ' ' }
												<strong>
													{ preflight.elec_general }
												</strong>{ ' ' }
												General
												{ preflight.elec_other > 0 && (
													<>
														{ ' · ' }
														<strong>
															{
																preflight.elec_other
															}
														</strong>{ ' ' }
														neither — these export
														with an empty fund code
													</>
												) }
											</p>
										) }
										{ preflight.missing_address > 0 && (
											<div
												className="lsfh-alert-box"
												style={ { margin: '0 0 12px' } }
											>
												{ sprintf(
													/* translators: %d: contributions in this file without a full address. */
													_n(
														'%d contribution in this file has no full address.',
														'%d contributions in this file have no full address.',
														preflight.missing_address,
														'leftstack-financial-hub'
													),
													preflight.missing_address
												) }{ ' ' }
												<a
													href={ `${ window.LSFH?.adminUrl }?page=lsfh-donations&tab=filing-check` }
												>
													{ __(
														'Fix them in Before you file.',
														'leftstack-financial-hub'
													) }
												</a>
											</div>
										) }
										{ !! fundBlock && (
											<div
												className="lsfh-alert-box"
												style={ { margin: '0 0 12px' } }
											>
												{ fundBlock }
											</div>
										) }
										<div
											style={ {
												display: 'flex',
												gap: 8,
												flexWrap: 'wrap',
												alignItems: 'center',
											} }
										>
											{ totalBatches === 1 ? (
												<button
													className="btn btn-primary"
													onClick={ () =>
														downloadBatch( 0, 1 )
													}
													disabled={
														downloading !== null ||
														!! fundBlock
													}
												>
													{ downloading === 0
														? 'Downloading…'
														: 'Download' }
												</button>
											) : (
												<>
													<button
														className="btn btn-primary"
														onClick={ () =>
															downloadBatch(
																-1,
																totalBatches
															)
														}
														disabled={
															downloading !==
																null ||
															!! fundBlock
														}
													>
														{ downloading === -1
															? 'Preparing ZIP…'
															: `Download all ${ totalBatches } files (ZIP)` }
													</button>
													<button
														className="btn btn-ghost btn-sm"
														onClick={ () =>
															setShowIndividual(
																( v ) => ! v
															)
														}
														disabled={
															downloading !==
																null ||
															!! fundBlock
														}
													>
														{ showIndividual
															? 'Hide individual files'
															: 'Download individually' }
													</button>
												</>
											) }
										</div>
										{ totalBatches > 1 &&
											showIndividual && (
												<div
													style={ {
														display: 'flex',
														gap: 6,
														flexWrap: 'wrap',
														marginTop: 10,
													} }
												>
													{ Array.from(
														{
															length: totalBatches,
														},
														( _, i ) => (
															<button
																key={ i }
																className="btn btn-ghost btn-sm"
																onClick={ () =>
																	downloadBatch(
																		i,
																		totalBatches
																	)
																}
																disabled={
																	downloading !==
																	null
																}
															>
																{ downloading ===
																i
																	? 'Downloading…'
																	: `File ${
																			i +
																			1
																	  }` }
															</button>
														)
													) }
												</div>
											) }
									</>
								) }
								{ dlError && (
									<p
										className="form-msg form-msg--err"
										style={ { marginTop: 8 } }
									>
										{ dlError }
									</p>
								) }
							</div>
						</>
					) }
				</div>
			</div>
		</div>
	);
}
