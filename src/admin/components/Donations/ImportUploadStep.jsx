import { Download } from 'lucide-react';
import { saveFile } from '../shared';
import { TEMPLATE_HEADERS, TEMPLATE_EXAMPLE } from './importFields';

/**
 * Step 1 of the donations CSV import: pick the file, or download the template.
 *
 * @param {Object}   props
 * @param {Function} props.onFile  Change handler for the file input.
 * @param {string}   props.fileErr Why the last file was refused, or ''.
 */
export function ImportUploadStep( { onFile, fileErr } ) {
	const downloadTemplate = () => {
		const csv = TEMPLATE_HEADERS + '\n' + TEMPLATE_EXAMPLE;
		saveFile(
			new Blob( [ csv ], { type: 'text/csv' } ),
			'donations-template.csv'
		);
	};

	return (
		<>
			<div
				style={ {
					marginBottom: 16,
					padding: '12px 16px',
					background: 'var(--p-xlt)',
					borderRadius: 'var(--radius-sm)',
					fontSize: 'var(--fs-base)',
					color: 'var(--slate)',
					lineHeight: 1.5,
				} }
			>
				Upload any CSV with donation data. Column names are
				auto-detected — ActBlue, Stripe payout, and our own export
				formats all work out of the box. You can fine-tune the mapping
				in the next step.
			</div>
			<div style={ { marginBottom: 16 } }>
				<button
					className="btn btn-ghost btn-sm"
					onClick={ downloadTemplate }
				>
					<Download size={ 13 } /> Download Template
				</button>
			</div>
			<div className="lsfh-field">
				<label htmlFor="lsfh-donations-select-csv-file">
					Select CSV File
				</label>
				<input
					id="lsfh-donations-select-csv-file"
					type="file"
					accept=".csv,text/csv"
					onChange={ onFile }
				/>
			</div>
			{ fileErr && (
				<div
					style={ {
						color: 'var(--alert)',
						fontSize: 'var(--fs-base)',
						marginTop: 8,
					} }
				>
					{ fileErr }
				</div>
			) }
		</>
	);
}
