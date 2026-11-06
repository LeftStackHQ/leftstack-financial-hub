import { __, _n, sprintf } from '@wordpress/i18n';
import { apiGet, apiSend, confirmAction } from '../components/shared';

/**
 * "3 donations, 1 expenditure" for the kinds of record in a count object, leaving out the kinds with none.
 *
 * @param {Object} t Counts: donations, expenditures, inkind, and actblue_disbursements (deposits).
 * @return {string} The counts as a short phrase, or an empty string when there are none.
 */
const words = ( t ) =>
	[
		[ t.donations, 'donation' ],
		[ t.expenditures, 'expenditure' ],
		[ t.inkind, 'in-kind contribution' ],
		[ t.actblue_disbursements, 'deposit' ],
	]
		.filter( ( [ n ] ) => n > 0 )
		.map( ( [ n, w ] ) => `${ n } ${ w }${ 1 === n ? '' : 's' }` )
		.join( ', ' );

/**
 * What the filing periods screen does about existing records when a period is added or changed.
 *
 * @param {Function} setMsg Shows a short message on the screen.
 * @return {{offerAssign: Function, offerElection: Function, deletePeriod: Function}} offerAssign( id, name, announceNothing ) finds the
 *         records dated inside the period that sit in another one and moves them once the user agrees.
 *         offerElection( id, name ) finds the donations dated inside the period that carry another election than the
 *         period's and changes them once the user agrees. deletePeriod( id ) deletes a period, asking first when records
 *         are still filed under it.
 */
export function usePeriodRecords( setMsg ) {
	// A record keeps the period it was given, so adding or changing a period does not move
	// existing records. This finds the ones dated inside the period that sit in another
	// one, and moves them once the user agrees.
	const offerAssign = async ( id, name, announceNothing ) => {
		const r = await apiGet( `/filing-periods/${ id }/records` ).catch(
			() => null
		);
		if ( ! r || ! r.ok ) {
			return;
		}
		const d = await r.json();
		const range = `${ d.period.start_date } to ${ d.period.end_date }`;
		if ( ! d.total ) {
			if ( announceNothing ) {
				setMsg(
					`✓ Every record dated ${ range } is already in ${ name }.`
				);
				setTimeout( () => setMsg( '' ), 4000 );
			}
			return;
		}
		const where = d.from
			.map( ( g ) => `${ g.name }: ${ words( g ) }` )
			.join( '; ' );
		const ok = await confirmAction(
			`${ words(
				d.totals
			) } dated ${ range } are filed under another period (${ where }). Move them into ${ name }? Records dated outside those days are not touched.`,
			{
				confirmLabel: 'Move records',
				danger: false,
				title: `Move records into ${ name }?`,
			}
		);
		if ( ! ok ) {
			return;
		}
		const m = await apiSend( 'POST', `/filing-periods/${ id }/records` );
		const res = await m.json().catch( () => ( {} ) );
		setMsg(
			m.ok
				? `✓ Moved ${ res.total } records into ${ name }.`
				: res.message || 'Could not move the records.'
		);
		setTimeout( () => setMsg( '' ), 5000 );
	};

	// Donations take their election from the period only when they are created, so a period whose election was just
	// set or changed leaves the donations already inside it as they were. This asks about them, says how many filed
	// ones are left alone, and changes nothing until the user agrees.
	const offerElection = async ( id, name ) => {
		const r = await apiGet( `/filing-periods/${ id }/election` ).catch(
			() => null
		);
		if ( ! r || ! r.ok ) {
			return;
		}
		const d = await r.json();
		if ( ! d.applicable || ( ! d.total && ! d.filed ) ) {
			return;
		}
		const election =
			d.election.charAt( 0 ).toUpperCase() + d.election.slice( 1 );
		const filedNote = d.filed
			? ' ' +
			  sprintf(
					/* translators: %d: filed donations that will not be changed. */
					_n(
						'%d filed donation will not be changed.',
						'%d filed donations will not be changed.',
						d.filed,
						'leftstack-financial-hub'
					),
					d.filed
			  )
			: '';
		if ( ! d.total ) {
			setMsg(
				sprintf(
					/* translators: 1: period name, 2: election, 3: note about filed donations. */
					__(
						'Donations dated in %1$s that carry another election than %2$s are already filed, so they were not changed.%3$s',
						'leftstack-financial-hub'
					),
					name,
					election,
					''
				)
			);
			setTimeout( () => setMsg( '' ), 6000 );
			return;
		}
		const from = Object.entries( d.from )
			.map( ( [ type, n ] ) => `${ n } ${ type }` )
			.join( ', ' );
		const ok = await confirmAction(
			sprintf(
				/* translators: 1: donations to change, 2: period name, 3: election, 4: how many of each election now, 5: payouts, 6: note about filed donations. */
				__(
					"%1$d donations dated in %2$s carry another election than %3$s (%4$s). Change them to %3$s? The election of the %5$d payouts that hold them follows when all of a payout's donations agree. A donation you set to another election by hand will change too.%6$s",
					'leftstack-financial-hub'
				),
				d.total,
				name,
				election,
				from,
				d.payouts,
				filedNote
			),
			{
				confirmLabel: sprintf(
					/* translators: %s: election. */
					__( 'Change to %s', 'leftstack-financial-hub' ),
					election
				),
				danger: false,
				title: sprintf(
					/* translators: %s: election. */
					__( 'Set the election to %s?', 'leftstack-financial-hub' ),
					election
				),
			}
		);
		if ( ! ok ) {
			return;
		}
		const m = await apiSend( 'POST', `/filing-periods/${ id }/election` );
		const res = await m.json().catch( () => ( {} ) );
		setMsg(
			m.ok
				? sprintf(
						/* translators: 1: donations changed, 2: election, 3: payout labels changed. */
						__(
							'✓ %1$d donations changed to %2$s; %3$d payout labels updated.',
							'leftstack-financial-hub'
						),
						res.changed,
						election,
						res.payouts
				  )
				: res.message ||
						__(
							'Could not change the elections.',
							'leftstack-financial-hub'
						)
		);
		setTimeout( () => setMsg( '' ), 6000 );
	};

	// A period that records are still filed under is refused by the server with how many. Deleting it anyway puts them
	// back to no period, and the next ledger sync places them by their dates.
	const deletePeriod = async ( id ) => {
		let res = await apiSend( 'DELETE', `/filing-periods/${ id }` );
		if ( 409 === res.status ) {
			const d = await res.json().catch( () => ( {} ) );
			const ok = await confirmAction(
				sprintf(
					/* translators: %s: the records filed under the period, for example "3 donations, 1 deposit". */
					__(
						'%s are filed under this period. Deleting it puts them back to no period, and the next time the ledger syncs they are placed by their dates. Delete the period anyway?',
						'leftstack-financial-hub'
					),
					words( d.data?.usage || {} )
				),
				{
					confirmLabel: __(
						'Delete period',
						'leftstack-financial-hub'
					),
					title: __(
						'Records use this period',
						'leftstack-financial-hub'
					),
				}
			);
			if ( ! ok ) {
				return;
			}
			res = await apiSend( 'DELETE', `/filing-periods/${ id }`, {
				force: true,
			} );
		}
		if ( ! res.ok ) {
			setMsg(
				__( 'Could not delete the period.', 'leftstack-financial-hub' )
			);
			setTimeout( () => setMsg( '' ), 4000 );
		}
	};

	return { offerAssign, offerElection, deletePeriod };
}
