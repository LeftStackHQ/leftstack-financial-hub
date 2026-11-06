import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Download } from 'lucide-react';
import { DateFilterBtn, saveFile } from '../shared';
import { useVendorReport } from '../../hooks/useVendorReport';
import { vendorReportCsv } from './vendorCsv';
import { VendorGroupBox } from './VendorGroupBox';
import { VendorGroupsModal } from './VendorGroupsModal';

/**
 * The Vendors tab: for each group of payees and fundraising pages, what was spent against what was raised, for all
 * dates or a chosen range, with a download of the report.
 *
 * @param {Object} props
 * @param {Array}  props.months Months that have data, for the date menu.
 */
export function VendorsView( { months } ) {
	const { report, loading, failed, range, setRange, clearRange, saveGroups } =
		useVendorReport();
	const [ editing, setEditing ] = useState( false );

	if ( ! report && loading ) {
		return (
			<div className="lsfh-loading">
				{ __( 'Loading…', 'leftstack-financial-hub' ) }
			</div>
		);
	}
	if ( failed || ! report ) {
		return (
			<div className="lsfh-empty">
				{ __(
					'The vendor report could not be loaded.',
					'leftstack-financial-hub'
				) }
			</div>
		);
	}

	const download = () =>
		saveFile(
			new Blob( [ vendorReportCsv( report.groups ) ], {
				type: 'text/csv',
			} ),
			'vendors.csv'
		);

	return (
		<>
			<div className="lsfh-filter-bar">
				<DateFilterBtn
					label={ range.label }
					months={ months }
					onApply={ setRange }
					onClear={ clearRange }
				/>
				<button
					className="btn btn-ghost btn-sm"
					onClick={ download }
					disabled={ ! report.groups.length }
				>
					<Download size={ 13 } />{ ' ' }
					{ __( 'Download CSV', 'leftstack-financial-hub' ) }
				</button>
			</div>
			<div className="lsfh-vendor-intro">
				<p className="lsfh-meta">
					{ __(
						'Spent is what was paid to the vendor’s payees. Raised is the gross of the gifts on its fundraising pages, counted in the month of the gift. A date range limits both to those dates. The cost per $1 raised is the spend divided by what was raised after refunds. Processor fees are shown apart and are not part of the spend.',
						'leftstack-financial-hub'
					) }
				</p>
				<button
					className="btn btn-ghost btn-sm"
					onClick={ () => setEditing( true ) }
				>
					{ report.groups.length
						? __( 'Edit groups', 'leftstack-financial-hub' )
						: __( 'Set up a vendor', 'leftstack-financial-hub' ) }
				</button>
			</div>
			{ ! report.groups.length && (
				<div className="lsfh-empty">
					{ __(
						'No vendors are set up yet. Group the payees and fundraising pages of a vendor to see what was spent on it next to what it raised.',
						'leftstack-financial-hub'
					) }
				</div>
			) }
			{ loading ? (
				<div className="lsfh-loading">
					{ __( 'Loading…', 'leftstack-financial-hub' ) }
				</div>
			) : (
				report.groups.map( ( g ) => (
					<VendorGroupBox key={ g.name } group={ g } />
				) )
			) }
			{ editing && (
				<VendorGroupsModal
					report={ report }
					onSave={ saveGroups }
					onClose={ () => setEditing( false ) }
				/>
			) }
		</>
	);
}
