import { onKeyActivate } from '../shared';
import { Info } from 'lucide-react';

/**
 * A small info icon that shows a popover with the text when clicked.
 *
 * @param {Object}   props
 * @param {string}   props.text     The text to show.
 * @param {boolean}  props.open     Whether the popover is open.
 * @param {Function} props.onToggle Called when the icon is clicked.
 */
export function InfoTip( { text, open, onToggle } ) {
	return (
		<span className="lsfh-info-wrap">
			<span
				className={ `lsfh-info-icon${
					open ? ' lsfh-info-icon--active' : ''
				}` }
				onClick={ ( e ) => {
					e.stopPropagation();
					onToggle();
				} }
				onKeyDown={ onKeyActivate( onToggle ) }
				role="button"
				tabIndex={ 0 }
				aria-label={ text }
			>
				<Info size={ 12 } />
			</span>
			{ open && <div className="lsfh-info-popover">{ text }</div> }
		</span>
	);
}
