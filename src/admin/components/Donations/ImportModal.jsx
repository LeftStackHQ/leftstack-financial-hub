import { useDonationImport } from '../../hooks/useDonationImport';
import { ImportUploadStep } from './ImportUploadStep';
import { ImportMapStep } from './ImportMapStep';
import { ImportResultStep } from './ImportResultStep';

const importStepColor = ( currentStep, stepNumber ) => {
	if ( currentStep === stepNumber ) {
		return 'var(--p)';
	}
	if ( currentStep > stepNumber ) {
		return 'var(--ink)';
	}
	return 'var(--muted)';
};

export function ImportModal( { onClose, onDone } ) {
	const imp = useDonationImport( { onDone } );
	const { step } = imp;

	return (
		<div id="lsfh-modal-backdrop">
			<div className="lsfh-modal wide">
				<div className="lsfh-modal-header">
					<span>Import Donations from CSV</span>
					<button className="lsfh-icon-btn" onClick={ onClose }>
						✕
					</button>
				</div>

				{ /* Step indicator */ }
				<div
					style={ {
						display: 'flex',
						gap: 6,
						marginBottom: 20,
						fontSize: 'var(--fs-cmp)',
					} }
				>
					{ [ 'Upload File', 'Map Columns', 'Results' ].map(
						( label, i ) => (
							<span
								key={ i }
								style={ {
									fontWeight: step === i + 1 ? 700 : 400,
									color: importStepColor( step, i + 1 ),
								} }
							>
								{ i + 1 }. { label }
								{ i < 2 ? ' ›' : '' }
							</span>
						)
					) }
				</div>

				{ step === 1 && (
					<ImportUploadStep
						onFile={ imp.onFile }
						fileErr={ imp.fileErr }
					/>
				) }

				{ step === 2 && (
					<ImportMapStep
						headers={ imp.headers }
						rows={ imp.rows }
						mapping={ imp.mapping }
						setMapping={ imp.setMapping }
						provider={ imp.provider }
						processor={ imp.processor }
						setProcessor={ imp.setProcessor }
						defDisbDate={ imp.defDisbDate }
						setDefDisbDate={ imp.setDefDisbDate }
						noDeposit={ imp.noDeposit }
						setNoDeposit={ imp.setNoDeposit }
						disbDateCol={ imp.disbDateCol }
						fileHasDisbDate={ imp.fileHasDisbDate }
						importing={ imp.importing }
						onImport={ imp.doImport }
						onBack={ () => imp.setStep( 1 ) }
					/>
				) }

				{ step === 3 && imp.result && (
					<ImportResultStep
						result={ imp.result }
						onClose={ onClose }
					/>
				) }
			</div>
		</div>
	);
}
