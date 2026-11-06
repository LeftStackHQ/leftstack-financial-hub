import { useState, useEffect } from '@wordpress/element';
import { apiGet, apiSend, confirmAction, fmtC } from '../shared';
import { Check, X, Pencil, Trash2, Plus } from 'lucide-react';

/* ─── Budget Categories Tab ───────────────────────────────── */
// The colours offered in the category colour picker. (Category badges in Expenditures use CATEGORY_BADGE_COLORS.)
const CATEGORY_SWATCHES = [
	'#ef4444',
	'#f97316',
	'#eab308',
	'#22c55e',
	'#06b6d4',
	'#3b82f6',
	'#8b5cf6',
	'#ec4899',
	'#0d9488',
	'#64748b',
	'#a16207',
	'#dc2626',
];

function ColorSwatch( { selected, onChange } ) {
	return (
		<div className="lsfh-color-swatch">
			{ CATEGORY_SWATCHES.map( ( col ) => (
				<button
					key={ col }
					onClick={ () => onChange( selected === col ? null : col ) }
					title={ col }
					className={ `lsfh-color-swatch__btn${
						selected === col
							? ' lsfh-color-swatch__btn--selected'
							: ''
					}` }
					style={ {
						'--swatch-color': col,
						...( selected === col
							? {
									outline: `2px solid ${ col }`,
									outlineOffset: 2,
									boxShadow: '0 0 0 1px #fff inset',
							  }
							: {} ),
					} }
				/>
			) ) }
		</div>
	);
}

export function CategoriesTab() {
	const [ cats, setCats ] = useState( [] );
	const [ name, setName ] = useState( '' );
	const [ newColor, setNewColor ] = useState( null );
	const [ newBudget, setNewBudget ] = useState( '' );
	const [ saving, setSave ] = useState( false );
	const [ editId, setEditId ] = useState( null );
	const [ editName, setEditName ] = useState( '' );
	const [ editColor, setEditColor ] = useState( null );
	const [ editBudget, setEditBudget ] = useState( '' );

	const [ loadErr, setLoadErr ] = useState( '' );
	const load = () =>
		apiGet( `/categories`, `_t=${ Date.now() }` )
			.then( ( r ) => r.json() )
			.then( ( d ) => {
				setCats( Array.isArray( d ) ? d : [] );
				setLoadErr( '' );
			} )
			.catch( () =>
				setLoadErr( 'Failed to load categories. Please refresh.' )
			);
	useEffect( () => {
		load();
	}, [] );

	const add = async () => {
		if ( ! name.trim() ) {
			return;
		}
		setSave( true );
		const r = await apiSend( 'POST', `/categories`, {
			name,
			color: newColor,
			budget_amount: parseFloat( newBudget ) || 0,
		} );
		const d = await r.json();
		if ( d.id ) {
			load();
			setName( '' );
			setNewColor( null );
			setNewBudget( '' );
		}
		setSave( false );
	};

	const startEdit = ( c ) => {
		setEditId( c.id );
		setEditName( c.name );
		setEditColor( c.color || null );
		setEditBudget( c.budget_amount ? String( c.budget_amount ) : '' );
	};
	const cancelEdit = () => {
		setEditId( null );
		setEditName( '' );
		setEditColor( null );
		setEditBudget( '' );
	};

	const saveEdit = async ( id ) => {
		if ( ! editName.trim() ) {
			return;
		}
		await apiSend( 'PUT', `/categories/${ id }`, {
			name: editName,
			color: editColor,
			budget_amount: parseFloat( editBudget ) || 0,
		} );
		setCats( ( prev ) =>
			prev.map( ( c ) =>
				c.id === id
					? {
							...c,
							name: editName,
							color: editColor,
							budget_amount: parseFloat( editBudget ) || 0,
					  }
					: c
			)
		);
		cancelEdit();
	};

	const del = async ( id ) => {
		const ok = await confirmAction(
			'Delete this category? Existing expenses will become uncategorized.'
		);
		if ( ! ok ) {
			return;
		}
		await apiSend( 'DELETE', `/categories/${ id }` );
		setCats( ( prev ) => prev.filter( ( c ) => c.id !== id ) );
	};

	return (
		<>
			<p className="page-desc">
				Create budget categories for organizing your campaign expenses.
				Pick a color, click the pencil to rename, or the trash to
				delete.
			</p>
			{ loadErr && <p className="form-msg form-msg--err">{ loadErr }</p> }
			<div className="lsfh-cat-grid">
				{ cats.map( ( c ) => (
					<div
						key={ c.id }
						className="lsfh-cat-card"
						style={ { '--cat-color': c.color || 'var(--p)' } }
					>
						{ editId === c.id ? (
							<div className="lsfh-cat-edit">
								<div className="lsfh-cat-edit__row">
									<input
										className="lsfh-input"
										value={ editName }
										onChange={ ( e ) =>
											setEditName( e.target.value )
										}
										onKeyDown={ ( e ) => {
											if ( e.key === 'Enter' ) {
												saveEdit( c.id );
											}
											if ( e.key === 'Escape' ) {
												cancelEdit();
											}
										} }
										ref={ ( node ) => node?.focus() }
									/>
									<button
										className="lsfh-icon-btn lsfh-icon-btn--save"
										onClick={ () => saveEdit( c.id ) }
										title="Save"
									>
										<Check size={ 13 } />
									</button>
									<button
										className="lsfh-icon-btn"
										onClick={ cancelEdit }
										title="Cancel"
									>
										<X size={ 13 } />
									</button>
								</div>
								<div className="lsfh-cat-color-sect">
									<div className="lsfh-swatch-label">
										Color
									</div>
									<ColorSwatch
										selected={ editColor }
										onChange={ setEditColor }
									/>
								</div>
								<div className="lsfh-cat-budget-sect">
									<div className="lsfh-swatch-label">
										Cycle Budget
									</div>
									<input
										className="lsfh-input lsfh-input--budget"
										type="number"
										min="0"
										step="0.01"
										placeholder="0.00"
										value={ editBudget }
										onChange={ ( e ) =>
											setEditBudget( e.target.value )
										}
									/>
								</div>
							</div>
						) : (
							<div className="lsfh-cat-row">
								{ c.color && <span className="lsfh-cat-dot" /> }
								<div className="lsfh-cat-name-wrap">
									<span className="lsfh-cat-name">
										{ c.name }
									</span>
									{ c.budget_amount > 0 && (
										<span className="lsfh-cat-budget">
											{ fmtC( c.budget_amount ) }
										</span>
									) }
								</div>
								<button
									className="lsfh-icon-btn"
									onClick={ () => startEdit( c ) }
									title="Edit"
								>
									<Pencil size={ 13 } />
								</button>
								<button
									className="lsfh-icon-btn lsfh-icon-btn-danger"
									onClick={ () => del( c.id ) }
									title="Delete"
								>
									<Trash2 size={ 13 } />
								</button>
							</div>
						) }
					</div>
				) ) }
			</div>

			<div className="lsfh-section-hdr">Add Category</div>
			<div className="lsfh-add-cat-card">
				<div className="lsfh-add-cat-row">
					<input
						className="lsfh-input"
						placeholder="Category name…"
						value={ name }
						onChange={ ( e ) => setName( e.target.value ) }
						onKeyDown={ ( e ) => e.key === 'Enter' && add() }
					/>
					<input
						className="lsfh-input lsfh-input--budget"
						type="number"
						min="0"
						step="0.01"
						placeholder="Cycle budget…"
						value={ newBudget }
						onChange={ ( e ) => setNewBudget( e.target.value ) }
					/>
					<button
						className="btn btn-primary"
						onClick={ add }
						disabled={ saving || ! name.trim() }
					>
						<Plus size={ 14 } /> Add
					</button>
				</div>
				<div className="lsfh-add-cat-color">
					<div className="lsfh-swatch-label">
						Color{ ' ' }
						<span className="lsfh-swatch-label__opt">
							(optional)
						</span>
					</div>
					<ColorSwatch
						selected={ newColor }
						onChange={ setNewColor }
					/>
				</div>
			</div>
		</>
	);
}
