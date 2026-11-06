import { Check } from 'lucide-react';

// ── Check toggle ───────────────────────────────────────────────
// A round on/off mark for flags such as Reconciled, Filed and Balanced. On is a solid
// teal circle with a white check; off is an empty grey ring, so the two read apart at a glance.
export function CheckToggle( { on, titleOn, titleOff, onClick } ) {
	const title = on ? titleOn : titleOff;
	return (
		<button
			type="button"
			className={ `lsfh-check-toggle lsfh-check-toggle--${
				on ? 'on' : 'off'
			}` }
			title={ title }
			aria-label={ title }
			aria-pressed={ !! on }
			onClick={ onClick }
		>
			<Check size={ 11 } strokeWidth={ 3 } aria-hidden="true" />
		</button>
	);
}
