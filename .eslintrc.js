module.exports = {
	"parser": "@typescript-eslint/parser",
	"plugins": ["@typescript-eslint"],
	"env": {
		"es6": true,
		"commonjs": true,
		"browser": true
	},
	"extends": [
		"plugin:@typescript-eslint/recommended"
	],
	"parserOptions": {
		"project": "./tsconfig.json",
		"ecmaFeatures": {
			"jsx": true
		}
	},
	"rules": {
		"@typescript-eslint/indent": "off",
		"@typescript-eslint/no-parameter-properties": "off",
		"@typescript-eslint/no-empty-function": "off"
	}
};