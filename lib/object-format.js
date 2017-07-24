'use strict';

var _jsonColorizer = require('json-colorizer');
var log = require('log-output');

var _jsonColorizer2 = _interopRequireDefault(_jsonColorizer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function object_format(object) {
	var json = {
		str: JSON.stringify(object, null, 2),
		opt: {
			colors: {
				COMMA: log.chalk.boldwhite,
				COLON: log.chalk.boldwhite,

				BOOLEAN_LITERAL: log.chalk.italicornange,
				NULL_LITERAL: log.chalk.italicgray,

				STRING_KEY: log.chalk.blue,
				NUMBER_LITERAL: log.chalk.cyan,

				BRACE: log.chalk.gray,
				BRACKET: log.chalk.gray,
				STRING_LITERAL: log.chalk.yellow
			}
		}
	};

	return (0, _jsonColorizer2.default)(json.str, json.opt);
}

module.exports = object_format;
