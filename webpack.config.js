// eslint: ignore

"use strict";

// eslint-disable-next-line
const path = require("path");

module.exports = {
	target: "node",
	node: {
		__dirname: false,
		__filename: false
	},
	entry: "./src/extension.ts",
	context: __dirname,
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "extension.js",
		libraryTarget: "commonjs2",
		devtoolModuleFilenameTemplate: "../[resource-path]"
	},
	devtool: "source-map",
	externals: {
		vscode: "commonjs vscode",
		trash: "trash"
	},
	resolve: {
		extensions: [".ts", ".js"]
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				exclude: /node_modules/,
				use: [
					{
						loader: "ts-loader"
					}
				]
			},
			{
				test: /\.(png|svg|jpg|gif|html)$/,
				exclude: /node_modules/,
				use: {
					loader: "file-loader",
					options: {
						name: "resources/[name].[ext]"
					}
				}
			},
			{
				test: /node_modules\/trash\/(index\.js)/,
				use: {
					loader: "file-loader",
					options: {
						name: "trash/[name].[ext]"
					}
				}
			}
		]
	}
};