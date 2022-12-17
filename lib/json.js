import defaults from 'defaults-deep';
import jsonfile from 'jsonfile';

import config_default from './config-default.js';
import status_default from './status-default.js';


const write_options = { spaces : '\t' };

const file_config = '../config.json';
const file_status = '../status.json';


// Read config+status
async function read() {
	// Read JSON config+status files
	await config_read();
	await status_read();
}

// Write config+status
async function write() {
	// Write JSON config+status files
	await config_write();
	await status_write();
}


// Reset both modules and status vars
async function reset() {
	await modules_reset(); // Set modules as not ready
	await status_reset();  // Reset some variables

	if (config.json.write_on_reset !== true) return;
	await write(); // Write JSON files
}


// Read config JSON
async function config_read() {
	let config_data;

	try {
		config_data = await jsonfile.readFileSync(file_config);
	}
	catch (error) {
		log.lib('Failed reading config, applying default config');
		log.error(error);

		config = config_default;
		await config_write();
		return false;
	}

	// Lay the default values on top of the read object, in case new values were added
	config = await defaults(config_data, config_default);

	log.lib('Read config');
}

// Read status JSON
async function status_read() {
	let status_data;

	try {
		status_data = await jsonfile.readFileSync(file_status);
	}
	catch (error) {
		log.lib('Failed reading status, applying default status');
		log.error(error);

		status = status_default;
		await status_write();
		return false;
	}

	// Lay the default values on top of the read object, in case new values were added
	status = await defaults(status_data, status_default);

	log.lib('Read status');
}


// Write config JSON
async function config_write() {
	// Don't write if empty
	if (typeof config.system === 'undefined') {
		log.lib('Failed writing config, config object empty');
		return;
	}

	try {
		await jsonfile.writeFileSync(file_config, config, write_options);
	}
	catch (error) {
		log.lib('Failed writing config');
		log.error(error);
		return false;
	}

	log.lib('Wrote config');
}

// Write status JSON
async function status_write() {
	// Don't write if empty
	if (typeof status.system === 'undefined') {
		log.lib('Failed writing status, status object empty');
		return;
	}

	try {
		await jsonfile.writeFileSync(file_status, status, write_options);
	}
	catch (error) {
		log.lib('Failed writing status');
		log.error(error);
		return false;
	}

	log.lib('Wrote status');
}


// Set modules as not ready
async function modules_reset() {
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

	log.lib('Reset modules');
}

// Reset basic variables
//
// Sad hack
async function status_reset_basic() {
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

	// Reset lambda values
	status.engine.lambda.errorCode = null;
	status.engine.lambda.lambda    = 0;
	status.engine.lambda.status    = null;
	status.engine.lambda.warmup    = 0;

	// Reset torque output values
	status.engine.torque.after_interventions  = 0;
	status.engine.torque.before_interventions = 0;
	status.engine.torque.loss                 = 0;
	status.engine.torque.output               = 0;

	log.lib('Reset basic status');
}

// Reset extra variables
// This is f**king stupid
async function status_reset() {
	await status_reset_basic();

	status.bluetooth = require('status-bluetooth-default').apply();
	// status.dsp       = require('status-dsp-default').apply();
	// status.lcm       = require('status-lcm-default').apply();
	// status.lights    = require('status-lights-default').apply();
	// status.mid       = require('status-mid-default').apply();
	status.power     = require('status-power-default').apply();
	// status.rad       = require('status-rad-default').apply();

	log.lib('Reset all status');
}


function init_listeners() {
	// Reset/write JSON data on power lib events, if configured
	power.on('active', async power_state => {
		switch (power_state) {
			case false : {
				// Set modules as not ready
				if (config.json.reset_on_poweroff) await modules_reset();

				// Write JSON config and status files
				if (config.json.write_on_poweroff) await write();

				break;
			}

			case true : {
				// Write JSON config and status files
				if (config.json.write_on_run) await write();
			}
		}
	});


	// Write JSON data on manual trans gear change event, if configured
	update.on('status.egs.gear', async () => {
		// Write JSON config and status files
		if (config.json.write_on_gear_change) await write();
	});

	// Write JSON data on manual trans clutch in-out event, if configured
	update.on('status.vehicle.clutch_count', async () => {
		// Write JSON config and status files
		if (config.json.write_on_gear_change) await write();
	});

	// Reset basic vars on server connection interruption
	update.on('status.server.connected', async data => {
		if (data.new === false) await status_reset_basic();
	});

	log.lib('Initialized listeners');
}


export default {
	config_read,
	config_write,

	init_listeners,

	modules_reset,

	read,
	reset,

	status_read,

	status_reset,
	status_reset_basic,

	status_write,

	write,
};
