const write_options = { spaces : '\t' };

const defaults = require('defaults-deep');
const jsonfile = require('jsonfile');

const file_config = app_path + '/config.json';
const file_status = app_path + '/status.json';

const config_default = require('config-default');
const status_default = require('status-default');


// Read config+status
async function read(read_cb = null) {
	// read JSON config file
	await json.config_read();

	// read JSON status file
	await json.status_read();

	// Execute callback
	typeof read_cb === 'function' && await read_cb();
	read_cb = null;
}

// Write config+status
async function write(write_cb = null) {
	// Write JSON config file
	await json.config_write();

	// Write JSON status file
	await json.status_write();

	// Execute callback
	typeof write_cb === 'function' && await write_cb();
	write_cb = null;
}


// Reset both modules and status vars
function reset(reset_cb = null) {
	json.modules_reset(() => { // Set modules as not ready
		json.status_reset(() => { // Reset some variables
			switch (config.json.write_on_reset) {
				case false : {
					typeof reset_cb === 'function' && process.nextTick(reset_cb);
					reset_cb = undefined;

					break;
				}

				default : {
					json.write(() => { // Write JSON files
						typeof reset_cb === 'function' && process.nextTick(reset_cb);
						reset_cb = undefined;
					});
				}
			}
		});
	});
}


// Read config JSON
async function config_read(config_read_cb = null) {
	let config_data;

	try {
		config_data = await jsonfile.readFileSync(file_config);
	}
	catch (err) {
		log.msg('Failed reading config, applying default config');

		config = config_default;
		await json.config_write(config_read_cb);
		return false;
	}

	// Lay the default values on top of the read object, in case new values were added
	config = await defaults(config_data, config_default);

	log.msg('Read config');

	typeof config_read_cb === 'function' && await config_read_cb();
	config_read_cb = undefined;
}

// Read status JSON
async function status_read(status_read_cb = null) {
	let status_data;

	try {
		status_data = await jsonfile.readFileSync(file_status);
	}
	catch (err) {
		log.msg('Failed reading status, applying default status');

		status = status_default;
		await json.status_write(status_read_cb);
		return false;
	}

	// Lay the default values on top of the read object, in case new values were added
	status = await defaults(status_data, status_default);

	log.msg('Read status');

	typeof status_read_cb === 'function' && await status_read_cb();
	status_read_cb = undefined;
}


// Write config JSON
async function config_write(config_write_cb = null) {
	// Don't write if empty
	if (typeof config.system === 'undefined') {
		log.msg('Failed writing config, config object empty');

		if (typeof config_write_cb !== 'function') return;
		await config_write_cb();
		config_write_cb = undefined;

		return;
	}

	try {
		await jsonfile.writeFileSync(file_config, config, write_options);
	}
	catch (err) {
		log.msg('Failed writing config');

		if (typeof config_write_cb !== 'function') return;
		await config_write_cb();
		config_write_cb = undefined;

		return false;
	}

	await log.msg('Wrote config');

	if (typeof config_write_cb !== 'function') return;
	await config_write_cb();
	config_write_cb = undefined;
}

// Write status JSON
async function status_write(status_write_cb = null) {
	// Don't write if empty
	if (typeof status.system === 'undefined') {
		log.msg('Failed writing status, status object empty');

		if (typeof status_write_cb !== 'function') return;
		await status_write_cb();
		status_write_cb = undefined;

		return;
	}

	try {
		await jsonfile.writeFileSync(file_status, status, write_options);
	}
	catch (err) {
		log.msg('Failed writing status');

		if (typeof status_write_cb !== 'function') return;
		await status_write_cb();
		status_write_cb = undefined;

		return false;
	}

	await log.msg('Wrote status');

	if (typeof status_write_cb !== 'function') return;
	await status_write_cb();
	status_write_cb = undefined;
}


// Set modules as not ready
function modules_reset(modules_reset_cb = null) {
	for (let module in bus.modules.modules) {
		module = module.toLowerCase();

		// Skip modules without entry in status object
		if (typeof status[module] === 'undefined') continue;
		if (status[module]        === null)        continue;

		switch (module) {
			case 'dia' : break;
			case 'glo' : break;
			case 'loc' : break;

			default : {
				status[module].reset = true;
				status[module].ready = false;
			}
		}
	}

	status.rad.source_name = 'off';

	log.msg('Reset modules');

	typeof modules_reset_cb === 'function' && process.nextTick(modules_reset_cb);
	modules_reset_cb = undefined;
}

// Reset basic variables
//
// Sad hack
function status_reset_basic(status_reset_basic_cb = null) {
	status.engine.running = false;

	status.vehicle.handbrake      = false;
	status.vehicle.ignition       = 'off';
	status.vehicle.ignition_level = 0;
	status.vehicle.reverse        = false;

	// Reset wheel speeds
	status.vehicle.wheel_speed.front.left  = 0;
	status.vehicle.wheel_speed.front.right = 0;
	status.vehicle.wheel_speed.rear.left   = 0;
	status.vehicle.wheel_speed.rear.right  = 0;

	// Reset vehicle speeds
	status.vehicle.speed.kmh = 0;
	status.vehicle.speed.mph = 0;

	// Reset torque reduction values
	status.vehicle.dsc.torque_reduction_1 = 0;
	status.vehicle.dsc.torque_reduction_2 = 0;

	status.vehicle.dsc.active = false;

	// Reset torque output values
	status.engine.torque.after_interventions  = 0;
	status.engine.torque.before_interventions = 0;
	status.engine.torque.loss                 = 0;
	status.engine.torque.output               = 0;

	log.msg('Reset basic status');

	typeof status_reset_basic_cb === 'function' && process.nextTick(status_reset_basic_cb);
	status_reset_basic_cb = undefined;
}

// Reset extra variables
// This is f**king stupid
function status_reset(status_reset_cb = null) {
	json.status_reset_basic(() => {
		status.bluetooth = require('status-bluetooth-default').apply();
		status.dsp       = require('status-dsp-default').apply();
		status.lcm       = require('status-lcm-default').apply();
		status.lights    = require('status-lights-default').apply();
		status.mid       = require('status-mid-default').apply();
		status.power     = require('status-power-default').apply();
		status.rad       = require('status-rad-default').apply();

		log.msg('Reset all status');

		typeof status_reset_cb === 'function' && process.nextTick(status_reset_cb);
		status_reset_cb = undefined;
	});
}


function init_listeners() {
	// Reset/write JSON data on power lib events, if configured
	power.on('active', (power_state) => {
		switch (power_state) {
			case false : {
				// Set modules as not ready
				if (config.json.reset_on_poweroff) json.modules_reset();

				// Write JSON config and status files
				if (config.json.write_on_poweroff) json.write();

				break;
			}

			case true : {
				// Write JSON config and status files
				if (config.json.write_on_run) json.write();
			}
		}
	});

	// Write JSON data on gear change event, if configured
	update.on('status.vehicle.clutch_count', () => {
		// Write JSON config and status files
		if (config.json.write_on_gear_change) json.write();
	});

	// Reset basic vars on server connection interruption
	update.on('status.server.connected', (data) => {
		if (data.new === false) json.status_reset_basic();
	});

	log.msg('Initialized listeners');
}


module.exports = {
	config_read  : config_read,
	config_write : config_write,

	init_listeners : init_listeners,

	modules_reset : modules_reset,

	read  : read,
	reset : reset,

	status_read : status_read,

	status_reset       : status_reset,
	status_reset_basic : status_reset_basic,

	status_write : status_write,

	write : write,
};
