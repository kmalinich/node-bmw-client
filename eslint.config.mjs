import globals from 'globals';

import { defineConfig } from 'eslint/config';

import js from '@eslint/js';

import { default as promise } from 'eslint-plugin-promise';
import node                   from 'eslint-plugin-n';

import projectGlobals from './eslint.globals.mjs';
import projectRules   from './eslint.rules.mjs';


const eslintConfigArray = [
	{
		ignores : [
			'.git/',
			'candump/',
			'node_modules/',
			'test/',
		],
	},

	{
		files : [
			'*.{cjs,mjs,js}',
			'lib/*.{cjs,mjs,js}',
			'modules/*.{cjs,mjs,js}',
			'share/*.{cjs,mjs,js}',
		],

		plugins : {
			js,
			node,
			promise,
		},

		extends : [
			'js/recommended',
			'node/recommended',
			'promise/flat/recommended',
		],

		languageOptions : {
			ecmaVersion : 'latest',

			sourceType : 'module',

			globals : {
				...globals.amd,
				...globals.es2021,
				...globals.node,

				...projectGlobals,
			},
		},

		rules : projectRules,
	},
];


export default defineConfig(eslintConfigArray);
