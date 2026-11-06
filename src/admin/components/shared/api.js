import apiFetch from '@wordpress/api-fetch';

// ── Requests to the plugin's REST API ──────────────────────────
// These use WordPress's own apiFetch (@wordpress/api-fetch), which adds the REST root, the
// nonce and the user's locale, and works under both permalink styles. They hand back the
// response object, so callers keep their own .then( ( r ) => r.json() ) handling.
// apiGet( '/donations', { page: 2 } )      a read, with an optional query
// apiSend( 'POST', '/donations', { ... } ) a write, with an optional JSON body
// apiUpload( '/upload/receipt', formData ) a file upload

/** The plugin's REST namespace, relative to the REST root. */
const NAMESPACE = '/leftstack-financial-hub/v1';

/**
 * Run a request and always give back the response, even for a 4xx or 5xx.
 *
 * apiFetch rejects with the Response itself when the status is not 2xx (and parse is off). The
 * screens read the status and message of a refused request, so it is returned like any other.
 * A request that never got an answer (offline) still throws, as it always has.
 *
 * @param {Object} options apiFetch options (path, method, data, body).
 * @return {Promise<Response>} The response.
 */
async function request( options ) {
	try {
		return await apiFetch( { parse: false, ...options } );
	} catch ( error ) {
		if ( error instanceof window.Response ) {
			return error;
		}
		throw error;
	}
}

/**
 * A REST path with a query string added, correct whether or not the path already has one.
 *
 * @param {string}                        path    Endpoint path, with leading slash.
 * @param {string|URLSearchParams|Object} [query] Query string, URLSearchParams, or plain object.
 * @return {string} The path including the namespace and the query.
 */
function withQuery( path, query = '' ) {
	let qs;
	if ( query instanceof URLSearchParams ) {
		qs = query.toString();
	} else if ( query && typeof query === 'object' ) {
		qs = new URLSearchParams( query ).toString();
	} else {
		qs = String( query );
	}
	const full = `${ NAMESPACE }${ path }`;
	if ( ! qs ) {
		return full;
	}
	return `${ full }${ full.includes( '?' ) ? '&' : '?' }${ qs }`;
}

export function apiGet( path, query = '' ) {
	return request( { path: withQuery( path, query ) } );
}

export function apiSend( method, path, body ) {
	return request( {
		method,
		path: withQuery( path ),
		...( body === undefined ? {} : { data: body } ),
	} );
}

export function apiUpload( path, formData ) {
	return request( {
		method: 'POST',
		path: withQuery( path ),
		body: formData,
	} );
}

/**
 * The JSON body of a response, or an Error carrying the server's message when the request failed.
 * Lets a screen treat a refused or broken request as a failure instead of showing its error body as data.
 *
 * @param {Response} response What apiGet() or apiSend() returned.
 * @return {Promise<Object>} The parsed body.
 */
export async function readJson( response ) {
	const body = await response.json().catch( () => ( {} ) );
	if ( ! response.ok ) {
		throw new Error( body.message || '' );
	}
	return body;
}
