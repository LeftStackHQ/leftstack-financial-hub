import { useState, useEffect } from '@wordpress/element';
import { useUrlTab } from '../../hooks/useUrlTab';
import { apiGet, electionsHidden } from '../shared';
import { GeneralTab } from './GeneralTab';
import { LimitsTab } from './LimitsTab';
import { FilingPeriodsTab } from './FilingPeriodsTab';
import { CategoriesTab } from './CategoriesTab';
import { IntegrationsTab } from './IntegrationsTab';
import { StaffTab } from './StaffTab';

/* ─── Main Settings Page ──────────────────────────────────── */
const TABS = [
	{ id: 'general', label: 'General' },
	{ id: 'limits', label: 'Contribution Limits' },
	{ id: 'periods', label: 'Filing Periods' },
	{ id: 'categories', label: 'Budget Categories' },
	{ id: 'integrations', label: 'Integrations' },
	{ id: 'staff', label: 'Staff Access' },
];

export default function Settings() {
	const [ tab, setTab ] = useUrlTab( 'general' );
	const [ settings, setSettings ] = useState( null );
	const [ loading, setLoading ] = useState( true );

	useEffect( () => {
		apiGet( `/settings` )
			.then( ( r ) => r.json() )
			.then( ( d ) => {
				setSettings( d );
				setLoading( false );
			} )
			.catch( () => setLoading( false ) );
	}, [] );

	if ( loading ) {
		return <div className="lsfh-loading">Loading…</div>;
	}

	return (
		<>
			<div className="lsfh-tabs lsfh-tabs--page">
				{ TABS.filter(
					( t ) => ! ( electionsHidden() && 'limits' === t.id )
				).map( ( t ) => (
					<button
						key={ t.id }
						className={ `lsfh-tab ${
							tab === t.id ? 'active' : ''
						}` }
						onClick={ () => setTab( t.id ) }
					>
						{ t.label }
					</button>
				) ) }
			</div>

			{ tab === 'general' && (
				<GeneralTab settings={ settings } onChange={ setSettings } />
			) }
			{ tab === 'limits' && (
				<LimitsTab settings={ settings } onChange={ setSettings } />
			) }
			{ tab === 'periods' && <FilingPeriodsTab /> }
			{ tab === 'categories' && <CategoriesTab /> }
			{ tab === 'integrations' && (
				<IntegrationsTab
					settings={ settings }
					onChange={ setSettings }
				/>
			) }
			{ tab === 'staff' && <StaffTab /> }
		</>
	);
}
