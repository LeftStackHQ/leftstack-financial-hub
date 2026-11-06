import { useState, useRef, useEffect } from '@wordpress/element';
import { Columns3, ChevronDown } from 'lucide-react';

/**
 * Minimum number of HIDEABLE columns before the Columns control is offered.
 *
 * Counted from the table's DEFINED columns, never the currently visible ones —
 * gating on visible count would make the control vanish once a user hid enough
 * columns, stranding them with no way to unhide.
 *
 * Hideable rather than raw count because every table's raw total includes the
 * checkbox and actions columns plus a locked anchor, none of which the user can
 * act on; a 9-column table really offers 6 choices. At this threshold the
 * control appears on Disbursements, Donations Transactions, Expenditures
 * Transactions, Expenditures Budget, In-Kind and Donors, and stays out of the
 * way on Payees, Budget periods, Filing Periods and Staff.
 */
export const MIN_HIDEABLE_FOR_COLUMNS_UI = 6;

/**
 * Toolbar dropdown for toggling column visibility.
 *
 * Renders nothing when the table has too few hideable columns to be worth it.
 *
 * @param {Object} props         Component props.
 * @param {Array}  props.columns [{ key, label, locked, off }] in display order.
 * @param {Object} props.prefs   The object returned by useColumnPrefs.
 * @param {string} props.tableId Stable table id, used to build unique input ids.
 * @return {Element} The rendered control.
 */
export function ColumnsBtn( { columns: all, prefs, tableId = 'tbl' } ) {
	const [ open, setOpen ] = useState( false );
	const columns = all.filter( ( c ) => ! c.off );
	const hideable = columns.filter( ( c ) => ! c.locked ).length;
	const ref = useRef( null );
	useEffect( () => {
		const h = ( e ) => {
			if ( ref.current && ! ref.current.contains( e.target ) ) {
				setOpen( false );
			}
		};
		document.addEventListener( 'mousedown', h );
		return () => document.removeEventListener( 'mousedown', h );
	}, [] );

	// After the hooks above, so hook order stays stable across renders.
	if ( hideable < MIN_HIDEABLE_FOR_COLUMNS_UI ) {
		return null;
	}

	const hiddenCount = prefs.hidden.length;

	return (
		<div ref={ ref } style={ { position: 'relative' } }>
			<button
				className={ `lsfh-input${
					hiddenCount ? ' lsfh-filter-active' : ''
				}` }
				style={ {
					cursor: 'pointer',
					display: 'inline-flex',
					alignItems: 'center',
					gap: 5,
					height: 34,
					padding: '0 10px',
					fontFamily: 'inherit',
					fontSize: 'var(--fs-base)',
					whiteSpace: 'nowrap',
				} }
				aria-expanded={ open }
				aria-haspopup="true"
				onClick={ () => setOpen( ( o ) => ! o ) }
			>
				<Columns3 size={ 13 } />
				{ hiddenCount
					? `Columns (${ hiddenCount } hidden)`
					: 'Columns' }
				<ChevronDown size={ 12 } style={ { flexShrink: 0 } } />
			</button>
			{ open && (
				<div
					style={ {
						position: 'absolute',
						top: 'calc(100% + 4px)',
						right: 0,
						zIndex: 300,
						background: 'var(--white)',
						border: '1px solid var(--border)',
						borderRadius: 'var(--radius-lg)',
						boxShadow: 'var(--shadow-md)',
						width: 220,
						padding: '10px 12px',
						maxHeight: 340,
						overflowY: 'auto',
					} }
				>
					{ columns.map( ( c ) => {
						const id = `lsfh-col-${ tableId }-${ c.key }`;
						return (
							<label
								key={ c.key }
								htmlFor={ id }
								className="lsfh-col-toggle"
								title={
									c.locked
										? 'This column cannot be hidden'
										: undefined
								}
							>
								<input
									id={ id }
									type="checkbox"
									checked={ prefs.show( c.key ) }
									disabled={ !! c.locked }
									onChange={ () => prefs.toggle( c.key ) }
								/>
								<span>{ c.label }</span>
							</label>
						);
					} ) }
					{ hiddenCount > 0 && (
						<button
							className="btn btn-ghost btn-sm lsfh-btn-muted"
							style={ { marginTop: 6, width: '100%' } }
							onClick={ () => prefs.reset() }
						>
							Show all
						</button>
					) }
				</div>
			) }
		</div>
	);
}
