import { useState } from '@wordpress/element';
import { SmartDate } from '../SmartDate';
import { DONATION_IMPORT_FIELDS, FIELD_GROUPS } from './importFields';
import { ImportFieldRow } from './ImportFieldRow';
import { ImportProcessorField } from './ImportProcessorField';

/**
 * Step 2 of the donations CSV import: check which file column feeds each field, then import.
 *
 * @param {Object}   props
 * @param {string[]} props.headers         Column names in the uploaded file.
 * @param {Object[]} props.rows            Parsed data rows.
 * @param {Object}   props.mapping         Field key to file column name.
 * @param {Function} props.setMapping      Updates the mapping.
 * @param {Object}   props.provider        Recognised export format, or null.
 * @param {string}   props.processor       Who pays these payouts out.
 * @param {Function} props.setProcessor    Updates that name.
 * @param {string}   props.defDisbDate     Payout date to use when the file has none.
 * @param {Function} props.setDefDisbDate  Updates that date.
 * @param {boolean}  props.noDeposit       The user states the file has no deposit columns.
 * @param {Function} props.setNoDeposit    Updates that flag.
 * @param {string}   props.disbDateCol     File column mapped to the payout date, or undefined.
 * @param {boolean}  props.fileHasDisbDate Whether that column has any value.
 * @param {boolean}  props.importing       True while the import request is running.
 * @param {Function} props.onImport        Runs the import.
 * @param {Function} props.onBack          Returns to step 1.
 */
export function ImportMapStep( {
	headers,
	rows,
	mapping,
	setMapping,
	provider,
	processor,
	setProcessor,
	defDisbDate,
	setDefDisbDate,
	noDeposit,
	setNoDeposit,
	disbDateCol,
	fileHasDisbDate,
	importing,
	onImport,
	onBack,
} ) {
	const [ showAllFields, setShowAllFields ] = useState( false );

	const sampleOf = ( header ) => {
		if ( ! header ) {
			return '';
		}
		const hit = rows.find(
			( r ) => ( r[ header ] ?? '' ).toString().trim() !== ''
		);
		const v = hit ? hit[ header ].toString().trim() : '';
		return v.length > 38 ? v.slice( 0, 38 ) + '…' : v;
	};

	const isRelevant = ( fld ) =>
		!! mapping[ fld.key ] || fld.required || fld.critical;
	const hiddenFields = DONATION_IMPORT_FIELDS.filter(
		( fld ) => ! isRelevant( fld )
	);

	const missingRequired = DONATION_IMPORT_FIELDS.filter(
		( f ) => f.required && ! mapping[ f.key ]
	);
	const missingCritical = DONATION_IMPORT_FIELDS.filter(
		( f ) => f.critical && ! mapping[ f.key ]
	);
	// An ActBlue file is always ActBlue's; any other file needs the name of who pays it out.
	const needsProcessor = 'actblue' !== provider?.source && ! processor.trim();
	const blocked =
		missingRequired.length > 0 ||
		( missingCritical.length > 0 && ! noDeposit ) ||
		needsProcessor;

	return (
		<>
			{ provider ? (
				<div
					style={ {
						marginBottom: 14,
						padding: '10px 14px',
						background: 'var(--p-xlt)',
						border: '1px solid var(--p-lt)',
						borderRadius: 'var(--radius-sm)',
						fontSize: 'var(--fs-base)',
						color: 'var(--slate)',
					} }
				>
					Recognised as a{ ' ' }
					<strong style={ { color: 'var(--p-dk)' } }>
						{ provider.label }
					</strong>{ ' ' }
					export — { rows.length } row
					{ rows.length !== 1 ? 's' : '' }, columns mapped for you.
					Check the deposit fields below before importing.
				</div>
			) : (
				<div
					style={ {
						marginBottom: 14,
						padding: '10px 14px',
						background: 'var(--gold-lt)',
						border: '1px solid var(--gold-icon)',
						borderRadius: 'var(--radius-sm)',
						fontSize: 'var(--fs-base)',
						color: 'var(--slate)',
					} }
				>
					<strong style={ { color: 'var(--gold-dk)' } }>
						Unrecognised format
					</strong>{ ' ' }
					— { rows.length } row
					{ rows.length !== 1 ? 's' : '' }. Columns were matched by
					name where possible. Anything left as “Not in this file”
					needs checking, especially under Deposit &amp; fees.
				</div>
			) }

			<ImportProcessorField
				provider={ provider }
				value={ processor }
				onChange={ setProcessor }
			/>

			<div
				style={ {
					maxHeight: 360,
					overflowY: 'auto',
					marginBottom: 16,
					paddingRight: 4,
				} }
			>
				{ FIELD_GROUPS.filter( ( g ) =>
					DONATION_IMPORT_FIELDS.some(
						( f ) =>
							f.group === g.id &&
							( showAllFields || isRelevant( f ) )
					)
				).map( ( g ) => (
					<div key={ g.id } style={ { marginBottom: 18 } }>
						<div
							style={ {
								fontSize: 'var(--fs-micro)',
								fontWeight: 700,
								textTransform: 'uppercase',
								letterSpacing: '.08em',
								color: 'var(--s)',
								marginBottom: 2,
							} }
						>
							{ g.label }
						</div>
						<div
							className="lsfh-meta-sm"
							style={ { marginBottom: 8 } }
						>
							{ g.note }
						</div>
						{ DONATION_IMPORT_FIELDS.filter(
							( f ) =>
								f.group === g.id &&
								( showAllFields || isRelevant( f ) )
						).map( ( f ) => (
							<ImportFieldRow
								key={ f.key }
								field={ f }
								headers={ headers }
								col={ mapping[ f.key ] || '' }
								sample={ sampleOf( mapping[ f.key ] || '' ) }
								setMapping={ setMapping }
							/>
						) ) }
					</div>
				) ) }
			</div>

			{ hiddenFields.length > 0 && (
				<button
					className="btn btn-ghost btn-sm"
					style={ { marginBottom: 14 } }
					onClick={ () => setShowAllFields( ( v ) => ! v ) }
				>
					{ showAllFields
						? 'Hide fields this file does not have'
						: `Show ${ hiddenFields.length } more field${
								hiddenFields.length !== 1 ? 's' : ''
						  } this file does not have` }
				</button>
			) }

			{ ! fileHasDisbDate && rows.length > 0 && (
				<div
					style={ {
						marginBottom: 14,
						padding: '12px 14px',
						background: 'var(--gold-lt)',
						border: '1px solid var(--gold-icon)',
						borderRadius: 'var(--radius-sm)',
					} }
				>
					<div
						style={ {
							fontWeight: 700,
							color: 'var(--gold-dk)',
							marginBottom: 4,
						} }
					>
						This file reports no payout date
					</div>
					<div className="lsfh-meta-sm" style={ { marginBottom: 8 } }>
						{ disbDateCol
							? `“${ disbDateCol }” is empty on every row.`
							: 'No column in this file maps to one.' }{ ' ' }
						Set it once for the whole file, or leave it blank — the
						payout then shows as Pending at the top of Disbursements
						until a date arrives.
					</div>
					<SmartDate
						id="lsfh-import-disb-date"
						className="lsfh-input"
						style={ { maxWidth: 170 } }
						value={ defDisbDate }
						onChange={ ( e ) => setDefDisbDate( e.target.value ) }
					/>
				</div>
			) }

			{ ( missingRequired.length > 0 || missingCritical.length > 0 ) && (
				<div className="lsfh-alert-box" style={ { marginBottom: 14 } }>
					{ missingRequired.length > 0 && (
						<div style={ { marginBottom: 6 } }>
							<strong>
								Cannot import — map{ ' ' }
								{ missingRequired
									.map( ( f ) => f.label )
									.join( ', ' ) }
								.
							</strong>
						</div>
					) }
					{ missingCritical.length > 0 && (
						<>
							<div style={ { marginBottom: 6 } }>
								<strong>
									{ missingCritical
										.map( ( f ) => f.label )
										.join( ', ' ) }{ ' ' }
									{ missingCritical.length === 1
										? 'is'
										: 'are' }{ ' ' }
									not mapped.
								</strong>{ ' ' }
								Without them these rows will not join a bank
								deposit, and every donation will look like it
								deposited in full.
							</div>
							<label
								htmlFor="lsfh-import-no-deposit"
								style={ {
									display: 'flex',
									gap: 8,
									alignItems: 'flex-start',
									fontSize: 'var(--fs-cmp)',
									cursor: 'pointer',
								} }
							>
								<input
									id="lsfh-import-no-deposit"
									type="checkbox"
									checked={ noDeposit }
									onChange={ ( e ) =>
										setNoDeposit( e.target.checked )
									}
									style={ { marginTop: 2 } }
								/>
								<span>
									This file genuinely has no deposit or fee
									columns — import anyway.
								</span>
							</label>
						</>
					) }
				</div>
			) }

			<p
				style={ {
					fontSize: 'var(--fs-sm)',
					color: 'var(--muted)',
					margin: '0 0 16px',
				} }
			>
				Elections come from the file when it has an Election column.
				Otherwise each row takes the election of the filing period its
				contribution date falls in (Settings → Filing Periods).
			</p>

			<div className="lsfh-edit-footer">
				<button
					className="btn btn-primary"
					onClick={ onImport }
					disabled={ importing || ! rows.length || blocked }
				>
					{ importing
						? 'Importing…'
						: `Import ${ rows.length } row${
								rows.length !== 1 ? 's' : ''
						  }` }
				</button>
				<button className="btn btn-ghost" onClick={ onBack }>
					← Back
				</button>
			</div>
		</>
	);
}
