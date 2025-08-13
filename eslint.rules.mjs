const pluginNRules = {
	'n/hashbang'              : 'off',
	'n/no-missing-require'    : 'off',
	'n/no-process-exit'       : 'off',
	'n/no-unpublished-import' : 'off',
};

const projectRules = {
	'accessor-pairs'                : 'error',
	'camelcase'                     : 'off',
	'class-methods-use-this'        : 'off',
	'constructor-super'             : 'error',
	'eol-last'                      : 'error',
	'eqeqeq'                        : 'warn',
	'new-cap'                       : 'off',
	'new-parens'                    : 'error',
	'newline-per-chained-call'      : 'off',
	'no-array-constructor'          : 'error',
	'no-caller'                     : 'error',
	'no-class-assign'               : 'error',
	'no-compare-neg-zero'           : 'error',
	'no-cond-assign'                : 'error',
	'no-const-assign'               : 'error',
	'no-control-regex'              : 'error',
	'no-debugger'                   : 'error',
	'no-delete-var'                 : 'error',
	'no-dupe-args'                  : 'error',
	'no-dupe-class-members'         : 'error',
	'no-dupe-keys'                  : 'error',
	'no-duplicate-case'             : 'error',
	'no-empty-character-class'      : 'error',
	'no-empty-pattern'              : 'error',
	'no-eval'                       : 'error',
	'no-ex-assign'                  : 'error',
	'no-extend-native'              : 'error',
	'no-extra-bind'                 : 'error',
	'no-extra-boolean-cast'         : 'error',
	'no-extra-semi'                 : 'error',
	'no-fallthrough'                : 'error',
	'no-floating-decimal'           : 'error',
	'no-func-assign'                : 'error',
	'no-global-assign'              : 'error',
	'no-implied-eval'               : 'error',
	'no-invalid-regexp'             : 'error',
	'no-irregular-whitespace'       : 'error',
	'no-iterator'                   : 'error',
	'no-label-var'                  : 'error',
	'no-lone-blocks'                : 'error',
	'no-mixed-spaces-and-tabs'      : 'error',
	'no-multi-spaces'               : 'off',
	'no-multi-str'                  : 'error',
	'no-negated-in-lhs'             : 'error',
	'no-new'                        : 'error',
	'no-new-func'                   : 'error',
	'no-new-object'                 : 'error',
	'no-new-require'                : 'error',
	'no-new-symbol'                 : 'error',
	'no-new-wrappers'               : 'error',
	'no-obj-calls'                  : 'error',
	'no-octal'                      : 'error',
	'no-octal-escape'               : 'error',
	'no-path-concat'                : 'error',
	'no-proto'                      : 'error',
	'no-redeclare'                  : 'error',
	'no-regex-spaces'               : 'error',
	'no-return-await'               : 'error',
	'no-self-assign'                : 'error',
	'no-self-compare'               : 'error',
	'no-sequences'                  : 'error',
	'no-shadow-restricted-names'    : 'error',
	'no-sparse-arrays'              : 'error',
	'no-tabs'                       : 'off',
	'no-template-curly-in-string'   : 'error',
	'no-this-before-super'          : 'error',
	'no-throw-literal'              : 'error',
	'no-trailing-spaces'            : 'error',
	'no-undef'                      : 'error',
	'no-undef-init'                 : 'error',
	'no-unexpected-multiline'       : 'error',
	'no-unmodified-loop-condition'  : 'error',
	'no-unreachable'                : 'error',
	'no-unsafe-finally'             : 'error',
	'no-unsafe-negation'            : 'error',
	'no-useless-call'               : 'error',
	'no-useless-computed-key'       : 'error',
	'no-useless-constructor'        : 'error',
	'no-useless-escape'             : 'error',
	'no-useless-rename'             : 'error',
	'no-useless-return'             : 'error',
	'no-whitespace-before-property' : 'error',
	'no-with'                       : 'error',
	'prefer-promise-reject-errors'  : 'error',
	'space-infix-ops'               : 'warn',
	'symbol-description'            : 'error',
	'use-isnan'                     : 'error',
	'yoda'                          : 'error',


	'array-bracket-spacing' : [
		'error',
		'always',
	],

	'arrow-spacing' : [
		'error',
		{
			'after'  : true,
			'before' : true,
		},
	],

	'block-spacing' : [
		'error',
		'always',
	],

	'brace-style' : [
		'error',
		'stroustrup',
		{
			'allowSingleLine' : true,
		},
	],

	'comma-dangle' : [
		'error',
		{
			'arrays'    : 'always-multiline',
			'exports'   : 'always-multiline',
			'functions' : 'never',
			'imports'   : 'always-multiline',
			'objects'   : 'always-multiline',
		},
	],

	'comma-spacing' : [
		'error',
		{
			'after'  : true,
			'before' : false,
		},
	],

	'comma-style' : [
		'error',
		'last',
	],

	'curly' : [
		'error',
		'multi-line',
	],

	'dot-location' : [
		'error',
		'property',
	],

	'func-call-spacing' : [
		'error',
		'never',
	],

	'generator-star-spacing' : [
		'error',
		{
			'after'  : true,
			'before' : true,
		},
	],

	'handle-callback-err' : [
		'error',
		'^(err|error)$',
	],

	'indent' : [
		'error',
		'tab',
		{
			'SwitchCase' : 1,
		},
	],

	'key-spacing' : [
		'error',
		{
			'afterColon' : true,
			'align'      : {
				'afterColon'  : true,
				'beforeColon' : true,
				'mode'        : 'strict',
				'on'          : 'colon',
			},
			'beforeColon' : true,
			'mode'        : 'minimum',
		},
	],

	'keyword-spacing' : [
		'error',
		{
			'after'  : true,
			'before' : true,
		},
	],

	'linebreak-style' : [
		'error',
		'unix',
	],


	'no-constant-condition' : [
		'error',
		{
			'checkLoops' : false,
		},
	],

	'no-extra-parens' : [
		'error',
		'functions',
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

	'no-mixed-operators' : [
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

	'no-multiple-empty-lines' : [
		'error',
		{
			'max'    : 2,
			'maxBOF' : 0,
			'maxEOF' : 0,
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

	'object-curly-spacing' : [
		'error',
		'always',
	],

	'object-property-newline' : [
		'error',
		{
			'allowMultiplePropertiesPerLine' : true,
		},
	],

	'one-var' : [
		'error',
		{
			'initialized' : 'never',
		},
	],

	'operator-linebreak' : [
		'error',
		'after',
		{
			'overrides' : {
				':' : 'before',
				'?' : 'before',
			},
		},
	],

	'padded-blocks' : [
		'error',
		{
			'blocks'   : 'never',
			'classes'  : 'never',
			'switches' : 'never',
		},
	],

	'quotes' : [
		'error',
		'single',
		{
			'allowTemplateLiterals' : true,
			'avoidEscape'           : true,
		},
	],

	'rest-spread-spacing' : [
		'error',
		'never',
	],

	'semi' : [
		'error',
		'always',
	],

	'semi-spacing' : [
		'error',
		{
			'after'  : true,
			'before' : false,
		},
	],

	'semi-style' : [
		'error',
		'last',
	],

	'space-before-blocks' : [
		'error',
		'always',
	],

	'space-before-function-paren' : [
		'error',
		{
			'anonymous'  : 'always',
			'asyncArrow' : 'always',
			'named'      : 'never',
		},
	],

	'space-in-parens' : [
		'error',
		'never',
	],

	'space-unary-ops' : [
		'error',
		{
			'nonwords' : false,
			'words'    : true,
		},
	],

	'spaced-comment' : [
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

	'template-curly-spacing' : [
		'error',
		'never',
	],

	'template-tag-spacing' : [
		'error',
		'never',
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

	'wrap-iife' : [
		'error',
		'any',
		{
			'functionPrototypeMethods' : true,
		},
	],

	'yield-star-spacing' : [
		'error',
		'both',
	],

	...pluginNRules,
};


export default projectRules;
