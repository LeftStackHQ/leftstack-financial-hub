const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );

module.exports = {
	...defaultConfig,
	entry: {
		admin: path.resolve( __dirname, 'src/admin/index.jsx' ),
	},
	output: {
		...defaultConfig.output,
		path: path.resolve( __dirname, 'assets/js' ),
		filename: '[name].js',
		// Files loaded on demand carry a hash of their content, so an update is never served from an old cache.
		chunkFilename: '[name].[contenthash:8].js',
		// Everything in assets/js is build output, and a changed on-demand file gets a new name, so old ones are removed.
		clean: true,
	},
};
