/**
 * One line of the mapping step: a database field, the file column chosen for it, and a sample.
 *
 * @param {Object}   props
 * @param {Object}   props.field      The field (key, label, required, critical, help).
 * @param {string[]} props.headers    Column names in the uploaded file.
 * @param {string}   props.col        The file column mapped to this field, or ''.
 * @param {string}   props.sample     First non-empty value in that column.
 * @param {Function} props.setMapping Updates the whole mapping (as a state setter).
 */
export function ImportFieldRow( { field, headers, col, sample, setMapping } ) {
	const missing = ! col && ( field.required || field.critical );
	return (
		<div
			key={ field.key }
			style={ {
				display: 'grid',
				gridTemplateColumns: '190px 1fr',
				gap: 10,
				alignItems: 'start',
				padding: '5px 8px',
				marginBottom: 2,
				borderRadius: 'var(--radius-xs)',
				background: missing ? 'var(--alert-xlt)' : 'transparent',
			} }
		>
			<label
				htmlFor={ `lsfh-donations-map-${ field.key }` }
				style={ {
					fontSize: 'var(--fs-cmp)',
					fontWeight: 600,
					color: 'var(--slate)',
					paddingTop: 7,
				} }
			>
				{ field.label }
				{ field.required && (
					<span
						style={ {
							color: 'var(--alert)',
						} }
					>
						{ ' ' }
						*
					</span>
				) }
			</label>
			<div>
				<select
					id={ `lsfh-donations-map-${ field.key }` }
					className="lsfh-input"
					value={ col }
					onChange={ ( e ) =>
						setMapping( ( m ) => ( {
							...m,
							[ field.key ]: e.target.value,
						} ) )
					}
				>
					<option value="">Not in this file</option>
					{ headers.map( ( h ) => (
						<option key={ h } value={ h }>
							{ h }
						</option>
					) ) }
				</select>
				{ col && sample && (
					<div
						className="lsfh-meta-sm"
						style={ {
							marginTop: 3,
						} }
					>
						e.g.{ ' ' }
						<code
							style={ {
								background: 'var(--bg)',
								padding: '1px 5px',
								borderRadius: 'var(--radius-xs)',
							} }
						>
							{ sample }
						</code>
					</div>
				) }
				{ ! col && field.help && (
					<div
						className="lsfh-meta-sm"
						style={ {
							marginTop: 3,
							color: field.required
								? 'var(--alert)'
								: 'var(--muted)',
						} }
					>
						{ field.help }
					</div>
				) }
			</div>
		</div>
	);
}
