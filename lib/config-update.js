const object_format = require('object-format');
const object_path   = require('object-path');
const defaults      = require('defaults-deep');
os = require('os');

app_name = 'bmwcd';
config = require('../config.json');
status = require('../status.json');

const config_default = require('config-default');
const status_default = require('status-default');

const config_transform = {
	engine : {
		rpm : (input) => {
			return Math.round(input);
		},
	},
};

// update('engine.rpm', 1235);
function update(key, value_new) {
	let value_old = object_path.get(config, key);

	if (value_new === value_old) {
		return false;
	}

	// TODO: fire update event

	object_path.set(config, key, value_new);
	return true;
}

// Update current config and populate any values that are present in
// the default config, but missing in the current config
function overlay() {
	config = defaults(config, config_default);
	status = defaults(status, status_default);
}

console.log(object_format(config));
console.log('');
overlay();
console.log('');
console.log(object_format(config));

module.exports = {
	data      : config,
	transform : config_transform,

	update : (key, value_new) => { update(key, value_new); },
};



