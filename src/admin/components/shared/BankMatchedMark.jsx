import { __ } from '@wordpress/i18n';
import { Landmark } from 'lucide-react';

/**
 * A small bank icon beside a Balanced mark, shown when the item is matched to a bank line. It says why the
 * item is balanced, so nobody wonders or marks it again. The text is for screen readers and the tooltip.
 */
export function BankMatchedMark() {
	const label = __( 'Matched to the bank', 'leftstack-financial-hub' );
	return (
		<span className="lsfh-bank-mark" title={ label }>
			<Landmark size={ 12 } aria-hidden="true" />
			<span className="lsfh-sr-only">{ label }</span>
		</span>
	);
}
