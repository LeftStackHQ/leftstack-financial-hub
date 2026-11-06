import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { FileUp } from 'lucide-react';
import { useBankAccounts } from '../../hooks/useBankAccounts';
import { BankAccountBar } from './BankAccountBar';
import { BankUploadModal } from './BankUploadModal';
import { BankWorkspace } from './BankWorkspace';

/**
 * The Bank screen: tie bank statement lines to the Hub's payouts, donations and expenses.
 */
export default function BankTieOut() {
	const bank = useBankAccounts();
	const [ uploading, setUploading ] = useState( false );
	const [ uploads, setUploads ] = useState( 0 );

	if ( bank.loading ) {
		return (
			<div className="lsfh-loading">
				{ __( 'Loading…', 'leftstack-financial-hub' ) }
			</div>
		);
	}

	return (
		<>
			<BankAccountBar
				accounts={ bank.accounts }
				account={ bank.account }
				onSelect={ bank.select }
				onAdd={ bank.addAccount }
				error={ bank.error }
			/>
			{ ! bank.account && ! bank.error && (
				<div className="lsfh-empty">
					{ __(
						'Add a bank account to begin. You will upload its statement next.',
						'leftstack-financial-hub'
					) }
				</div>
			) }
			{ bank.account && (
				<div className="lsfh-toolbar">
					<button
						type="button"
						className="btn btn-primary btn-sm"
						onClick={ () => setUploading( true ) }
					>
						<FileUp size={ 14 } />{ ' ' }
						{ __( 'Add a bank file', 'leftstack-financial-hub' ) }
					</button>
				</div>
			) }
			{ bank.account && (
				<BankWorkspace
					key={ `${ bank.account.id }-${ uploads }` }
					account={ bank.account }
				/>
			) }
			{ uploading && (
				<BankUploadModal
					account={ bank.account }
					saveFormat={ bank.saveFormat }
					onUploaded={ () => setUploads( ( n ) => n + 1 ) }
					onClose={ () => setUploading( false ) }
				/>
			) }
		</>
	);
}
