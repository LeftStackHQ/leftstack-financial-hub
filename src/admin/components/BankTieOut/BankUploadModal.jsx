import { __, _n, sprintf } from '@wordpress/i18n';
import { FileUp } from 'lucide-react';
import { useBankUpload } from '../../hooks/useBankUpload';
import { BankLayoutStep } from './BankLayoutStep';

/**
 * The pop-up for adding a bank file to an account: choose the file, check the layout, see the result.
 *
 * @param {Object}   props
 * @param {Object}   props.account      The bank account the file is for.
 * @param {Function} props.saveFormat   Saves the account's format.
 * @param {Function} [props.onUploaded] Called after lines were added.
 * @param {Function} props.onClose      Closes the pop-up.
 */
export function BankUploadModal( {
	account,
	saveFormat,
	onUploaded,
	onClose,
} ) {
	const upload = useBankUpload( { account, saveFormat, onUploaded } );
	const steps = [
		__( 'Upload file', 'leftstack-financial-hub' ),
		__( 'Check the layout', 'leftstack-financial-hub' ),
		__( 'Added', 'leftstack-financial-hub' ),
	];
	const at = { file: 0, layout: 1, done: 2 }[ upload.step ];

	return (
		<div id="lsfh-modal-backdrop">
			<div
				className="lsfh-modal wide"
				role="dialog"
				aria-modal="true"
				aria-label={ __(
					'Add a bank file',
					'leftstack-financial-hub'
				) }
			>
				<div className="lsfh-modal-header">
					<span>
						{ __( 'Add a bank file', 'leftstack-financial-hub' ) }
					</span>
					<button
						className="lsfh-icon-btn"
						onClick={ onClose }
						aria-label={ __( 'Close', 'leftstack-financial-hub' ) }
					>
						✕
					</button>
				</div>
				<ol className="lsfh-bank-steps">
					{ steps.map( ( label, index ) => (
						<li
							key={ label }
							aria-current={ index === at ? 'step' : undefined }
							className={ index === at ? 'active' : '' }
						>
							{ index + 1 }. { label }
						</li>
					) ) }
				</ol>

				{ 'file' === upload.step && (
					<div className="lsfh-import-upload">
						<div className="lsfh-import-upload__hint">
							{ __(
								'Upload the CSV your bank lets you download. The first row must be column names. The file is read in your browser; only the lines are sent.',
								'leftstack-financial-hub'
							) }
						</div>
						<label
							htmlFor="lsfh-bank-file"
							className="btn btn-primary lsfh-file-btn"
						>
							<FileUp size={ 15 } />{ ' ' }
							{ __(
								'Choose CSV file',
								'leftstack-financial-hub'
							) }
							<input
								id="lsfh-bank-file"
								type="file"
								accept=".csv,text/csv"
								className="lsfh-hidden"
								onChange={ ( e ) =>
									e.target.files[ 0 ] &&
									upload.readFile( e.target.files[ 0 ] )
								}
							/>
						</label>
						{ upload.fileError && (
							<div className="lsfh-import-error" role="alert">
								{ upload.fileError }
							</div>
						) }
					</div>
				) }

				{ 'layout' === upload.step && (
					<BankLayoutStep
						account={ account }
						upload={ upload }
						onBack={ upload.reset }
					/>
				) }

				{ 'done' === upload.step && (
					<div className="lsfh-import-done">
						<div className="lsfh-import-done__icon">✓</div>
						<div className="lsfh-import-done__title">
							{ sprintf(
								/* translators: %d: number of bank lines added. */
								_n(
									'%d line added',
									'%d lines added',
									upload.result.added,
									'leftstack-financial-hub'
								),
								upload.result.added
							) }
						</div>
						{ upload.result.duplicates > 0 && (
							<p className="lsfh-meta">
								{ sprintf(
									/* translators: %d: number of bank lines already stored. */
									_n(
										'%d line was already stored and was skipped.',
										'%d lines were already stored and were skipped.',
										upload.result.duplicates,
										'leftstack-financial-hub'
									),
									upload.result.duplicates
								) }
							</p>
						) }
						<button className="btn btn-primary" onClick={ onClose }>
							{ __(
								'Review matches',
								'leftstack-financial-hub'
							) }
						</button>
					</div>
				) }
			</div>
		</div>
	);
}
