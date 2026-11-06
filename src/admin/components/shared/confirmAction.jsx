import { useRef, useEffect, createRoot } from '@wordpress/element';

// ── Confirmation dialog ───────────────────────────────────────────────────────

function ConfirmDialog( { title, message, confirmLabel, danger, onDone } ) {
	const okRef = useRef( null );
	useEffect( () => {
		okRef.current?.focus();
		const onKey = ( e ) => {
			if ( e.key === 'Escape' ) {
				onDone( false );
			}
		};
		document.addEventListener( 'keydown', onKey );
		return () => document.removeEventListener( 'keydown', onKey );
	}, [ onDone ] );

	return (
		<div
			id="lsfh-modal-backdrop"
			role="presentation"
			onClick={ ( e ) => {
				// Only a click on the dimmed backdrop itself cancels, not one inside the box.
				if ( e.target === e.currentTarget ) {
					onDone( false );
				}
			} }
		>
			<div
				className="lsfh-modal"
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="lsfh-confirm-title"
				aria-describedby="lsfh-confirm-message"
			>
				<div className="lsfh-modal-header">
					<span id="lsfh-confirm-title">{ title }</span>
				</div>
				<div className="lsfh-modal-body" id="lsfh-confirm-message">
					{ message }
				</div>
				<div className="lsfh-modal-footer">
					<button
						ref={ okRef }
						className={ `btn ${
							danger ? 'btn-danger' : 'btn-primary'
						}` }
						onClick={ () => onDone( true ) }
					>
						{ confirmLabel }
					</button>
					<button
						className="btn btn-ghost"
						onClick={ () => onDone( false ) }
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
}

/**
 * Ask the user to confirm an action, in the app's own dialog instead of the browser's.
 * Resolves true on confirm and false on Cancel, Escape or a click outside the box.
 *
 * @param {string}  message                Question to show.
 * @param {Object}  [options]              Optional settings.
 * @param {string}  [options.confirmLabel] Text on the confirm button.
 * @param {string}  [options.title]        Dialog heading.
 * @param {boolean} [options.danger]       Style the confirm button as destructive (the default). Pass false for a safe action.
 * @return {Promise<boolean>} Whether the user confirmed.
 */
export function confirmAction(
	message,
	{ confirmLabel = 'Delete', title = 'Are you sure?', danger = true } = {}
) {
	return new Promise( ( resolve ) => {
		const host = document.createElement( 'div' );
		// Inside #lsfh-app so the dialog gets the app's button styles.
		( document.getElementById( 'lsfh-app' ) || document.body ).appendChild(
			host
		);
		const root = createRoot( host );
		const onDone = ( result ) => {
			resolve( result );
			setTimeout( () => {
				root.unmount();
				host.remove();
			}, 0 );
		};
		root.render(
			<ConfirmDialog
				title={ title }
				message={ message }
				confirmLabel={ confirmLabel }
				danger={ danger }
				onDone={ onDone }
			/>
		);
	} );
}
