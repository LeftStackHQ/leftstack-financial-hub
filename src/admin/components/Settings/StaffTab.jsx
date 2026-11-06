import { useState, useEffect } from '@wordpress/element';
import { apiGet, apiSend, confirmAction, onKeyActivate } from '../shared';

/* ─── Staff Access Tab ────────────────────────────────────── */
export function StaffTab() {
	const [ staff, setStaff ] = useState( [] );
	const [ search, setSearch ] = useState( '' );
	const [ results, setRes ] = useState( [] );
	const [ msg, setMsg ] = useState( '' );

	const loadStaff = () =>
		apiGet( `/staff` )
			.then( ( r ) => r.json() )
			.then( ( d ) => setStaff( Array.isArray( d ) ? d : [] ) )
			.catch( () => {} );
	useEffect( () => {
		loadStaff();
	}, [] );

	const searchUsers = async ( q ) => {
		if ( ! q ) {
			setRes( [] );
			return;
		}
		const r = await apiGet(
			`/users/search`,
			`q=${ encodeURIComponent( q ) }`
		);
		const d = await r.json();
		setRes( Array.isArray( d ) ? d : [] );
	};

	useEffect( () => {
		const t = setTimeout( () => searchUsers( search ), 350 );
		return () => clearTimeout( t );
	}, [ search ] );

	const grant = async ( id ) => {
		await apiSend( 'POST', `/staff/${ id }/grant` );
		setMsg( '✓ Access granted.' );
		setSearch( '' );
		setRes( [] );
		loadStaff();
		setTimeout( () => setMsg( '' ), 3000 );
	};

	const revoke = async ( id ) => {
		const ok = await confirmAction(
			"Remove this user's access to Financial Hub?",
			{ confirmLabel: 'Remove access' }
		);
		if ( ! ok ) {
			return;
		}
		await apiSend( 'POST', `/staff/${ id }/revoke` );
		loadStaff();
	};

	return (
		<>
			<p className="page-desc">
				Grant any WordPress user access to the Financial Hub without
				giving them full admin rights. They receive the{ ' ' }
				<code>manage_lsfh</code> capability.
			</p>
			<div className="lsfh-section-hdr">Current Staff</div>
			<div className="lsfh-box lsfh-staff-table-wrap">
				<table className="lsfh-table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Email</th>
							<th>Login</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{ staff.length === 0 && (
							<tr>
								<td colSpan={ 4 }>
									<div className="lsfh-empty">
										No staff users yet.
									</div>
								</td>
							</tr>
						) }
						{ staff.map( ( u ) => (
							<tr key={ u.id }>
								<td className="lsfh-bold">{ u.name }</td>
								<td className="lsfh-meta-sm">{ u.email }</td>
								<td className="lsfh-meta-sm">{ u.login }</td>
								<td>
									<button
										className="btn btn-danger btn-sm"
										onClick={ () => revoke( u.id ) }
									>
										Revoke
									</button>
								</td>
							</tr>
						) ) }
					</tbody>
				</table>
			</div>
			<div className="lsfh-section-hdr">Grant Access</div>
			<div className="lsfh-staff-search">
				<input
					className="lsfh-input"
					placeholder="Search by name or email…"
					value={ search }
					onChange={ ( e ) => setSearch( e.target.value ) }
				/>
				{ results.length > 0 && (
					<div className="lsfh-search-results">
						{ results.map( ( u ) => (
							<div
								key={ u.id }
								className="lsfh-search-result-item"
								onClick={ () => grant( u.id ) }
								onKeyDown={ onKeyActivate( () =>
									grant( u.id )
								) }
								role="button"
								tabIndex={ 0 }
							>
								<strong>{ u.name }</strong>{ ' ' }
								<span className="lsfh-muted">{ u.email }</span>
							</div>
						) ) }
					</div>
				) }
			</div>
			{ msg && <p className="lsfh-staff-msg">{ msg }</p> }
		</>
	);
}
