import { __, sprintf } from '@wordpress/i18n';
import { BankLayoutTotals } from './BankLayoutTotals';
import { BankLayoutFields } from './BankLayoutFields';
import { BankDepositors } from './BankDepositors';

/**
 * Step 2 of an upload: check that the file is read correctly (control totals and layout questions),
 * then add the lines.
 *
 * @param {Object}   props
 * @param {Object}   props.account The bank account.
 * @param {Object}   props.upload  The useBankUpload() result.
 * @param {Function} props.onBack  Back to choosing a file.
 */
export function BankLayoutStep( { account, upload, onBack } ) {
	const { built, layout, headers } = upload;
	const ready = built.totals.count > 0 && 0 === built.problems.length;
	return (
		<>
			<div className="lsfh-import-body">
				<p className="lsfh-meta">{ upload.fileName }</p>
				<BankLayoutTotals built={ built } />
				<BankLayoutFields
					headers={ headers }
					layout={ layout }
					built={ built }
					onField={ upload.setLayoutField }
				/>
				<BankDepositors
					depositors={ upload.depositors }
					onChange={ upload.setDepositors }
				/>
				<p className="lsfh-meta">
					{ sprintf(
						/* translators: %s: the name given to the bank account. */
						__(
							'This layout is remembered for "%s" and used the next time you upload a file for it. Only date, amount, description and check number are kept. Account numbers never are.',
							'leftstack-financial-hub'
						),
						account.label
					) }
				</p>
				{ upload.error && (
					<div className="lsfh-import-error" role="alert">
						{ upload.error }
					</div>
				) }
			</div>
			<div className="lsfh-edit-footer">
				<button
					className="btn btn-primary"
					disabled={ ! ready || upload.working }
					onClick={ upload.upload }
				>
					{ upload.working
						? __( 'Adding…', 'leftstack-financial-hub' )
						: __(
								'Looks right, add these lines',
								'leftstack-financial-hub'
						  ) }
				</button>
				<button className="btn btn-ghost" onClick={ onBack }>
					{ __( 'Back', 'leftstack-financial-hub' ) }
				</button>
			</div>
		</>
	);
}
