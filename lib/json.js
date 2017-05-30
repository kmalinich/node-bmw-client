var module_name = __filename.slice(__dirname.length + 1, -3);

const jsonfile = require('jsonfile');

const file_config = app_path+'/config.json';
const file_status = app_path+'/status.json';

config_default = require('config-default');
status_default = require('status-default');

module.exports = {
	// Read config+status
	read : (read_callback = null) => {
		json.config_read(() => { // Read JSON config file
			json.status_read(() => { // Read JSON status file
				if (typeof read_callback === 'function') read_callback();
				read_callback = undefined;
			});
		});
	},

	// Reset both modules and status vars
	reset : (reset_callback = null) => {
		json.modules_reset(() => { // Set modules as not ready
			json.status_reset(() => { // Reset some variables
				if (config.json.write_on_reset === true) {
					json.write(() => { // Write JSON files
						if (typeof reset_callback === 'function') reset_callback();
						reset_callback = undefined;
					});
				}
				else {
					if (typeof reset_callback === 'function') reset_callback();
					reset_callback = undefined;
				}
			});
		});
	},

	// Write config+status
	write : (write_callback = null) => {
		json.config_write(() => { // Read JSON config file
			json.status_write(() => { // Read JSON status file
				if (typeof write_callback === 'function') write_callback();
				write_callback = undefined;
			});
		});
	},

	// Read config JSON
	config_read : (config_read_callback = null) => {
		jsonfile.readFile(file_config, (error, obj) => {
			if (error !== null) {
				log.msg({
					src : module_name,
					msg : 'Failed to read config, error '+error.errno+' ('+error.code+')',
				});

				config = config_default;
				json.config_write(config_read_callback);
				return false;
			}

			config = obj;
			log.msg({
				src : module_name,
				msg : 'Read config',
			});

			if (typeof config_read_callback === 'function') config_read_callback();
			config_read_callback = undefined;
		});
	},

	// Write config JSON
	config_write : (config_write_callback = null) => {
		jsonfile.writeFile(file_config, config, {spaces: 2}, (error) => {
			if (error !== null) {
				log.msg({
					src : module_name,
					msg : 'Failed to write config, '+error.errno+' ('+error.code+')',
				});

				if (typeof config_write_callback === 'function') config_write_callback();
				config_write_callback = undefined;
				return false;
			}

			log.msg({
				src : module_name,
				msg : 'Wrote config',
			});

			if (typeof config_write_callback === 'function') config_write_callback();
			config_write_callback = undefined;
		});
	},

	// Read status JSON
	status_read : (status_read_callback = null) => {
		jsonfile.readFile(file_status, (error, obj) => {
			if (error !== null) {
				log.msg({
					src : module_name,
					msg : 'Failed to read status, '+error.errno+' ('+error.code+')',
				});

				status = status_default;
				json.status_write(status_read_callback);
				return false;
			}

			status = obj;
			log.msg({
				src : module_name,
				msg : 'Read status',
			});

			if (typeof status_read_callback === 'function') status_read_callback();
			status_read_callback = undefined;
		});
	},

	// Write status JSON
	status_write : (status_write_callback = null) => {
		jsonfile.writeFile(file_status, status, {spaces: 2}, (error) => {
			if (error !== null) {
				log.msg({
					src : module_name,
					msg : 'Failed to write status, '+error.errno+' ('+error.code+')',
				});

				if (typeof status_write_callback === 'function') status_write_callback();
				status_write_callback = undefined;
				return false;
			}

			log.msg({
				src : module_name,
				msg : 'Wrote status',
			});

			if (typeof status_write_callback === 'function') status_write_callback();
			status_write_callback = undefined;
		});
	},

	// Set modules as not ready
	modules_reset : (modules_reset_callback = null) => {
		for (var module in bus_modules.modules) {
			var module_lower = module.toLowerCase();
			if (module != 'DIA' && module != 'GLO' && module != 'LOC' && status[module_lower]) {
				status[module_lower].reset = true;
				status[module_lower].ready = false;
			}
		}

		status.rad.audio_control = 'audio off';

		log.msg({
			src : module_name,
			msg : 'Reset modules',
		});

		if (typeof modules_reset_callback === 'function') modules_reset_callback();
		modules_reset_callback = undefined;
	},

	// Reset some variables
	status_reset : (status_reset_callback = null) => {
		status.engine.running = false;

		status.vehicle.handbrake      = false;
		status.vehicle.ignition       = 'off';
		status.vehicle.ignition_level = 0;
		status.vehicle.reverse        = false;

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

		status.mid = {
			text_left : 'node-bmw',
			text_right : 'node-bmw',
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

		if (typeof status_reset_callback === 'function') status_reset_callback();
		status_reset_callback = undefined;
	},
};
