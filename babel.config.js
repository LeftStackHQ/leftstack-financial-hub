// Use the classic JSX transform (React.createElement) so the bundle does
// NOT require window.ReactJSXRuntime, which only exists in WordPress 6.4+.
// This makes the plugin compatible with WP 6.0+.
module.exports = {
	presets: [
		[
			require.resolve( '@wordpress/babel-preset-default' ),
			{ runtime: 'classic' },
		],
	],
};
