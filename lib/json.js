const writeOptions = { spaces : '\t' };

// Debounce delay for status writes triggered by gear/clutch change events
const writeDebounceMs = 150;

const defaults = require('defaults-deep');
const jsonfile = require('jsonfile');
const path     = require('node:path');

const fileConfig = path.join(__dirname, 'config.json');
const fileStatus = path.join(__dirname, 'status.json');

// Trailing debounce timer container for writeDebounced()
let writeTimeout = null;


// Read config JSON
async function configRead() {
	let configData;

	const configDefault = require('config-default');

	try {
		configData = await jsonfile.readFileSync(fileConfig);
	}
	catch (error) {
		log.lib('Failed reading config, applying default config');
		log.error(error);

		config = configDefault;
		await configWrite();
		return false;
	}

	// Lay the default values on top of the read object, in case new values were added
	config = await defaults(configData, configDefault);

	log.lib('Read config');
}

// Read status JSON
async function statusRead() {
	let statusData;

	const statusDefault = require('status-default');

	try {
		statusData = await jsonfile.readFileSync(fileStatus);
	}
	catch (error) {
		log.lib('Failed reading status, applying default status');
		log.error(error);

		status = statusDefault;
		await statusWrite();
		return false;
	}

	// Lay the default values on top of the read object, in case new values were added
	status = await defaults(statusData, statusDefault);

	log.lib('Read status');
}


// Write config JSON
async function configWrite() {
	// Don't write if empty
	if (typeof config.system === 'undefined') {
		log.lib('Failed writing config, config object empty');
		return;
	}

	try {
		await jsonfile.writeFileSync(fileConfig, config, writeOptions);
	}
	catch (error) {
		log.lib('Failed writing config');
		log.error(error);
		return false;
	}

	log.lib('Wrote config');
}

// Write status JSON
async function statusWrite() {
	// Don't write if empty
	if (typeof status.system === 'undefined') {
		log.lib('Failed writing status, status object empty');
		return;
	}

	try {
		await jsonfile.writeFileSync(fileStatus, status, writeOptions);
	}
	catch (error) {
		log.lib('Failed writing status');
		log.error(error);
		return false;
	}

	log.lib('Wrote status');
}

// Read config+status
async function read() {
	// Read JSON config+status files
	await configRead();
	await statusRead();
}

// Write config+status
async function write() {
	// Write JSON config+status files
	await configWrite();
	await statusWrite();
}

// Write status file with a trailing debounce, to coalesce rapid writes
// (e.g. multiple gear/clutch change events in a short period)
async function writeDebounced() {
	if (writeTimeout !== null) clearTimeout(writeTimeout);

	writeTimeout = setTimeout(async () => {
		writeTimeout = null;
		await statusWrite();
	}, writeDebounceMs);
}


// Set modules as not ready
function modulesReset() {
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

// Reset status variables
// This is probably f**king stupid
async function statusReset(resetPower = false) {
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

	// Reset torque intervention values
	status.vehicle.dsc.torque_intervention_asc    = 0;
	status.vehicle.dsc.torque_intervention_asc_lm = 0;
	status.vehicle.dsc.torque_intervention_msr    = 0;

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

	if (resetPower === true) {
		status.power = require('status-power-default').apply();
	}

	log.lib('Reset status');
}

// Reset both modules and status vars
async function reset(resetPower = false) {
	modulesReset();
	await statusReset(resetPower);
	await write();
}


function initListeners() {
	// Reset variables on server connection interruption
	update.on('status.server.connected', async data => {
		if (data.new === false) await statusReset(false);
	});

	// Reset/write JSON data on power lib events, if configured
	if (config.json.reset_on_poweroff === true) {
		power.on('active', async powerState => {
			if (powerState === false) await reset(true);
		});
	}


	if (config.json.write_on_gear_change === true) {
		// Write JSON data on automatic trans gear change event, if configured
		update.on('status.egs.gear', async () => await writeDebounced());
		// Write JSON data on manual trans clutch in-out event, if configured
		update.on('status.vehicle.clutch_count', async () => await writeDebounced());
	}

	log.lib('Initialized listeners');
}


module.exports = {
	configRead,
	configWrite,

	modulesReset,

	read,
	reset,

	statusRead,
	statusWrite,

	statusReset,

	write,
	writeDebounced,

	initListeners,
};
