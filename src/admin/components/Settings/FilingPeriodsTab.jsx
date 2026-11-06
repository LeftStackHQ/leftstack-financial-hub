import {
	ELECTION_TYPES,
	electionsHidden,
	apiGet,
	confirmAction,
	apiSend,
} from '../shared';
import { Plus } from 'lucide-react';
import { useState, useEffect } from '@wordpress/element';
import { SmartDate } from '../SmartDate';
import { ElectionTypeSelect, electionFromName } from './ElectionTypeSelect';
import { InfoTip } from './InfoTip';
import { PeriodRow } from './PeriodRow';
import { PeriodEditRow } from './PeriodEditRow';
import { usePeriodRecords } from '../../hooks/usePeriodRecords';

/* ─── Filing Periods Tab ──────────────────────────────────── */
export function FilingPeriodsTab() {
	const noElec = electionsHidden();
	const [ periods, setPeriods ] = useState( [] );
	const [ form, setForm ] = useState( {
		name: '',
		start_date: '',
		end_date: '',
		beginning_balance: '',
		election_type: '',
	} );
	const [ saving, setSaving ] = useState( false );
	const [ msg, setMsg ] = useState( '' );
	const [ editId, setEditId ] = useState( null );
	const [ editForm, setEditForm ] = useState( {} );
	const [ infoOpen, setInfoOpen ] = useState( null );
	const tipText = 'Leave blank to auto-compute from prior period activity.';
	const toggleInfo = ( id ) =>
		setInfoOpen( ( v ) => ( v === id ? null : id ) );

	const load = () =>
		apiGet( `/filing-periods`, `_t=${ Date.now() }` )
			.then( ( r ) => r.json() )
			.then( ( d ) => setPeriods( Array.isArray( d ) ? d : [] ) )
			.catch( () =>
				setMsg( 'Failed to load filing periods. Please refresh.' )
			);
	useEffect( () => {
		load();
	}, [] );
	useEffect( () => {
		if ( ! infoOpen ) {
			return;
		}
		const close = () => setInfoOpen( null );
		document.addEventListener( 'click', close );
		return () => document.removeEventListener( 'click', close );
	}, [ infoOpen ] );

	// A name like "Pre-General" says which election it is, so an unchosen election follows the name.
	const set = ( k, v ) =>
		setForm( ( f ) => ( {
			...f,
			[ k ]: v,
			...( 'name' === k && '' === f.election_type
				? { election_type: electionFromName( v ) }
				: {} ),
		} ) );
	const { offerAssign, offerElection, deletePeriod } =
		usePeriodRecords( setMsg );

	const add = async () => {
		if ( ! form.name || ! form.start_date || ! form.end_date ) {
			setMsg( 'Name, start date, and end date are required.' );
			return;
		}
		if ( ! form.election_type && ! noElec ) {
			setMsg( 'Choose the election type for this period.' );
			return;
		}
		setSaving( true );
		setMsg( '' );
		const r = await apiSend( 'POST', `/filing-periods`, {
			...form,
			election_type: noElec ? 'local' : form.election_type,
			beginning_balance: parseFloat( form.beginning_balance ) || 0,
		} );
		const d = await r.json();
		if ( d.id ) {
			load();
			offerAssign( d.id, form.name ).then( () =>
				noElec ? null : offerElection( d.id, form.name )
			);
			setForm( {
				name: '',
				start_date: '',
				end_date: '',
				beginning_balance: '',
				election_type: '',
			} );
			setMsg( '✓ Period added.' );
		} else {
			setMsg( d.message || 'Error adding period.' );
		}
		setSaving( false );
		setTimeout( () => setMsg( '' ), 3000 );
	};

	const startEdit = ( p ) => {
		setEditId( p.id );
		setEditForm( {
			...p,
			election_type: ELECTION_TYPES.includes( p.election_type )
				? p.election_type
				: '',
		} );
	};

	const saveEdit = async () => {
		const r = await apiSend( 'PUT', `/filing-periods/${ editId }`, {
			...editForm,
			beginning_balance: parseFloat( editForm.beginning_balance ) || 0,
		} );
		if ( ! r.ok ) {
			// Keep the form open so the change is not lost, and say why it was refused.
			const d = await r.json().catch( () => ( {} ) );
			setMsg( d.message || 'Error saving period.' );
			setTimeout( () => setMsg( '' ), 4000 );
			return;
		}
		const savedId = editId;
		const savedName = editForm.name;
		// Only a changed election is worth asking about; editing dates or the name must not reopen the question.
		const electionChanged =
			periods.find( ( p ) => p.id === savedId )?.election_type !==
			editForm.election_type;
		setEditId( null );
		load();
		offerAssign( savedId, savedName ).then( () =>
			electionChanged ? offerElection( savedId, savedName ) : null
		);
	};

	const del = async ( id ) => {
		const ok = await confirmAction( 'Delete this filing period?' );
		if ( ! ok ) {
			return;
		}
		await deletePeriod( id );
		load();
	};

	return (
		<>
			<p className="page-desc">
				Filing periods let you segment donations and expenses by
				reporting quarter. Beginning balance for each period carries
				forward from the prior period&apos;s ending balance. A record
				keeps the period it was given, so after you add or change a
				period you are asked whether to move the records dated inside
				it. The calendar button on a row does the same at any time.
				{ ! noElec &&
					` If you change a period's election you are also asked whether to set the election of the donations dated inside it (filed donations are never changed).` }{ ' ' }
				If two periods overlap, new records go to the shorter one.
			</p>
			<div className="lsfh-box lsfh-fp-table-wrap">
				<table
					className="lsfh-table"
					style={ { tableLayout: 'fixed', width: '100%' } }
				>
					<thead>
						<tr>
							<th style={ { width: '18%' } }>Name</th>
							{ ! noElec && (
								<th style={ { width: '16%' } }>Election</th>
							) }
							<th style={ { width: '15%' } }>Start</th>
							<th style={ { width: '15%' } }>End</th>
							<th
								className="lsfh-th--right"
								style={ { width: '20%' } }
							>
								Beginning Balance{ ' ' }
								<InfoTip
									text={ tipText }
									open={ infoOpen === 'header' }
									onToggle={ () => toggleInfo( 'header' ) }
								/>
							</th>
							<th style={ { width: '16%' } }></th>
						</tr>
					</thead>
					<tbody>
						{ periods.length === 0 && (
							<tr>
								<td colSpan={ noElec ? 5 : 6 }>
									<div className="lsfh-empty">
										No filing periods yet.
									</div>
								</td>
							</tr>
						) }
						{ periods.map( ( p ) =>
							editId === p.id ? (
								<PeriodEditRow
									key={ p.id }
									editForm={ editForm }
									setEditForm={ setEditForm }
									noElec={ noElec }
									onSave={ saveEdit }
									onCancel={ () => setEditId( null ) }
								/>
							) : (
								<PeriodRow
									key={ p.id }
									p={ p }
									noElec={ noElec }
									onAssign={ ( row ) =>
										offerAssign( row.id, row.name, true )
									}
									onEdit={ startEdit }
									onDelete={ del }
								/>
							)
						) }
					</tbody>
				</table>
			</div>
			<div className="lsfh-section-hdr">Add Period</div>
			<div className="lsfh-fp-form">
				<div className="lsfh-two-col">
					<div className="lsfh-field">
						<label htmlFor="lsfh-settings-period-name">
							Period Name
						</label>
						<input
							id="lsfh-settings-period-name"
							type="text"
							value={ form.name }
							onChange={ ( e ) => set( 'name', e.target.value ) }
							placeholder="Q1 2026"
						/>
					</div>
					{ ! noElec && (
						<div className="lsfh-field">
							<label htmlFor="lsfh-settings-election-type">
								Election Type
							</label>
							<ElectionTypeSelect
								id="lsfh-settings-election-type"
								value={ form.election_type }
								onChange={ ( v ) => set( 'election_type', v ) }
							/>
							<div
								style={ {
									fontSize: 'var(--fs-sm)',
									color: 'var(--muted)',
									marginTop: 4,
								} }
							>
								New contributions dated in this period get this
								election automatically. Pick Primary, General,
								Runoff, Special or Local for that to work.
							</div>
						</div>
					) }
				</div>
				<div className="lsfh-two-col">
					<div className="lsfh-field">
						<label htmlFor="lsfh-settings-start-date">
							Start Date
						</label>
						<SmartDate
							id="lsfh-settings-start-date"
							value={ form.start_date }
							onChange={ ( e ) =>
								set( 'start_date', e.target.value )
							}
						/>
					</div>
					<div className="lsfh-field">
						<label htmlFor="lsfh-settings-end-date">End Date</label>
						<SmartDate
							id="lsfh-settings-end-date"
							value={ form.end_date }
							onChange={ ( e ) =>
								set( 'end_date', e.target.value )
							}
						/>
					</div>
				</div>
				<div className="lsfh-field lsfh-field--narrow">
					<label htmlFor="lsfh-settings-beginning-balance-toggleinfo-label">
						Beginning Balance{ ' ' }
						<InfoTip
							text={ tipText }
							open={ infoOpen === 'label' }
							onToggle={ () => toggleInfo( 'label' ) }
						/>
					</label>
					<input
						id="lsfh-settings-beginning-balance-toggleinfo-label"
						type="number"
						step="0.01"
						min="0"
						value={ form.beginning_balance }
						onChange={ ( e ) =>
							set( 'beginning_balance', e.target.value )
						}
					/>
				</div>
				<div className="lsfh-edit-footer">
					<button
						className="btn btn-primary"
						onClick={ add }
						disabled={ saving }
					>
						<Plus size={ 14 } />{ ' ' }
						{ saving ? 'Adding…' : 'Add Period' }
					</button>
					{ msg && (
						<span
							className={ `form-msg ${
								msg.startsWith( '✓' )
									? 'form-msg--ok'
									: 'form-msg--err'
							}` }
						>
							{ msg }
						</span>
					) }
				</div>
			</div>
		</>
	);
}
