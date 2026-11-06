/**
 * ESLint settings for editors and for `wp-scripts lint-js`.
 *
 * The same rules `wp-scripts lint-js` already uses (the WordPress set). Without this file
 * the build tool applied them internally but editors found no configuration and flagged
 * every `import` as an error.
 */
module.exports = {
	root: true,
	extends: [ 'plugin:@wordpress/eslint-plugin/recommended' ],
};
