import { __ } from '@wordpress/i18n';

/**
 * "Who pays this out?" in the donations import: the name given to the payouts this file creates, which names the fee
 * expense of each. Filled in from the kind of file; an ActBlue file is always ActBlue's, so it is not asked.
 *
 * @param {Object}   props
 * @param {Object}   props.provider Recognised export format, or null.
 * @param {string}   props.value    The name.
 * @param {Function} props.onChange Called with the new name.
 */
export function ImportProcessorField( { provider, value, onChange } ) {
	if ( 'actblue' === provider?.source ) {
		return null;
	}
	return (
		<div className="lsfh-field lsfh-import-processor">
			<label htmlFor="lsfh-import-processor">
				{ __( 'Who pays this out?', 'leftstack-financial-hub' ) }
			</label>
			<input
				id="lsfh-import-processor"
				type="text"
				className="lsfh-input"
				maxLength={ 100 }
				value={ value }
				onChange={ ( e ) => onChange( e.target.value ) }
			/>
			<p className="lsfh-meta">
				{ provider
					? __(
							'Names the fee expense of these payouts. Filled in from the kind of file; change it if another processor paid these out.',
							'leftstack-financial-hub'
					  )
					: __(
							'Required for a file the app does not recognise, for example WinRed or Anedot. It names the fee expense of these payouts.',
							'leftstack-financial-hub'
					  ) }
			</p>
		</div>
	);
}
