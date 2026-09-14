/* eslint stylistic/quote-props : 'off' */

const pluginNRules = {
	'n/hashbang'                              : 'off',
	'n/no-deprecated-api'                     : 'error',
	'n/no-missing-require'                    : 'off',
	'n/no-new-require'                        : 'error',
	'n/no-path-concat'                        : 'error',
	'n/no-process-exit'                       : 'off',
	'n/no-unpublished-import'                 : 'off',
	'n/no-unsupported-features/node-builtins' : 'off',

	'n/handle-callback-err' : [
		'error',
		'^(err|error)$',
	],
};

const pluginStylisticRules = {
	'stylistic/eol-last'                      : 'error',
	'stylistic/new-parens'                    : 'error',
	'stylistic/newline-per-chained-call'      : 'off',
	'stylistic/no-extra-semi'                 : 'error',
	'stylistic/no-floating-decimal'           : 'error',
	'stylistic/no-mixed-spaces-and-tabs'      : 'error',
	'stylistic/no-multi-spaces'               : 'off',
	'stylistic/no-tabs'                       : 'off',
	'stylistic/no-trailing-spaces'            : 'error',
	'stylistic/no-whitespace-before-property' : 'error',
	'stylistic/space-infix-ops'               : 'warn',


	'stylistic/array-bracket-spacing' : [
		'error',
		'always',
	],

	'stylistic/arrow-parens' : [
		'error',
		'as-needed',
		{
			'requireForBlockBody' : false,
		},
	],

	'stylistic/arrow-spacing' : [
		'error',
		{
			'after'  : true,
			'before' : true,
		},
	],

	'stylistic/block-spacing' : [
		'error',
		'always',
	],

	'stylistic/brace-style' : [
		'error',
		'stroustrup',
		{
			'allowSingleLine' : true,
		},
	],

	'stylistic/comma-dangle' : [
		'error',
		{
			'arrays'    : 'always-multiline',
			'exports'   : 'always-multiline',
			'functions' : 'never',
			'imports'   : 'always-multiline',
			'objects'   : 'always-multiline',
		},
	],

	'stylistic/comma-spacing' : [
		'error',
		{
			'after'  : true,
			'before' : false,
		},
	],

	'stylistic/comma-style' : [
		'error',
		'last',
	],

	'stylistic/dot-location' : [
		'error',
		'property',
	],


	'stylistic/function-call-spacing' : [
		'error',
		'never',
	],

	'stylistic/generator-star-spacing' : [
		'error',
		{
			'after'  : true,
			'before' : true,
		},
	],

	'stylistic/indent' : [
		'error',
		'tab',
		{
			'SwitchCase' : 1,
		},
	],

	'stylistic/key-spacing' : [
		'error',
		{
			'afterColon'  : true,
			'beforeColon' : true,
			'mode'        : 'minimum',

			'align' : {
				'afterColon'  : true,
				'beforeColon' : true,
				'mode'        : 'strict',
				'on'          : 'colon',
			},
		},
	],

	'stylistic/keyword-spacing' : [
		'error',
		{
			'after'  : true,
			'before' : true,
		},
	],

	'stylistic/linebreak-style' : [
		'error',
		'unix',
	],

	'stylistic/max-statements-per-line' : [
		'error',
		{
			'max' : 3,
		},
	],

	'stylistic/no-extra-parens' : [
		'error',
		'functions',
	],

	'stylistic/semi' : [
		'error',
		'always',
	],

	'stylistic/semi-spacing' : [
		'error',
		{
			'after'  : true,
			'before' : false,
		},
	],

	'stylistic/semi-style' : [
		'error',
		'last',
	],

	'stylistic/no-mixed-operators' : [
		'error',
		{
			'allowSamePrecedence' : true,
			'groups'              : [
				[
					'==',
					'!=',
					'===',
					'!==',
					'>',
					'>=',
					'<',
					'<=',
				],
				[
					'in',
					'instanceof',
				],
			],
		},
	],

	'stylistic/no-multiple-empty-lines' : [
		'error',
		{
			'max'    : 2,
			'maxBOF' : 0,
			'maxEOF' : 0,
		},
	],

	'stylistic/object-curly-spacing' : [
		'error',
		'always',
	],

	'stylistic/object-property-newline' : [
		'error',
		{
			'allowAllPropertiesOnSameLine' : true,
		},
	],

	'stylistic/operator-linebreak' : [
		'error',
		'after',
		{
			'overrides' : {
				':' : 'before',
				'?' : 'before',
			},
		},
	],
	'stylistic/padded-blocks' : [
		'error',
		{
			'blocks'   : 'never',
			'classes'  : 'never',
			'switches' : 'never',
		},
	],

	'stylistic/quotes' : [
		'error',
		'single',
		{
			'allowTemplateLiterals' : 'always',
			'avoidEscape'           : true,
		},
	],

	'stylistic/rest-spread-spacing' : [
		'error',
		'never',
	],

	'stylistic/space-before-blocks' : [
		'error',
		'always',
	],

	'stylistic/space-before-function-paren' : [
		'error',
		{
			'anonymous'  : 'always',
			'asyncArrow' : 'always',
			'named'      : 'never',
		},
	],

	'stylistic/space-in-parens' : [
		'error',
		'never',
	],

	'stylistic/space-unary-ops' : [
		'error',
		{
			'nonwords' : false,
			'words'    : true,
		},
	],

	'stylistic/spaced-comment' : [
		'error',
		'always',
		{
			'block' : {
				'balanced'   : true,
				'exceptions' : [
					'*',
				],
				'markers' : [
					'*package',
					'!',
					',',
					':',
					'::',
					'flow-include',
				],
			},
			'line' : {
				'markers' : [
					'*package',
					'!',
					'/',
					',',
				],
			},
		},
	],

	'stylistic/template-curly-spacing' : [
		'error',
		'never',
	],

	'stylistic/template-tag-spacing' : [
		'error',
		'never',
	],

	'stylistic/wrap-iife' : [
		'error',
		'any',
		{
			'functionPrototypeMethods' : true,
		},
	],

	'stylistic/yield-star-spacing' : [
		'error',
		'both',
	],
};


const projectRules = {
	'accessor-pairs'               : 'error',
	'camelcase'                    : 'off',
	'class-methods-use-this'       : 'off',
	'constructor-super'            : 'error',
	'eqeqeq'                       : 'warn',
	'new-cap'                      : 'off',
	'no-array-constructor'         : 'error',
	'no-caller'                    : 'error',
	'no-class-assign'              : 'error',
	'no-compare-neg-zero'          : 'error',
	'no-cond-assign'               : 'error',
	'no-const-assign'              : 'error',
	'no-control-regex'             : 'error',
	'no-debugger'                  : 'error',
	'no-delete-var'                : 'error',
	'no-dupe-args'                 : 'error',
	'no-dupe-class-members'        : 'error',
	'no-dupe-keys'                 : 'error',
	'no-duplicate-case'            : 'error',
	'no-empty-character-class'     : 'error',
	'no-empty-pattern'             : 'error',
	'no-eval'                      : 'error',
	'no-ex-assign'                 : 'error',
	'no-extend-native'             : 'error',
	'no-extra-bind'                : 'error',
	'no-extra-boolean-cast'        : 'error',
	'no-fallthrough'               : 'error',
	'no-func-assign'               : 'error',
	'no-global-assign'             : 'error',
	'no-implied-eval'              : 'error',
	'no-invalid-regexp'            : 'error',
	'no-irregular-whitespace'      : 'error',
	'no-iterator'                  : 'error',
	'no-label-var'                 : 'error',
	'no-lone-blocks'               : 'error',
	'no-multi-str'                 : 'error',
	'no-new'                       : 'error',
	'no-new-func'                  : 'error',
	'no-new-native-nonconstructor' : 'error',
	'no-new-wrappers'              : 'error',
	'no-obj-calls'                 : 'error',
	'no-object-constructor'        : 'error',
	'no-octal'                     : 'error',
	'no-octal-escape'              : 'error',
	'no-proto'                     : 'error',
	'no-redeclare'                 : 'error',
	'no-regex-spaces'              : 'error',
	'no-self-assign'               : 'error',
	'no-self-compare'              : 'error',
	'no-sequences'                 : 'error',
	'no-shadow-restricted-names'   : 'error',
	'no-sparse-arrays'             : 'error',
	'no-template-curly-in-string'  : 'error',
	'no-this-before-super'         : 'error',
	'no-throw-literal'             : 'error',
	'no-undef'                     : 'error',
	'no-undef-init'                : 'error',
	'no-unexpected-multiline'      : 'error',
	'no-unmodified-loop-condition' : 'error',
	'no-unreachable'               : 'error',
	'no-unsafe-finally'            : 'error',
	'no-unsafe-negation'           : 'error',
	'no-useless-call'              : 'error',
	'no-useless-computed-key'      : 'error',
	'no-useless-constructor'       : 'error',
	'no-useless-escape'            : 'error',
	'no-useless-rename'            : 'error',
	'no-useless-return'            : 'error',
	'no-with'                      : 'error',
	'prefer-promise-reject-errors' : 'error',
	'symbol-description'           : 'error',
	'use-isnan'                    : 'error',
	'yoda'                         : 'error',


	'curly' : [
		'error',
		'multi-line',
	],

	'no-constant-condition' : [
		'error',
		{
			'checkLoops' : false,
		},
	],

	'no-inner-declarations' : [
		'error',
		'functions',
	],

	'no-labels' : [
		'error',
		{
			'allowLoop'   : false,
			'allowSwitch' : false,
		},
	],

	'no-return-assign' : [
		'error',
		'except-parens',
	],

	'no-unneeded-ternary' : [
		'error',
		{
			'defaultAssignment' : false,
		},
	],

	'no-unused-expressions' : [
		'error',
		{
			'allowShortCircuit'    : true,
			'allowTaggedTemplates' : true,
			'allowTernary'         : true,
		},
	],

	'no-unused-vars' : [
		'warn',
	],

	'no-use-before-define' : [
		'error',
		{
			'classes'   : false,
			'functions' : false,
			'variables' : false,
		},
	],

	'one-var' : [
		'error',
		{
			'initialized' : 'never',
		},
	],


	'unicode-bom' : [
		'error',
		'never',
	],

	'valid-typeof' : [
		'error',
		{
			'requireStringLiterals' : true,
		},
	],


	...pluginNRules,
	...pluginStylisticRules,
};


export default projectRules;
