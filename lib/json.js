var module_name = __filename.slice(__dirname.length + 1, -3);

const jsonfile = require('jsonfile');

const file_config = app_path+'/config.json';
const file_status = app_path+'/status.json';

const config_default = require('config-default');
const status_default = require('status-default');

module.exports = {
	// Read config+status
	read : (callback = null) => {
		json.config_read(() => { // Read JSON config file
			json.status_read(() => { // Read JSON status file
				if (typeof callback === 'function') { callback(); }
			});
		});
	},

	// Reset both modules and status vars
	reset : (callback = null) => {
		json.modules_reset(() => { // Set modules as not ready
			json.status_reset(() => { // Reset some variables
				json.write(() => { // Write JSON files
					if (typeof callback === 'function') { callback(); }
				});
			});
		});
	},

	// Write (sync) config+status
	write_sync : (callback = null) => {
		json.config_write_sync(() => { // Read JSON config file
			json.status_write_sync(() => { // Read JSON status file
				if (typeof callback === 'function') { callback(); }
			});
		});
	},

	// Write config+status
	write : (callback = null) => {
		json.config_write(() => { // Read JSON config file
			json.status_write(() => { // Read JSON status file
				if (typeof callback === 'function') { callback(); }
			});
		});
	},

	// Read config JSON
	config_read : (callback = null) => {
		jsonfile.readFile(file_config, (error, obj) => {
			if (error !== null) {
				log.msg({
					src : module_name,
					msg : 'Failed to read config, error '+error.errno+' ('+error.code+')',
				});

				config = config_default;
				json.config_write(callback);
				return false;
			}

			config = obj;
			log.msg({
				src : module_name,
				msg : 'Read config',
			});

			if (typeof callback === 'function') { callback(); }
		});
	},

	// Write config JSON
	config_write_sync : (callback = null) => {
		jsonfile.writeFileSync(file_config, config, {spaces: 2}, (error) => {
			if (error !== null) {
				log.msg({
					src : module_name,
					msg : 'Failed to write sync config, '+error.errno+' ('+error.code+')',
				});

				if (typeof callback === 'function') { callback(); }
				return false;
			}

			log.msg({
				src : module_name,
				msg : 'Wrote sync config',
			});

			if (typeof callback === 'function') { callback(); }
		});
	},

	// Write config JSON
	config_write : (callback = null) => {
		jsonfile.writeFile(file_config, config, {spaces: 2}, (error) => {
			if (error !== null) {
				log.msg({
					src : module_name,
					msg : 'Failed to write config, '+error.errno+' ('+error.code+')',
				});

				if (typeof callback === 'function') { callback(); }
				return false;
			}

			log.msg({
				src : module_name,
				msg : 'Wrote config',
			});

			if (typeof callback === 'function') { callback(); }
		});
	},

	// Read status JSON
	status_read : (callback = null) => {
		jsonfile.readFile(file_status, (error, obj) => {
			if (error !== null) {
				log.msg({
					src : module_name,
					msg : 'Failed to read status, '+error.errno+' ('+error.code+')',
				});

				status = status_default;
				json.status_write(callback);
				return false;
			}

			status = obj;
			log.msg({
				src : module_name,
				msg : 'Read status',
			});

			if (typeof callback === 'function') { callback(); }
		});
	},

	// Write status JSON
	status_write_sync : (callback = null) => {
		jsonfile.writeFileSync(file_status, status, {spaces: 2}, (error) => {
			if (error !== null) {
				log.msg({
					src : module_name,
					msg : 'Failed to write sync status, '+error.errno+' ('+error.code+')',
				});

				if (typeof callback === 'function') { callback(); }
				return false;
			}

			log.msg({
				src : module_name,
				msg : 'Wrote sync status',
			});

			if (typeof callback === 'function') { callback(); }
		});
	},

	// Write status JSON
	status_write : (callback = null) => {
		jsonfile.writeFile(file_status, status, {spaces: 2}, (error) => {
			if (error !== null) {
				log.msg({
					src : module_name,
					msg : 'Failed to write status, '+error.errno+' ('+error.code+')',
				});

				if (typeof callback === 'function') { callback(); }
				return false;
			}

			log.msg({
				src : module_name,
				msg : 'Wrote status',
			});

			if (typeof callback === 'function') { callback(); }
		});
	},

	// Set modules as not ready
	modules_reset : (callback = null) => {
		for (var module in bus_modules.modules) {
			if (module != 'DIA' && module != 'GLO' && module != 'LOC' && status[module]) {
				status[module].reset = true;
				status[module].ready = false;
			}
		}

		status.rad.audio_control = 'audio off';

		log.msg({
			src : module_name,
			msg : 'Reset modules',
		});

		if (typeof callback === 'function') { callback(); }
	},

	// Reset some variables
	status_reset : (callback = null) => {
		status.engine.running = false;

		status.vehicle.handbrake      = false;
		status.vehicle.ignition       = 'off';
		status.vehicle.ignition_level = 0;
		status.vehicle.reverse        = false;

		status.bt_device = {
			connected   : false,
			name        : null,
			path        : null,
			path_player : null,
			service     : null,
		};

		status.mid = {
			text : null,
			menu : {
				button_1  : 'Pair',
				button_2  : 'Unpa',
				button_3  : 'Conn',
				button_4  : 'Dscn',
				button_5  : 'Back',
				button_6  : 'Next',
				button_7  : 'Paus',
				button_8  : 'Play',
				button_9  : 'Rpt',
				button_10 : 'Shf',
				button_11 : 'AL-',
				button_12 : 'AL+',
			},
		},

		status.lights = {
			auto : {
				active  : false,
				lowbeam : status.lights.auto.lowbeam,
				reason  : status.lights.auto.reason,
			},
			turn : {
				left : {
					active  : false,
					comfort : false,
					depress : null,
				},
				right : {
					active  : false,
					comfort : false,
					depress : null,
				},
				comfort_cool    : true,
				depress_elapsed : null,
				fast            : null,
				sync            : null,
			},
			fog : {
				front : null,
				rear  : null,
			},
			standing : {
				front : null,
				rear  : null,
			},
			trailer : {
				fog      : null,
				reverse  : null,
				standing : null,
			},
			all_off         : null,
			brake           : null,
			dimmer_value_3  : null,
			hazard          : null,
			highbeam        : null,
			interior        : null,
			lowbeam         : null,
			reverse         : null,
			welcome_lights  : false,
			faulty : {
				brake : {
					left  : null,
					right : null,
				},
				fog : {
					front : null,
					rear  : null,
				},
				lowbeam : {
					left  : null,
					right : null,
				},
				standing : {
					rear : {
						left  : null,
						right : null,
					},
					front : null,
				},
				turn : {
					left  : null,
					right : null,
				},
				all_ok        : null,
				highbeam      : null,
				license_plate : null,
				lowbeam       : null,
				reverse       : null,
				trailer       : null,
			},
		};

		log.msg({
			src : module_name,
			msg : 'Reset status',
		});

		if (typeof callback === 'function') { callback(); }
	},
};
