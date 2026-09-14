import { defineConfig } from 'eslint/config';

import js        from '@eslint/js';
import node      from 'eslint-plugin-n';
import stylistic from '@stylistic/eslint-plugin';

import { default as promise } from 'eslint-plugin-promise';

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
			stylistic,
		},

		extends : [
			'js/recommended',
			'node/recommended',
			'promise/flat/recommended',
			'stylistic/recommended',
		],

		languageOptions : {
			ecmaVersion : 'latest',

			sourceType : 'module',

			globals : {
				...projectGlobals,
			},
		},

		rules : projectRules,
	},
];


export default defineConfig(eslintConfigArray);
