// ── Page controls ──────────────────────────────────────────────
// First, Previous, "page / pages", Next, Last. Draws nothing for a single page. `titled` adds
// the First page and Last page tooltips some lists show.
export function Pagination( { page, pages, setPage, titled } ) {
	if ( pages <= 1 ) {
		return null;
	}
	return (
		<div className="lsfh-pagination">
			<button
				className="btn btn-ghost btn-sm"
				disabled={ page <= 1 }
				onClick={ () => setPage( 1 ) }
				title={ titled ? 'First page' : undefined }
			>
				«
			</button>
			<button
				className="btn btn-ghost btn-sm"
				disabled={ page <= 1 }
				onClick={ () => setPage( ( p ) => p - 1 ) }
			>
				‹ Prev
			</button>
			<span className="lsfh-pagination-info">
				{ page } / { pages }
			</span>
			<button
				className="btn btn-ghost btn-sm"
				disabled={ page >= pages }
				onClick={ () => setPage( ( p ) => p + 1 ) }
			>
				Next ›
			</button>
			<button
				className="btn btn-ghost btn-sm"
				disabled={ page >= pages }
				onClick={ () => setPage( pages ) }
				title={ titled ? 'Last page' : undefined }
			>
				»
			</button>
		</div>
	);
}
