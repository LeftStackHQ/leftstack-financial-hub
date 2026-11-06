import { __, _n, sprintf } from '@wordpress/i18n';
import { useStateCompare } from '../../hooks/useStateCompare';
import { STATE_COLUMNS } from './stateCompareFile';
import { StateCompareResult } from './StateCompareResult';

/**
 * The part of Before you file that compares the period with the list the state shows for it: choose the file (the state's
 * list saved as CSV), check which column is which, and see what differs. Nothing is changed in the Hub.
 *
 * @param {Object} props
 * @param {string} props.periodId The filing period chosen above.
 */
export function StateCompare( { periodId } ) {
	const c = useStateCompare( periodId );
	const ready = c.file && c.cols.date && c.cols.amount && c.cols.name;
	return (
		<>
			<h3 className="lsfh-subheading">
				{ __( 'Compare with the state', 'leftstack-financial-hub' ) }
			</h3>
			<p className="lsfh-meta">
				{ __(
					'Save the list the state shows for this period as CSV (or tab separated), choose it here, and the Hub shows what is missing, extra or different. Organizations are matched by date, amount and ZIP because the state keeps its own names for them.',
					'leftstack-financial-hub'
				) }
			</p>
			<div className="lsfh-field">
				<label htmlFor="lsfh-state-compare-file">
					{ __( 'The state’s list', 'leftstack-financial-hub' ) }
				</label>
				<input
					id="lsfh-state-compare-file"
					type="file"
					accept=".csv,.tsv,.txt,text/csv"
					onChange={ c.onFile }
				/>
			</div>
			{ c.error && <div className="lsfh-alert-box">{ c.error }</div> }
			{ c.file && (
				<>
					<p className="lsfh-meta">
						{ sprintf(
							/* translators: %d: rows in the file. */
							_n(
								'%d row read. Check which column is which:',
								'%d rows read. Check which column is which:',
								c.file.rows.length,
								'leftstack-financial-hub'
							),
							c.file.rows.length
						) }
					</p>
					<div className="lsfh-two-col">
						{ STATE_COLUMNS.map( ( col ) => (
							<div className="lsfh-field" key={ col.key }>
								<label
									htmlFor={ `lsfh-state-compare-${ col.key }` }
								>
									{ col.label }
								</label>
								<select
									id={ `lsfh-state-compare-${ col.key }` }
									value={ c.cols[ col.key ] || '' }
									onChange={ ( e ) =>
										c.setCol( col.key, e.target.value )
									}
								>
									<option value="">
										{ __(
											'None',
											'leftstack-financial-hub'
										) }
									</option>
									{ c.file.headers.map( ( h ) => (
										<option key={ h } value={ h }>
											{ h }
										</option>
									) ) }
								</select>
							</div>
						) ) }
					</div>
					<button
						className="btn btn-primary btn-sm"
						disabled={ ! ready || c.loading || ! periodId }
						onClick={ c.compare }
					>
						{ c.loading
							? __( 'Comparing…', 'leftstack-financial-hub' )
							: __( 'Compare', 'leftstack-financial-hub' ) }
					</button>
				</>
			) }
			{ c.result && (
				<StateCompareResult result={ c.result } skipped={ c.skipped } />
			) }
		</>
	);
}
