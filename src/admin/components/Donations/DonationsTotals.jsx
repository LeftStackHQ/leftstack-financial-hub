import { fmtC, TableTotals } from '../shared';

/**
 * The totals bar under the Donations table: how many transactions match and their gross, fees and net.
 *
 * @param {Object} props
 * @param {number} props.total              Number of rows matching the filters.
 * @param {number} props.totalContributions Contributions (refunds not counted) matching the filters.
 * @param {number} props.totalFees          Fees on everything matching the filters.
 * @param {number} props.totalGross         Gross amount of everything matching the filters.
 * @param {number} props.totalNet           Net amount of everything matching the filters.
 */
export function DonationsTotals( {
	total,
	totalContributions,
	totalFees,
	totalGross,
	totalNet,
} ) {
	return (
		<>
			{ total > 0 && (
				<TableTotals
					count={ `${ total.toLocaleString() } transaction${
						total !== 1 ? 's' : ''
					}` }
					stats={ [
						{
							label: `Contribution${
								1 === totalContributions ? '' : 's'
							}`,
							value: totalContributions.toLocaleString(),
						},
						...( totalFees !== 0
							? [
									{
										label:
											totalFees < 0
												? 'Fee credit'
												: 'Fees',
										value:
											totalFees > 0
												? `−${ fmtC( totalFees ) }`
												: `+${ fmtC(
														Math.abs( totalFees )
												  ) }`,
									},
							  ]
							: [] ),
						{
							label: 'Gross',
							value: fmtC( totalGross ),
							tone: 'positive',
						},
						{ label: 'Net', value: fmtC( totalNet ) },
					] }
				/>
			) }
		</>
	);
}
