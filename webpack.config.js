// eslint: ignore

"use strict";

// eslint-disable-next-line
const path = require("path");

module.exports = {
	target: "node",
	entry: "./src/extension.ts",
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "extension.js",
		libraryTarget: "commonjs2",
		devtoolModuleFilenameTemplate: "../[resource-path]"
	},
	devtool: "source-map",
	externals: {
		vscode: "commonjs vscode"
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
				test: /\.(png|svg|jpg|gif)$/,
				use: {
					loader: "file-loader",
					options: {
						name: "resources/[name].[ext]"
					}
				}
			}
		]
	}
};