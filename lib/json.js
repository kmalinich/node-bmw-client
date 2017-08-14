/* eslint no-global-assign: 0 */

const write_options = { spaces : 2 };

const defaults = require('defaults-deep');
const jsonfile = require('jsonfile');

const file_config = app_path+'/config.json';
const file_status = app_path+'/status.json';

const config_default = require('config-default');
const status_default = require('status-default');

const status_lights_default = require('status-lights-default');
const status_mid_default    = require('status-mid-default');

// Read config+status
function read(read_callback = null) {
	json.config_read(() => { // Read JSON config file
		json.status_read(() => { // Read JSON status file
			json.status_reset_basic(read_callback);
		}, read_callback);
	}, read_callback);
}

// Reset both modules and status vars
function reset(reset_callback = null) {
	json.modules_reset(() => { // Set modules as not ready
		json.status_reset(() => { // Reset some variables
			switch (config.json.write_on_reset) {
				case true:
					json.write(() => { // Write JSON files
						if (typeof reset_callback === 'function') process.nextTick(reset_callback);
						reset_callback = undefined;
					});
					break;

				default:
					if (typeof reset_callback === 'function') process.nextTick(reset_callback);
					reset_callback = undefined;
			}
		});
	});
}

// Write config+status
function write(write_callback = null) {
	json.config_write(() => { // Write JSON config file
		json.status_write(write_callback); // Write JSON status file
	}, write_callback);
}

// Read config JSON
function config_read(config_read_callback = null) {
	jsonfile.readFile(file_config, (error, obj) => {
		if (error !== null) {
			log.msg({ msg : 'Failed to read config, error '+error.errno+' ('+error.code+')' });

			config = config_default;
			json.config_write(config_read_callback);
			return false;
		}

		// Lay the default values on top of the read object,
		// in case new values were added
		config = defaults(obj, config_default);

		log.msg({ msg : 'Read config' });

		if (typeof config_read_callback === 'function') process.nextTick(config_read_callback);
		config_read_callback = undefined;
	});
}

// Write config JSON
function config_write(config_write_callback = null) {
	jsonfile.writeFile(file_config, config, write_options, (error) => {
		if (error !== null) {
			log.msg({ msg : 'Failed to write config, '+error.errno+' ('+error.code+')' });

			if (typeof config_write_callback === 'function') process.nextTick(config_write_callback);
			config_write_callback = undefined;
			return false;
		}

		log.msg({ msg : 'Wrote config' });

		if (typeof config_write_callback === 'function') process.nextTick(config_write_callback);
		config_write_callback = undefined;
	});
}

// Read status JSON
function status_read(status_read_callback = null) {
	jsonfile.readFile(file_status, (error, obj) => {
		if (error !== null) {
			log.msg({ msg : 'Failed to read status, error '+error.errno+' ('+error.code+')' });

			status = status_default;
			json.status_write(status_read_callback);
			return false;
		}

		// Lay the default values on top of the read object,
		// in case new values were added
		status = defaults(obj, status_default);

		log.msg({ msg : 'Read status' });

		if (typeof status_read_callback === 'function') process.nextTick(status_read_callback);
		status_read_callback = undefined;
	});
}

// Write status JSON
function status_write(status_write_callback = null) {
	jsonfile.writeFile(file_status, status, write_options, (error) => {
		if (error !== null) {
			log.msg({ msg : 'Failed to write status, '+error.errno+' ('+error.code+')' });

			if (typeof status_write_callback === 'function') process.nextTick(status_write_callback);
			status_write_callback = undefined;
			return false;
		}

		log.msg({ msg : 'Wrote status' });

		if (typeof status_write_callback === 'function') process.nextTick(status_write_callback);
		status_write_callback = undefined;
	});
}

// Set modules as not ready
function modules_reset(modules_reset_callback = null) {
	for (let module in bus.modules.modules) {
		module = module.toLowerCase();
		if (module != 'dia' && module != 'glo' && module != 'loc' && status[module]) {
			status[module].reset = true;
			status[module].ready = false;
		}
	}

	status.rad.audio_control = 'audio off';

	log.msg({ msg : 'Reset modules' });

	if (typeof modules_reset_callback === 'function') process.nextTick(modules_reset_callback);
	modules_reset_callback = undefined;
}

// Reset basic variables
function status_reset_basic(status_reset_basic_callback = null) {
	status.engine.running = false;

	status.vehicle.handbrake      = false;
	status.vehicle.ignition       = 'off';
	status.vehicle.ignition_level = 0;
	status.vehicle.reverse        = false;

	log.msg({ msg : 'Reset basic status' });

	if (typeof status_reset_basic_callback === 'function') process.nextTick(status_reset_basic_callback);
	status_reset_basic_callback = undefined;
}

// Reset extra variables
// This is f**king stupid
function status_reset(status_reset_callback = null) {
	json.status_reset_basic(() => {
		status.bt_adapter = {
			class        : null,
			discoverable : false,
			discovering  : false,
			name         : null,
			path         : null,
			powered      : false,
			service      : null,
		};

		status.bt_device.connected = false;
		status.bt_device.modalias  = null;
		status.bt_device.paired    = false;
		status.bt_device.position  = null;
		status.bt_device.rssi      = null;
		status.bt_device.service   = null;
		status.bt_device.status    = null;
		status.bt_device.track     = null;
		status.bt_device.trusted   = false;
		status.bt_device.media = {
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

		if (typeof status_reset_callback === 'function') process.nextTick(status_reset_callback);
		status_reset_callback = undefined;
	});
}


module.exports = {
	read               : (read_callback)               => { read(read_callback);                             },
	reset              : (reset_callback)              => { reset(reset_callback);                           },
	write              : (write_callback)              => { write(write_callback);                           },
	config_read        : (config_read_callback)        => { config_read(config_read_callback);               },
	config_write       : (config_write_callback)       => { config_write(config_write_callback);             },
	status_read        : (status_read_callback)        => { status_read(status_read_callback);               },
	status_write       : (status_write_callback)       => { status_write(status_write_callback);             },
	modules_reset      : (modules_reset_callback)      => { modules_reset(modules_reset_callback);           },
	status_reset_basic : (status_reset_basic_callback) => { status_reset_basic(status_reset_basic_callback); },
	status_reset       : (status_reset_callback)       => { status_reset(status_reset_callback);             },
};
