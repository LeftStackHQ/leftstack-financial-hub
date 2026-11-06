import { SmartDate } from '../SmartDate';
import { onKeyActivate } from '../shared';

// A future-dated payment with no Posted date cannot be given one yet.
const postedLocked = ( e ) => Boolean( e.is_future && ! e.date_posted );

// The Posted date cell. A future-dated payment with no Posted date shows a dash and
// cannot be edited until its payment date arrives.
export function PostedCell( { e, editing, setEditing, updatePosted } ) {
	const locked = postedLocked( e );
	const open = () => {
		if ( ! locked ) {
			setEditing( { id: e.id } );
		}
	};
	let shown = e.date_posted;
	if ( ! shown ) {
		shown = locked ? '—' : '+ Add date';
	}
	return (
		<td className="lsfh-nowrap" onClick={ ( ev ) => ev.stopPropagation() }>
			{ editing?.id === e.id ? (
				<SmartDate
					ref={ ( node ) => node?.focus() }
					defaultValue={ e.date_posted || '' }
					className="lsfh-input"
					style={ {
						width: 130,
						padding: '2px 6px',
						fontSize: 'var(--fs-cmp)',
					} }
					onBlur={ ( ev ) => {
						updatePosted( e, ev.target.value || null );
						setEditing( null );
					} }
					onKeyDown={ ( ev ) => {
						if ( ev.key === 'Enter' ) {
							ev.target.blur();
						}
						if ( ev.key === 'Escape' ) {
							setEditing( null );
						}
					} }
					onClear={ () => {
						updatePosted( e, null );
						setEditing( null );
					} }
				/>
			) : (
				<span
					style={ {
						cursor: locked ? 'default' : 'pointer',
						color: e.date_posted ? 'var(--ink)' : 'var(--subtle)',
						fontSize: 'var(--fs-cmp)',
					} }
					title={
						locked
							? 'Available once the payment date arrives'
							: 'Click to edit'
					}
					onClick={ open }
					onKeyDown={ onKeyActivate( open ) }
					role="button"
					tabIndex={ 0 }
				>
					{ shown }
				</span>
			) }
		</td>
	);
}
