/* eslint no-global-assign: 0 */

const write_options = { spaces : 2 };

const defaults = require('defaults-deep');
const jsonfile = require('jsonfile');

const file_config = app_path + '/config.json';
const file_status = app_path + '/status.json';

const config_default = require('config-default');
const status_default = require('status-default');

const status_lights_default = require('status-lights-default');
const status_mid_default    = require('status-mid-default');

// Read config+status
function read(read_cb = null) {
	json.config_read(() => { // Read JSON config file
		json.status_read(() => { // Read JSON status file
			json.status_reset_basic(read_cb);
		}, read_cb);
	}, read_cb);
}

// Reset both modules and status vars
function reset(reset_cb = null) {
	json.modules_reset(() => { // Set modules as not ready
		json.status_reset(() => { // Reset some variables
			switch (config.json.write_on_reset) {
				case true:
					json.write(() => { // Write JSON files
						typeof reset_cb === 'function' && process.nextTick(reset_cb);
						reset_cb = undefined;
					});
					break;

				default:
					typeof reset_cb === 'function' && process.nextTick(reset_cb);
					reset_cb = undefined;
			}
		});
	});
}

// Write config+status
function write(write_cb = null) {
	json.config_write(() => { // Write JSON config file
		json.status_write(write_cb); // Write JSON status file
	}, write_cb);
}

// Read config JSON
function config_read(config_read_cb = null) {
	jsonfile.readFile(file_config, (error, obj) => {
		if (error !== null) {
			log.msg({ msg : 'Failed to read config, error ' + error.errno + ' (' + error.code + ')' });

			config = config_default;
			json.config_write(config_read_cb);
			return false;
		}

		// Lay the default values on top of the read object,
		// in case new values were added
		config = defaults(obj, config_default);

		log.msg({ msg : 'Read config' });

		typeof config_read_cb === 'function' && process.nextTick(config_read_cb);
		config_read_cb = undefined;
	});
}

// Write config JSON
function config_write(config_write_cb = null) {
	// Don't write if empty
	if (typeof config.system === 'undefined') {
		log.msg({ msg : 'Failed to write config, config object empty' });

		if (typeof config_write_cb !== 'function') return;

		setTimeout(() => {
			process.nextTick(config_write_cb);
			config_write_cb = undefined;
		}, 250);

		return;
	}

	jsonfile.writeFileSync(file_config, config, write_options);
	log.msg({ msg : 'Wrote config' });

	if (typeof config_write_cb === 'function') {
		setTimeout(() => {
			process.nextTick(config_write_cb);
			config_write_cb = undefined;
		}, 250);
	}
}

// Read status JSON
function status_read(status_read_cb = null) {
	jsonfile.readFile(file_status, (error, obj) => {
		if (error !== null) {
			log.msg({ msg : 'Failed to read status, error ' + error.errno + ' (' + error.code + ')' });

			status = status_default;
			json.status_write(status_read_cb);
			return false;
		}

		// Lay the default values on top of the read object,
		// in case new values were added
		status = defaults(obj, status_default);

		log.msg({ msg : 'Read status' });

		typeof status_read_cb === 'function' && process.nextTick(status_read_cb);
		status_read_cb = undefined;
	});
}

// Write status JSON
function status_write(status_write_cb = null) {
	// Don't write if empty
	if (typeof status.system === 'undefined') {
		log.msg({ msg : 'Failed to write status, status object empty' });

		if (typeof status_write_cb !== 'function') return;

		setTimeout(() => {
			process.nextTick(status_write_cb);
			status_write_cb = undefined;
		}, 250);

		return;
	}

	jsonfile.writeFileSync(file_status, status, write_options);
	log.msg({ msg : 'Wrote status' });

	if (typeof status_write_cb === 'function') {
		setTimeout(() => {
			process.nextTick(status_write_cb);
			status_write_cb = undefined;
		}, 250);
	}
}

// Set modules as not ready
function modules_reset(modules_reset_cb = null) {
	for (let module in bus.modules.modules) {
		module = module.toLowerCase();
		if (module != 'dia' && module != 'glo' && module != 'loc' && status[module]) {
			status[module].reset = true;
			status[module].ready = false;
		}
	}

	status.rad.source_name = 'off';

	log.msg({ msg : 'Reset modules' });

	typeof modules_reset_cb === 'function' && process.nextTick(modules_reset_cb);
	modules_reset_cb = undefined;
}

// Reset basic variables
function status_reset_basic(status_reset_basic_cb = null) {
	status.engine.running = false;

	status.vehicle.handbrake      = false;
	status.vehicle.ignition       = 'off';
	status.vehicle.ignition_level = 0;
	status.vehicle.reverse        = false;

	log.msg({ msg : 'Reset basic status' });

	typeof status_reset_basic_cb === 'function' && process.nextTick(status_reset_basic_cb);
	status_reset_basic_cb = undefined;
}

// Reset extra variables
// This is f**king stupid
function status_reset(status_reset_cb = null) {
	json.status_reset_basic(() => {
		status.bluetooth.adapter = {
			class        : null,
			discoverable : false,
			discovering  : false,
			name         : null,
			path         : null,
			powered      : false,
			service      : null,
		};

		status.bluetooth.device.connected = false;
		status.bluetooth.device.modalias  = null;
		status.bluetooth.device.paired    = false;
		status.bluetooth.device.position  = null;
		status.bluetooth.device.rssi      = null;
		status.bluetooth.device.service   = null;
		status.bluetooth.device.status    = null;
		status.bluetooth.device.track     = null;
		status.bluetooth.device.trusted   = false;
		status.bluetooth.device.media = {
			album          : null,
			artist         : null,
			duration       : null,
			genre          : null,
			numberoftracks : null,
			title          : null,
			tracknumber    : null,
		};

		status_mid_default.apply();
		status_lights_default.apply();

		log.msg({ msg : 'Reset all status' });

		typeof status_reset_cb === 'function' && process.nextTick(status_reset_cb);
		status_reset_cb = undefined;
	});
}


function init_listeners() {
	// Reset/write JSON data if configured on IKE ignition events
	IKE.on('ignition-poweroff', () => {
		// Set modules as not ready
		if (config.json.reset_on_poweroff) json.modules_reset();

		// Write JSON config and status files
		if (config.json.write_on_poweroff) json.write();
	});

	IKE.on('ignition-run', () => {
		// Write JSON config and status files
		if (config.json.write_on_run) json.write();
	});
}


module.exports = {
	config_read        : config_read,
	config_write       : config_write,
	init_listeners     : init_listeners,
	modules_reset      : modules_reset,
	read               : read,
	reset              : reset,
	status_read        : status_read,
	status_reset       : status_reset,
	status_reset_basic : status_reset_basic,
	status_write       : status_write,
	write              : write,
};
