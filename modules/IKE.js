const module_name = __filename.slice(__dirname.length + 1, -3);

const convert = require('node-unit-conversion');
const moment  = require('moment');
const now     = require('performance-now');
const os      = require('os');
const pad     = require('pad');

// Handle incoming commands from API
// This is pure garbage and COMPLETELY needs to be done way differently
function api_command(data) {
	switch (data.command) {
		case 'ike-ignition': // Send fake ignition status (but don't tho - you've been warned)
			ignition(data.value);
			break;
		case 'ike-text': // Display text string in cluster
			text(data.value);
			break;
		case 'obc-clock': // Set OBC clock
			obc_clock();
			break;
		case 'obc-get-all': // Refresh all OBC data value
			obc_refresh();
			break;
		case 'obc-get': // Refresh specific OBC data value
			obc_data('get', data.value);
			break;
		case 'obc-reset': // Reset specific OBC data value
			obc_data('reset', data.value);
			break;
		default: // Dunno
			log.module({ msg : 'Unknown API command: ' + data.command });
	}
}

// Refresh various values every 5 seconds
function data_refresh() {
	if (status.vehicle.ignition_level === 0) {
		if (IKE.timeout_data_refresh !== null) {
			clearTimeout(IKE.timeout_data_refresh);
			IKE.timeout_data_refresh = null;

			log.module({ msg : 'Unset data refresh timeout' });

			return;
		}
	}

	// Request fresh data
	GM.request('door-status');
	IKE.request('ignition');
	IKE.request('temperature');
	LCM.request('dimmer');
	LCM.request('io-status');
	LCM.request('light-status');
	obc_data('get', 'consumption-1');

	// DME.request('motor-values');
	// RLS.request('rain-sensor-status');

	if (IKE.timeout_data_refresh === null) {
		log.module({ msg : 'Set data refresh timeout' });
	}

	// setTimeout for next update
	IKE.timeout_data_refresh = setTimeout(data_refresh, 1000);
}

// This actually is a bitmask but.. this is also a freetime project
function decode_aux_heat_led(data) {
	switch (data.msg[2]) {
		case 0x00:
			status.obc.aux_heat_led = 'off';
			break;
		case 0x04:
			status.obc.aux_heat_led = 'on';
			break;
		case 0x08:
			status.obc.aux_heat_led = 'blink';
			break;
		default:
			status.obc.aux_heat_led = Buffer.from(data.msg);
	}
}

// Below is a s**t hack workaround while I contemplate firing actual events
function decode_ignition_status(data) {
	// Init power-state vars
	IKE.state_powerdown   = false;
	IKE.state_poweroff    = false;
	IKE.state_powerup     = false;
	IKE.state_run         = false;
	IKE.state_start_begin = false;
	IKE.state_start_end   = false;

	// Ignition going up
	if (data.msg[1] > status.vehicle.ignition_level) {
		switch (data.msg[1]) { // Evaluate new ignition state
			case 1: // Accessory
				log.module({ msg : 'Powerup state' });
				IKE.state_powerup = true;
				break;

			case 3: // Run
				// If the accessory (1) ignition message wasn't caught
				if (status.vehicle.ignition_level === 0) {
					log.module({ msg : 'Powerup state' });
					IKE.state_powerup = true;
				}

				log.module({ msg : 'Run state' });
				IKE.state_run = true;
				break;

			case 7: // Start
				// If the accessory (1) or run (3) ignition message(s) weren't caught
				if (status.vehicle.ignition_level === 0 || status.vehicle.ignition_level === 3) {
					log.module({ msg : 'Powerup state' });
					IKE.state_powerup = true;
				}

				log.module({ msg : 'Start-begin state' });
				IKE.state_start_begin = true;
		}
	}

	// Ignition going down
	else if (data.msg[1] < status.vehicle.ignition_level) {
		switch (data.msg[1]) { // Evaluate new ignition state
			case 0: // Off
				// If the accessory (1) ignition message wasn't caught
				if (status.vehicle.ignition_level === 3) {
					log.module({ msg : 'Powerdown state' });
					IKE.state_powerdown = true;
				}

				log.module({ msg : 'Poweroff state' });
				IKE.state_poweroff = true;
				break;

			case 1: // Accessory
				log.module({ msg : 'Powerdown state' });
				IKE.state_powerdown = true;
				break;

			case 3: // Run
				log.module({ msg : 'Start-end state' });
				IKE.state_start_end = true;
		}
	}

	// Set ignition status value
	if (update.status('vehicle.ignition_level', data.msg[1])) {
		// Activate autolights if we got 'em
		LCM.auto_lights_process();
	}

	switch (data.msg[1]) {
		case 0  : update.status('vehicle.ignition', 'off');       break;
		case 1  : update.status('vehicle.ignition', 'accessory'); break;
		case 3  : update.status('vehicle.ignition', 'run');       break;
		case 7  : update.status('vehicle.ignition', 'start');     break;
		default : update.status('vehicle.ignition', 'unknown');   break;
	}

	// Ignition changed to off
	if (IKE.state_poweroff === true) {
		// Disable HUD refresh
		data_refresh();

		// Disable BMBT/MID keepalive
		BMBT.status_loop(false);
		MID.status_loop(false);
		MID.text_loop(false);

		// iDrive knob init
		CON1.send_status_ignition_new();

		// GPIO relays
		gpio.set(1, 1);
		gpio.set(2, 1);

		// Overhead LCD commands
		socket.lcd_command_tx('clear');
		socket.lcd_command_tx('off');

		// Toggle media playback
		if (status.kodi.player.status == 'playing') kodi.command('toggle');
		kodi.volume(config.media.kodi.default_volume);
		BT.command('disconnect');

		// Set modules as not ready
		if (config.json.reset_on_poweroff) json.modules_reset();

		// Turn off HDMI display after configured delay
		setTimeout(() => {
			HDMI.command('poweroff');
		}, config.media.hdmi.poweroff_delay);

		// Write JSON config and status files
		if (config.json.write_on_poweroff) json.write();
	}

	// Ignition changed to accessory, from off
	if (IKE.state_powerup === true) {
		// Enable HUD refresh
		data_refresh();

		IKE.state_powerup = false;

		// Enable BMBT/MID keepalive
		BMBT.status_loop(true);
		MID.status_loop(true);
		MID.text_loop(true);
		bus.cmds.request_device_status(module_name, 'RAD');

		// iDrive knob
		CON1.send_status_ignition_new();

		// Overhead LCD commands
		socket.lcd_command_tx('on');
		socket.lcd_text_tx({
			upper : 'State:',
			lower : 'powerup',
		});

		// GPIO relays
		gpio.set(1, 0);
		gpio.set(2, 0);

		// Connect Bluetooth
		BT.command('connect');

		// Toggle media playback
		kodi.volume(config.media.kodi.default_volume);
		setTimeout(() => {
			if (status.kodi.player.status != 'playing') kodi.command('toggle');
		}, 6000);

		// Welcome message
		if (config.options.message_welcome === true) {
			IKE.text_override('node-bmw | Host:' + os.hostname().split('.')[0] + ' | Mem:' + Math.round((os.freemem() / os.totalmem()) * 101) + '% | Up:' + parseFloat(os.uptime() / 3600).toFixed(2) + ' hrs');
		}
	}

	// Ignition changed to accessory, from run
	if (IKE.state_powerdown === true) {
		IKE.state_powerdown = false;
		if (status.vehicle.locked && status.doors.sealed) { // If the doors are closed and locked
			GM.locks(); // Send message to GM to toggle door locks
		}
	}

	// Ignition changed to run, from off/accessory
	if (IKE.state_run === true) {
		IKE.state_run = false;

		// If the HDMI display is currently on, power it off
		//
		// This helps prepare for engine start during scenarios
		// like at the fuel pump, when the ignition is switched
		// from run to accessory, which ordinarily would leave the screen on
		//
		// That causes an issue if you go back to run from accessory,
		// with the screen still on, since it may damage the screen
		// if it experiences a low-voltage event caused by the starter motor
		if (status.hdmi.power_status !== 'STANDBY') HDMI.command('poweroff');

		// Write JSON config and status files
		if (config.json.write_on_run) json.write();

		// Refresh OBC data
		if (config.options.obc_refresh_on_start === true) IKE.obc_refresh();
	}
}

function decode_odometer(data) {
	var odometer_value1 = data.msg[3] << 16;
	var odometer_value2 = data.msg[2] << 8;
	var odometer_value  = odometer_value1 + odometer_value2 + data.msg[1];

	status.vehicle.odometer.km = odometer_value;
	status.vehicle.odometer.mi = Math.round(convert(odometer_value).from('kilometre').to('us mile'));
}

function decode_sensor_status(data) {
	// data.msg[2]:
	//   1 = Engine running
	//  16 = R (4)
	//  64 = 2 (6)
	// 112 = N (4+5+6)
	// 128 = D (7)
	// 176 = P (4+5+7)
	// 192 = 4 (6+7)
	// 208 = 3 (4+6+7)

	update.status('vehicle.handbrake', bitmask.test(data.msg[1], bitmask.bit[0]));

	// If the engine is newly running, power up HDMI display
	if (update.status('engine.running', bitmask.test(data.msg[2], bitmask.bit[0]))) {
		HDMI.command('poweron');
	}

	// If the vehicle is newly in reverse, show IKE message if configured to do so
	if (config.options.message_reverse === true) {
		if (update.status('vehicle.reverse', bitmask.test(data.msg[2], bitmask.bit[4]))) {
			if (status.vehicle.reverse === true) IKE.text_override('you\'re in reverse..');
		}
	}
}

function decode_speed_values(data) {
	// Update vehicle and engine speed variables
	// Also allow update from IBUS/KBUS even if CANBUS is enabled when the ignition
	if (config.canbus.speed === false || status.vehicle.ignition_level < 3) {
		update.status('vehicle.speed.kmh', parseFloat(data.msg[1] * 2));
		update.status('vehicle.speed.mph', parseFloat(convert(parseFloat((data.msg[1] * 2))).from('kilometre').to('us mile').toFixed(2)));
	}

	if (config.canbus.rpm === false || status.vehicle.ignition_level < 3) {
		update.status('engine.speed', parseFloat(data.msg[2] * 100));
	}
}

function decode_temperature_values(data) {
	// Update external and engine coolant temp variables
	if (config.canbus.exterior === false || status.vehicle.ignition_level < 3) {
		update.status('temperature.exterior.c', parseFloat(data.msg[1]));
		update.status('temperature.exterior.f', Math.round(convert(parseFloat(data.msg[1])).from('celsius').to('fahrenheit')));
	}

	if (config.canbus.coolant === false || status.vehicle.ignition_level < 3) {
		update.status('temperature.coolant.c', parseFloat(data.msg[2]));
		update.status('temperature.coolant.f', Math.round(convert(parseFloat(data.msg[2])).from('celsius').to('fahrenheit')));
	}

	// Trigger a HUD refresh
	IKE.hud_refresh();
}

// Refresh custom HUD
function hud_refresh() {
	// Bounce if the ignition is off
	if (status.vehicle.ignition_level < 1) return;
	// Bounce if override is active
	if (IKE.hud_override === true) return;
	// Bounce if the last update was less than 1 sec ago
	if (now() - IKE.last_hud_refresh <= 1000) return;

	let string_cons;
	let string_temp;
	let string_time = moment().format('HH:mm');

	// Only add data to strings if it is populated
	string_cons = '     ';
	if (status.obc.consumption.c1.mpg != null) {
		string_cons = parseFloat(status.obc.consumption.c1.mpg).toFixed(1) + 'm';
	}
	string_cons = pad(string_cons, 8);

	// 0-pad string_cons
	if (string_cons.length === 4) string_cons = '0' + string_cons;

	string_temp = '  ';
	if (status.temperature.coolant.c != null) {
		string_temp = Math.round(status.temperature.coolant.c) + '¨';
	}

	// Format the output (ghetto-ly)
	switch (string_temp.length) {
		case 4 : string_temp = ' ' + string_temp + '  ';  break;
		case 3 : string_temp = ' ' + string_temp + '   '; break;
		case 2 : string_temp = ' ' + string_temp + '    ';
	}

	// HUD strings object
	let hud_strings = {
		left   : string_cons,
		center : string_temp,
		right  : string_time,
	};

	// 1m sysload to percentage
	let load_1m = (parseFloat((os.loadavg()[0] / os.cpus().length).toFixed(2)) * 100).toFixed(0);
	load_1m = status.system.temperature + '¨|' + load_1m + '%';

	// Space-pad load_1m
	load_1m = pad(load_1m, 8);

	// socket.lcd_text_tx({
	// 	upper : 'kdm-e39-01',
	// 	lower : status.system.temperature+'C|'+status.system.cpu.load_pct+'%',
	// });

	// Change left string to be load/CPU temp if over threshold
	if (status.system.temperature > 65) hud_strings.left = load_1m;

	// Assemble text string
	let hud_string = hud_strings.left + hud_strings.center + hud_strings.right;

	// Send text to IKE and update IKE.last_hud_refresh value
	IKE.text(hud_string, () => {
		IKE.last_hud_refresh = now();
	});
}

// Pretend to be IKE saying the car is on
// Note - this can and WILL set the alarm off - kudos to the Germans
function ignition(value) {
	log.module({ msg : 'Sending ignition status: ' + value });

	var status;
	switch (value) {
		case 'off':
			status = 0x00;
			break;
		case 'pos1':
			status = 0x01;
			break;
		case 'pos2':
			status = 0x03;
			break;
		case 'pos3':
			status = 0x07;
	}

	bus.data.send({
		dst : 'GLO',
		msg : [ 0x11, status ],
	});
}

// Logging shortcut
function logmod(msg) {
	log.module({
		msg : msg,
	});
}

// OBC set clock
function obc_clock() {
	log.module({ msg : 'Setting OBC clock to current time' });

	var time = moment();

	// Time
	bus.data.send({
		src : 'GT',
		msg : [ 0x40, 0x01, time.format('H'), time.format('m') ],
	});

	// Date
	bus.data.send({
		src : 'GT',
		msg : [ 0x40, 0x02, time.format('D'), time.format('M'), time.format('YY') ],
	});
}

// OBC data request
function obc_data(action, value, target) {
	let cmd = 0x41; // OBC data request

	// Init variables
	let action_id;

	// Determine action_id from action argument
	switch (action) {
		case 'get'        : action_id = 0x01; break; // Request current value
		case 'get-status' : action_id = 0x02; break; // Request current status
		case 'limit-off'  : action_id = 0x08; break;
		case 'limit-on'   : action_id = 0x04; break;
		case 'limit-set'  : action_id = 0x20; break;
		case 'reset'      : action_id = 0x10; break;
		case 'set' :
			cmd       = 0x40; // OBC data set (speed limit/distance)
			action_id = 0x00;
			break;
	}

	// Assemble message string, with OBC value from value argument
	var msg = [ cmd, obc_values.n2h(value), action_id ];

	// If we're setting, insert the data
	if (typeof target !== 'undefined' && target) {
		msg = [ msg, target ];
	}

	// log.module({ msg : action+' OBC value \''+value+'\'' });

	bus.data.send({
		src : 'GT',
		msg : msg,
	});
}

// Refresh OBC data
function obc_refresh() {
	log.module({ msg : 'Refreshing all OBC data' });

	// LCM data
	LCM.request('vehicledata');
	LCM.request('light-status');
	LCM.request('dimmer');
	LCM.request('io-status');

	// Immo+GM data
	EWS.request('immobiliserstatus');
	GM.request('io-status');
	GM.request('door-status');

	// IHKA IO status
	// IHKA.request('io-status');

	// DME engine data
	// DME.request('motor-values');

	// IKE data
	IKE.request('coding');
	IKE.request('ignition');
	IKE.request('odometer');
	IKE.request('sensor');
	IKE.request('temperature');
	IKE.request('vin');

	// OBC data
	obc_data('get', 'arrival');
	obc_data('get', 'timer-1');
	obc_data('get', 'timer-2');
	obc_data('get', 'auxheatvent');
	obc_data('get', 'code');
	obc_data('get', 'consumption-1');
	obc_data('get', 'consumption-2');
	obc_data('get', 'date');
	obc_data('get', 'distance');
	obc_data('get', 'range');
	obc_data('get', 'average-speed');
	obc_data('get', 'limit');
	obc_data('get', 'stopwatch');
	obc_data('get', 'outside-temp');
	obc_data('get', 'time');
	obc_data('get', 'timer');

	// Blow it out
	if (config.options.modules_refresh_on_start === true) {
		IKE.request('status-glo');
	}
	else {
		IKE.request('status-short');
	}
}

// Parse data sent from IKE module
function parse_out(data) {
	// Init variables
	switch (data.msg[0]) {
		case 0x07: // Gong status
			data.command = 'bro';
			data.value   = 'gong status ' + data.msg;
			break;

		case 0x11: // Broadcast: Ignition status
			decode_ignition_status(data);
			data.command = 'bro';
			data.value   = 'ignition: ' + status.vehicle.ignition;
			break;

		case 0x13: // IKE sensor status
			decode_sensor_status(data);
			data.command = 'bro';
			data.value   = 'sensor status';
			break;

		case 0x15: // country coding data
			data.command = 'bro';
			data.value   = 'country coding data';
			break;

		case 0x17: // Odometer
			decode_odometer(data);
			data.command = 'bro';
			data.value   = 'odometer';
			break;

		case 0x18: // Vehicle speed and RPM
			decode_speed_values(data);
			data.command = 'bro';
			data.value   = 'speed values';
			break;

		case 0x19: // Coolant temp and external temp
			decode_temperature_values(data);
			data.command = 'bro';
			data.value   = 'temperature values';
			break;

		case 0x24: // Update: OBC text
			data.command = 'upd';

			// data.msg[1] - Layout
			var layout = obc_values.h2n(data.msg[1]);

			switch (layout) {
				case 'time': {
					let string_time_unit;
					let string_time;

					// Parse unit
					string_time_unit = Buffer.from([ data.msg[8], data.msg[9] ]);
					string_time_unit = string_time_unit.toString().trim().toLowerCase();

					// Detect 12h or 24h time and parse value
					if (string_time_unit === 'am' || string_time_unit === 'pm') {
						update.status('coding.unit.time', '12h');
						string_time = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7], data.msg[8], data.msg[9] ]);
					}
					else {
						update.status('coding.unit.time', '24h');
						string_time = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7] ]);
					}

					string_time = string_time.toString().trim().toLowerCase();

					// Update status variables
					update.status('obc.time', string_time);
					break;
				}

				case 'date': {
					let string_date;

					// Parse value
					string_date = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7], data.msg[8], data.msg[9], data.msg[10], data.msg[11], data.msg[12] ]);
					string_date = string_date.toString().trim();

					// Update status variables
					update.status('obc.date', string_date);
					break;
				}

				case 'outside-temp': {
					let string_outside_temp_unit;
					let string_outside_temp_negative;
					let string_outside_temp_value;

					// Parse unit
					string_outside_temp_unit = Buffer.from([ data.msg[9] ]);
					string_outside_temp_unit = string_outside_temp_unit.toString().trim().toLowerCase();

					// Parse if it is +/-
					string_outside_temp_negative = Buffer.from([ data.msg[9] ]);
					string_outside_temp_negative = string_outside_temp_negative.toString().trim().toLowerCase();

					// Parse value
					if (string_outside_temp_negative === '-') {
						string_outside_temp_value = Buffer.from(data.msg[3], [ data.msg[4], data.msg[5], data.msg[6], data.msg[7] ]);
						string_outside_temp_value = string_outside_temp_value.toString().trim().toLowerCase();
					}
					else {
						string_outside_temp_value = Buffer.from([ data.msg[4], data.msg[5], data.msg[6], data.msg[7] ]);
						string_outside_temp_value = string_outside_temp_value.toString().trim().toLowerCase();
					}

					// Update status variables
					switch (string_outside_temp_unit) {
						case 'c': {
							status.coding.unit.temp           = 'c';
							status.temperature.exterior.obc.c = parseFloat(string_outside_temp_value);
							status.temperature.exterior.obc.f = parseFloat(convert(parseFloat(string_outside_temp_value)).from('celsius').to('fahrenheit'));
							break;
						}

						case 'f': {
							status.coding.unit.temp           = 'f';
							status.temperature.exterior.obc.c = parseFloat(convert(parseFloat(string_outside_temp_value)).from('fahrenheit').to('celsius'));
							status.temperature.exterior.obc.f = parseFloat(string_outside_temp_value);
							break;
						}
					}
					break;
				}

				case 'consumption-1': {
					let consumption_l100;
					let consumption_mpg;
					let string_consumption_1;
					let string_consumption_1_unit;

					// Parse unit
					string_consumption_1_unit = Buffer.from([ data.msg[8] ]);
					string_consumption_1_unit = string_consumption_1_unit.toString().trim().toLowerCase();

					// Parse value
					string_consumption_1 = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6] ]);
					string_consumption_1 = parseFloat(string_consumption_1.toString().trim().toLowerCase());

					// Perform appropriate conversions between units
					switch (string_consumption_1_unit) {
						case 'm': {
							status.coding.unit.cons = 'mpg';
							consumption_mpg         = string_consumption_1;
							consumption_l100        = 235.21 / string_consumption_1;
							break;
						}

						default: {
							status.coding.unit.cons = 'l100';
							consumption_mpg         = 235.21 / string_consumption_1;
							consumption_l100        = string_consumption_1;
							break;
						}
					}

					// Update status variables
					status.obc.consumption.c1.mpg  = parseFloat(consumption_mpg.toFixed(2));
					status.obc.consumption.c1.l100 = parseFloat(consumption_l100.toFixed(2));
					break;
				}

				case 'consumption-2': {
					let consumption_l100;
					let consumption_mpg;
					let string_consumption_2;
					let string_consumption_2_unit;

					// Parse unit
					string_consumption_2_unit = Buffer.from([ data.msg[8] ]);
					string_consumption_2_unit = string_consumption_2_unit.toString().trim().toLowerCase();

					// Parse value
					string_consumption_2 = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6] ]);
					string_consumption_2 = parseFloat(string_consumption_2.toString().trim().toLowerCase());

					// Perform appropriate conversions between units and round to 2 decimals
					if (string_consumption_2_unit === 'm') {
						consumption_mpg  = string_consumption_2;
						consumption_l100 = 235.215 / string_consumption_2;
					}
					else {
						consumption_mpg  = 235.215 / string_consumption_2;
						consumption_l100 = string_consumption_2;
					}

					// Update status variables
					status.obc.consumption.c2.mpg  = parseFloat(consumption_mpg.toFixed(2));
					status.obc.consumption.c2.l100 = parseFloat(consumption_l100.toFixed(2));
					break;
				}

				case 'range': {
					let string_range;
					let string_range_unit;

					// Parse value
					string_range = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6] ]);
					string_range = string_range.toString().trim();

					string_range_unit = Buffer.from([ data.msg[7], data.msg[8] ]);
					string_range_unit = string_range_unit.toString().trim().toLowerCase();

					// Update status variables
					switch (string_range_unit) {
						case 'ml': {
							status.coding.unit.distance = 'mi';
							status.obc.range.mi = parseFloat(string_range);
							status.obc.range.km = parseFloat(convert(parseFloat(string_range)).from('kilometre').to('us mile').toFixed(2));
							break;
						}

						case 'km': {
							status.coding.unit.distance = 'km';
							status.obc.range.mi = parseFloat(convert(parseFloat(string_range)).from('us mile').to('kilometre').toFixed(2));
							status.obc.range.km = parseFloat(string_range);
							break;
						}
					}
					break;
				}

				case 'distance': {
					let string_distance;

					// Parse value
					string_distance = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6] ]);
					string_distance = string_distance.toString().trim().toLowerCase();

					// Update status variables
					status.obc.distance = parseFloat(string_distance);
					break;
				}

				case 'arrival': {
					let string_arrival;

					// Parse value
					string_arrival = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7], data.msg[8], data.msg[9] ]);
					string_arrival = string_arrival.toString().trim().toLowerCase();

					// Update status variables
					status.obc.arrival = string_arrival;
					break;
				}

				case 'limit': {
					let string_limit;

					// Parse value
					string_limit = Buffer.from([ data.msg[3], data.msg[4], data.msg[5] ]);
					string_limit = parseFloat(string_limit.toString().trim().toLowerCase());

					// Update status variables
					status.obc.limit = parseFloat(string_limit.toFixed(2));
					break;
				}

				case 'average-speed': {
					let string_average_speed;
					let string_average_speed_unit;

					// Parse unit
					string_average_speed_unit = Buffer.from([ data.msg[8] ]);
					string_average_speed_unit = string_average_speed_unit.toString().trim().toLowerCase();

					// Parse value
					string_average_speed = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6] ]);
					string_average_speed = parseFloat(string_average_speed.toString().trim().toLowerCase());

					// Convert values appropriately based on coding valueunits
					switch (string_average_speed_unit) {
						case 'k': {
							status.coding.unit.speed = 'kmh';
							// Update status variables
							status.obc.average_speed.kmh = parseFloat(string_average_speed.toFixed(2));
							status.obc.average_speed.mph = parseFloat(convert(string_average_speed).from('kilometre').to('us mile').toFixed(2));
							break;
						}

						case 'm': {
							status.coding.unit.speed = 'mph';
							// Update status variables
							status.obc.average_speed.kmh = parseFloat(convert(string_average_speed).from('us mile').to('kilometre').toFixed(2));
							status.obc.average_speed.mph = parseFloat(string_average_speed.toFixed(2));
							break;
						}
					}
					break;
				}

				case 'code': {
					let string_code;

					// Parse value
					string_code = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6] ]);
					string_code = string_code.toString().trim().toLowerCase();

					// Update status variable
					status.obc.code = string_code;
					break;
				}

				case 'stopwatch': {
					let string_stopwatch;

					// Parse value
					string_stopwatch = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6] ]);
					string_stopwatch = parseFloat(string_stopwatch.toString().trim().toLowerCase()).toFixed(2);

					// Update status variables
					status.obc.stopwatch = string_stopwatch;
					break;
				}

				case 'timer-1': {
					let string_aux_heat_timer_1;

					// Parse value
					string_aux_heat_timer_1 = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7], data.msg[8], data.msg[9] ]);
					string_aux_heat_timer_1 = string_aux_heat_timer_1.toString().trim().toLowerCase();

					// Update status variables
					status.obc.aux_heat_timer.t1 = string_aux_heat_timer_1;
					break;
				}

				case 'timer-2': {
					let string_aux_heat_timer_2;

					// Parse value
					string_aux_heat_timer_2 = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7], data.msg[8], data.msg[9] ]);
					string_aux_heat_timer_2 = string_aux_heat_timer_2.toString().trim().toLowerCase();

					// Update status variables
					status.obc.aux_heat_timer.t2 = string_aux_heat_timer_2;
					break;
				}

				case 'interim': {
					let string_interim;

					// Parse value
					string_interim = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6] ]);
					string_interim = parseFloat(string_interim.toString().trim().toLowerCase()).toFixed(2);

					// Update status variables
					status.obc.interim = parseFloat(string_interim);
					break;
				}
			}

			data.value = 'OBC ' + layout.replace(/-/, ' ') + ': \'' + hex.h2s(data.msg) + '\'';
			break;

		case 0x2A: // Broadcast: Aux heat LED status
			decode_aux_heat_led(data);
			data.command = 'bro';
			data.value   = 'aux heat LED: ' + status.obc.aux_heat_led;
			break;

		case 0x57: // Broadcast: BC button press (MFL BC stalk button)
			data.command = 'bro';
			data.value   = 'BC button';
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
			break;
	}

	log.bus(data);
}

// Request various things from IKE
function request(value) {
	var cmd = null;
	var src = 'VID';
	var dst = module_name;

	let loop_dst;

	switch (value) {
		case 'ignition':
			cmd = [ 0x10 ];
			break;
		case 'sensor':
			cmd = [ 0x12 ];
			break;
		case 'coding':
			src = 'RAD';
			cmd = [ 0x14 ];
			break;
		case 'odometer':
			src = 'EWS';
			cmd = [ 0x16 ];
			break;
		case 'dimmer':
			src = 'IHKA';
			cmd = [ 0x1D, 0xC5 ];
			break;
		case 'temperature':
			src = 'LCM';
			cmd = [ 0x1D, 0xC5 ];
			break;
		case 'status-glo': {
			for (loop_dst in bus.modules.modules) {
				if (loop_dst != 'DIA' && loop_dst != 'GLO' && loop_dst != 'LOC' && loop_dst != src) {
					bus.cmds.request_device_status('IKE', loop_dst);
				}
			}
			break;
		}
		case 'status-short':
			bus.modules.modules_check.forEach((loop_dst) => {
				src = module_name;
				if (loop_dst != 'DIA' && loop_dst != 'GLO' && loop_dst != 'LOC' && loop_dst != src) {
					bus.cmds.request_device_status('IKE', loop_dst);
				}
			});
			break;

		case 'vin':
			src = module_name;
			dst = 'LCM';
			cmd = [ 0x53 ];
			break;
	}

	log.module({ msg : 'Requesting \'' + value + '\'' });

	if (cmd !== null) {
		bus.data.send({
			src : src,
			dst : dst,
			msg : cmd,
		});
	}
}

// IKE cluster text send message
function text(message) {
	let message_hex;
	let max_length = 20;

	message_hex = [ 0x23, 0x50, 0x30, 0x07 ];
	// Trim string to max length
	message_hex = message_hex.concat(hex.a2h(pad(message.substring(0, max_length), 20)));
	message_hex = message_hex.concat(0x04);

	bus.data.send({
		src : 'RAD',
		msg : message_hex,
	});
}

// IKE cluster text send message, override other messages
function text_override(message, timeout = 2500, direction = 'left', turn = false) {
	// kodi.notify(module_name, message);
	let max_length = 20;

	let scroll_delay         = 300;
	let scroll_delay_timeout = scroll_delay * 5;

	// Override scroll_delay_timeout if we're showing a turn signal message
	if (turn === true) {
		scroll_delay         = 200;
		scroll_delay_timeout = 250;
		timeout              = 0;
	}

	// Delare that we're currently first up
	IKE.hud_override      = true;
	IKE.hud_override_text = message;

	// Equal to or less than 20 char
	if (message.length - max_length <= 0) {
		if (IKE.hud_override_text == message) {
			IKE.text(message);
		}
	}
	else {
		// Adjust timeout since we will be scrolling
		timeout = timeout + (scroll_delay * 5) + (scroll_delay * (message.length - max_length));

		// Send initial string if we're currently the first up
		if (IKE.hud_override_text == message) {
			if (direction == 'left') {
				IKE.text(message);
			}
			else {
				IKE.text(message.substring(message.length - max_length, message.length));
			}
		}

		// Add a time buffer before scrolling starts (if this isn't a turn signal message)
		setTimeout(() => {
			for (var scroll = 0; scroll <= message.length - max_length; scroll++) {
				setTimeout((current_scroll, message_full, direction) => {
					// Only send the message if we're currently the first up
					if (IKE.hud_override_text == message_full) {
						if (direction == 'left') {
							IKE.text(message.substring(current_scroll, current_scroll + max_length));
						}
						else {
							IKE.text(message.substring(message.length - max_length - current_scroll, message.length - current_scroll));
						}
					}
				}, scroll_delay * scroll, scroll, message, direction);
			}
		}, scroll_delay_timeout);
	}

	// Clear the override flag
	setTimeout((message_full) => {
		// Only deactivate the override if we're currently first up
		if (IKE.hud_override_text == message_full) {
			IKE.hud_override = false;
			IKE.hud_refresh();
		}
	}, timeout, message);
}

// Check control messages
function text_urgent(message, timeout = 5000) {
	let message_hex;

	kodi.notify(module_name, message);

	message_hex = [ 0x1A, 0x35, 0x00 ];
	message_hex = message_hex.concat(hex.a2h(pad(message, 20)));

	bus.data.send({
		src : 'CCM',
		msg : message_hex,
	});

	// Clear the message after 5 seconds
	setTimeout(() => {
		text_urgent_off();
	}, timeout);
}

// Clear check control messages, then refresh HUD
function text_urgent_off() {
	bus.data.send({
		src : 'CCM',
		msg : [ 0x1A, 0x30, 0x00 ],
	});

	IKE.hud_refresh();
}

// Check control warnings
function text_warning(message, timeout = 10000) {
	let message_hex;

	// 3rd byte:
	// 0x00 : no gong,   no arrow
	// 0x01 : no gong,   solid arrow
	// 0x02 : no gong,   no arrow
	// 0x03 : no gong,   flash arrow
	// 0x04 : 1 hi gong, no arrow
	// 0x08 : 2 hi gong, no arrow
	// 0x0C : 3 hi gong, no arrow
	// 0x10 : 1 lo gong, no arrow
	// 0x18 : 3 beep,    no arrow

	message_hex = [ 0x1A, 0x37, 0x03 ]; // no gong, flash arrow
	message_hex = message_hex.concat(hex.a2h(pad(message, 20)));

	bus.data.send({
		src : 'CCM',
		msg : message_hex,
	});

	// Clear the message after the timeout
	setTimeout(() => {
		text_urgent_off();
	}, timeout);
}


// Exported data
module.exports = {
	// HUD refresh vars
	timeout_data_refresh : null,
	last_hud_refresh     : now(),
	hud_override         : false,
	hud_override_text    : null,


	// Ignition state change vars
	state_powerdown   : null,
	state_poweroff    : null,
	state_powerup     : null,
	state_run         : null,
	state_start_begin : null,
	state_start_end   : null,


	// Functions
	api_command               : api_command,
	data_refresh              : data_refresh,
	decode_aux_heat_led       : decode_aux_heat_led,
	decode_ignition_status    : decode_ignition_status,
	decode_odometer           : decode_odometer,
	decode_sensor_status      : decode_sensor_status,
	decode_speed_values       : decode_speed_values,
	decode_temperature_values : decode_temperature_values,
	hud_refresh               : hud_refresh,
	ignition                  : ignition,
	logmod                    : logmod,
	obc_clock                 : obc_clock,
	obc_data                  : obc_data,
	obc_refresh               : obc_refresh,
	parse_out                 : parse_out,
	text                      : text,
	text_override             : text_override,
	text_urgent               : text_urgent,
	text_urgent_off           : text_urgent_off,
	text_warning              : text_warning,

	request : request,
};
