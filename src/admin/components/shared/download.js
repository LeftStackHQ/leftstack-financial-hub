/**
 * Hand a file to the browser as a download.
 *
 * @param {Blob}   blob     The file's content.
 * @param {string} filename The name the browser saves it under.
 */
export function saveFile( blob, filename ) {
	const url = URL.createObjectURL( blob );
	const a = document.createElement( 'a' );
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL( url );
}
