const module_name = __filename.slice(__dirname.length + 1, -3);

const EventEmitter = require('events');
const convert      = require('node-unit-conversion');
const moment       = require('moment');
const now          = require('performance-now');
const os           = require('os');
const pad          = require('pad');


// Clear check control messages, then refresh HUD
function text_urgent_off() {
	bus.data.send({
		src : 'CCM',
		msg : [ 0x1A, 0x30, 0x00 ],
	});

	// Something about this is super-duper-extra-nasty-hacky
	// ...
	//
	// ........
	//
	// .. Seriously, I'm nauseous, but as usual, it's late.....
	new IKE().hud_refresh(true);
}

class IKE extends EventEmitter {
	constructor() {
		super();

		// Max length of cluster text
		this.max_len_text = 20;

		// HUD refresh vars
		this.timeout_data_refresh = null;
		this.last_hud_refresh     = now();
		this.hud_override         = false;
		this.hud_override_text    = null;

		this.timeout_accept_refresh = null;

		this.hud_refresh = this.hud_refresh;

		this.text_urgent_off = text_urgent_off;
	}

	// This actually is a bitmask but.. this is also a freetime project
	decode_aux_heat_led(data) {
		data.command = 'bro';

		let aux_heat_led;

		switch (data.msg[2]) {
			case 0x00 : aux_heat_led = 'off';   break;
			case 0x04 : aux_heat_led = 'on';    break;
			case 0x08 : aux_heat_led = 'blink'; break;
			default   :	aux_heat_led = Buffer.from(data.msg);
		}

		update.status('obc.aux_heat_led', aux_heat_led);
		data.value = 'aux heat LED: ' + status.obc.aux_heat_led;

		return data;
	}

	decode_country_coding_data(data) {
		data.command = 'bro';
		data.value   = 'TODO country coding data';

		return data;
	}

	decode_gong_status(data) {
		data.command = 'bro';
		data.value   = 'TODO gong status ' + data.msg;

		return data;
	}

	decode_obc_text(data) {
		data.command = 'upd';

		// data.msg[1] - Layout
		let layout = obc_values.h2n(data.msg[1]);

		switch (layout) {
			case 'time' : {
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

			case 'date' : {
				let string_date;

				// Parse value
				string_date = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7], data.msg[8], data.msg[9], data.msg[10], data.msg[11], data.msg[12] ]);
				string_date = string_date.toString().trim();

				// Update status variables
				update.status('obc.date', string_date);
				break;
			}

			case 'outside-temp' : {
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
					case 'c' : {
						update.status('coding.unit.temp',           'c');
						update.status('temperature.exterior.obc.c', Math.round(parseFloat(string_outside_temp_value)));
						update.status('temperature.exterior.obc.f', Math.round(parseFloat(convert(parseFloat(string_outside_temp_value)).from('celsius').to('fahrenheit'))));
						break;
					}

					case 'f' : {
						update.status('coding.unit.temp',           'f');
						update.status('temperature.exterior.obc.c', Math.round(parseFloat(convert(parseFloat(string_outside_temp_value)).from('fahrenheit').to('celsius'))));
						update.status('temperature.exterior.obc.f', Math.round(parseFloat(string_outside_temp_value)));
						break;
					}
				}
				break;
			}

			case 'consumption-1' : {
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
					case 'm' : {
						update.status('coding.unit.cons', 'mpg');
						consumption_mpg  = string_consumption_1;
						consumption_l100 = 235.21 / string_consumption_1;
						break;
					}

					default: {
						update.status('coding.unit.cons', 'l100');
						consumption_mpg  = 235.21 / string_consumption_1;
						consumption_l100 = string_consumption_1;
						break;
					}
				}

				// Update status variables
				update.status('obc.consumption.c1.mpg',  parseFloat(consumption_mpg.toFixed(2)));
				update.status('obc.consumption.c1.l100', parseFloat(consumption_l100.toFixed(2)));
				break;
			}

			case 'consumption-2' : {
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
				switch (string_consumption_2_unit) {
					case 'm' : {
						consumption_mpg  = string_consumption_2;
						consumption_l100 = 235.215 / string_consumption_2;
						break;
					}

					default: {
						consumption_mpg  = 235.215 / string_consumption_2;
						consumption_l100 = string_consumption_2;
					}
				}

				// Update status variables
				update.status('obc.consumption.c2.mpg',  parseFloat(consumption_mpg.toFixed(2)));
				update.status('obc.consumption.c2.l100', parseFloat(consumption_l100.toFixed(2)));
				break;
			}

			case 'range' : {
				let string_range;
				let string_range_unit;

				// Parse value
				string_range = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6] ]);
				string_range = string_range.toString().trim();

				string_range_unit = Buffer.from([ data.msg[7], data.msg[8] ]);
				string_range_unit = string_range_unit.toString().trim().toLowerCase();

				// Update status variables
				switch (string_range_unit) {
					case 'ml' : {
						update.status('coding.unit.distance', 'mi');
						update.status('obc.range.mi', parseFloat(string_range));
						update.status('obc.range.km', parseFloat(convert(parseFloat(string_range)).from('kilometre').to('us mile').toFixed(2)));
						break;
					}

					case 'km' : {
						update.status('coding.unit.distance', 'km');
						update.status('obc.range.mi', parseFloat(convert(parseFloat(string_range)).from('us mile').to('kilometre').toFixed(2)));
						update.status('obc.range.km', parseFloat(string_range));
						break;
					}
				}
				break;
			}

			case 'distance' : {
				let string_distance;

				// Parse value
				string_distance = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6] ]);
				string_distance = string_distance.toString().trim().toLowerCase();

				// Update status variables
				update.status('obc.distance', parseFloat(string_distance));
				break;
			}

			case 'arrival' : {
				let string_arrival;

				// Parse value
				string_arrival = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7], data.msg[8], data.msg[9] ]);
				string_arrival = string_arrival.toString().trim().toLowerCase();

				// Update status variables
				update.status('obc.arrival', string_arrival);
				break;
			}

			case 'limit' : {
				let string_limit;

				// Parse value
				string_limit = Buffer.from([ data.msg[3], data.msg[4], data.msg[5] ]);
				string_limit = parseFloat(string_limit.toString().trim().toLowerCase());

				// Update status variables
				update.status('obc.limit', parseFloat(string_limit.toFixed(2)));
				break;
			}

			case 'average-speed' : {
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
					case 'k' : {
						update.status('obc.coding.unit.speed', 'kmh');

						// Update status variables
						update.status('obc.average_speed.kmh', parseFloat(string_average_speed.toFixed(2)));
						update.status('obc.average_speed.mph', parseFloat(convert(string_average_speed).from('kilometre').to('us mile').toFixed(2)));
						break;
					}

					case 'm' : {
						update.status('obc.coding.unit.speed', 'mph');

						// Update status variables
						update.status('obc.average_speed.kmh', parseFloat(convert(string_average_speed).from('us mile').to('kilometre').toFixed(2)));
						update.status('obc.average_speed.mph', parseFloat(string_average_speed.toFixed(2)));
						break;
					}
				}
				break;
			}

			case 'code' : {
				let string_code;

				// Parse value
				string_code = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6] ]);
				string_code = string_code.toString().trim().toLowerCase();

				// Update status variable
				update.status('obc.code', string_code);
				break;
			}

			case 'stopwatch' : {
				let string_stopwatch;

				// Parse value
				string_stopwatch = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6] ]);
				string_stopwatch = parseFloat(string_stopwatch.toString().trim().toLowerCase()).toFixed(2);

				// Update status variables
				update.status('obc.stopwatch', string_stopwatch);
				break;
			}

			case 'timer-1' : {
				let string_aux_heat_timer_1;

				// Parse value
				string_aux_heat_timer_1 = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7], data.msg[8], data.msg[9] ]);
				string_aux_heat_timer_1 = string_aux_heat_timer_1.toString().trim().toLowerCase();

				// Update status variables
				update.status('obc.aux_heat_timer.t1', string_aux_heat_timer_1);
				break;
			}

			case 'timer-2' : {
				let string_aux_heat_timer_2;

				// Parse value
				string_aux_heat_timer_2 = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7], data.msg[8], data.msg[9] ]);
				string_aux_heat_timer_2 = string_aux_heat_timer_2.toString().trim().toLowerCase();

				// Update status variables
				update.status('obc.aux_heat_timer.t2', string_aux_heat_timer_2);
				break;
			}

			case 'interim' : {
				let string_interim;

				// Parse value
				string_interim = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6] ]);
				string_interim = parseFloat(string_interim.toString().trim().toLowerCase()).toFixed(2);

				// Update status variables
				update.status('obc.interim', parseFloat(string_interim));
				break;
			}
		}

		data.value = 'OBC ' + layout.replace(/-/, ' ') + ': \'' + hex.h2s(data.msg) + '\'';

		return data;
	}

	decode_odometer(data) {
		data.command = 'bro';
		data.value   = 'odometer';

		let odometer_value1 = data.msg[3] << 16;
		let odometer_value2 = data.msg[2] << 8;
		let odometer_value  = odometer_value1 + odometer_value2 + data.msg[1];

		update.status('vehicle.odometer.km', odometer_value);
		update.status('vehicle.odometer.mi', Math.round(convert(odometer_value).from('kilometre').to('us mile')));

		return data;
	}

	decode_speed_values(data) {
		data.command = 'bro';
		data.value   = 'speed values';

		// Update vehicle and engine speed variables
		// Also allow update from IBUS/KBUS even if CANBUS is enabled when the ignition
		if (config.canbus.speed === false || status.vehicle.ignition_level < 3) {
			update.status('vehicle.speed.kmh', parseFloat(data.msg[1] * 2));
			update.status('vehicle.speed.mph', parseFloat(convert(parseFloat((data.msg[1] * 2))).from('kilometre').to('us mile').toFixed(2)));
		}

		if (config.canbus.rpm === false || status.vehicle.ignition_level < 3) {
			update.status('engine.speed', parseFloat(data.msg[2] * 100));
		}

		return data;
	}

	decode_temperature_values(data) {
		data.command = 'bro';
		data.value   = 'temperature values';

		// Update external and engine coolant temp variables
		if (config.canbus.exterior === false || status.vehicle.ignition_level < 3) {
			update.status('temperature.exterior.c', Math.round(parseFloat(data.msg[1])));
			update.status('temperature.exterior.f', Math.round(convert(parseFloat(data.msg[1])).from('celsius').to('fahrenheit')));
		}

		if (config.canbus.coolant === false || status.vehicle.ignition_level < 3) {
			update.status('temperature.coolant.c', Math.round(parseFloat(data.msg[2])));
			update.status('temperature.coolant.f', Math.round(convert(parseFloat(data.msg[2])).from('celsius').to('fahrenheit')));
		}

		this.hud_refresh();

		return data;
	}

	// Pretend to be IKE saying the car is on
	// Note - this can and WILL set the alarm off - kudos to the Germans
	ignition(value) {
		log.module({ msg : 'Sending ignition status: ' + value });

		let status;
		switch (value) {
			case 'off'  : status = 0x00; break;
			case 'pos1' : status = 0x01; break;
			case 'pos2' : status = 0x03; break;
			case 'pos3' : status = 0x07;
		}

		bus.data.send({
			dst : 'GLO',
			msg : [ 0x11, status ],
		});
	}

	// Refresh custom HUD speed
	hud_refresh_speed() {
		if (!this.ok2hud()) return;

		// Send text to IKE and update this.last_hud_refresh value
		this.text(status.vehicle.speed.mph + 'mph', () => {
			this.last_hud_refresh = now();
		});
	}

	// Refresh custom HUD
	hud_refresh(override = false) {
		if (override === false && !this.ok2hud()) return;

		log.module({ msg : 'Refreshing HUD' });

		let string_load;
		let string_cons  = '';
		let string_speed = '';
		let string_temp  = '';
		let string_time  = moment().format('h:mm'); // TODO add config option for 12h/24h
		let string_volt  = status.lcm.voltage.terminal_30 + 'v';

		// Only add data to strings if it is populated
		if (status.obc.consumption.c1.mpg !== null) string_cons  = pad(5, parseFloat(status.obc.consumption.c1.mpg).toFixed(1) + 'm', '0');
		if (status.temperature.coolant.c  !== null) string_temp  = status.temperature.coolant.c + '¨';
		if (status.vehicle.speed.mph      !== null) string_speed = status.vehicle.speed.mph + 'mph';

		// 1m sysload to percentage
		string_load = Math.round(status.system.cpu.load_pct);
		string_load = status.system.temperature + '¨|' + string_load + '%';

		// Space-pad strings
		let hud_strings = {
			center : pad(string_temp,  6),
			left   : pad(string_cons,  9),
			load   : pad(string_load,  9),
			right  : pad(string_time,  9),
			speed  : pad(string_speed, 9),
			volt   : pad(string_volt,  9),
		};

		hud_strings.center = pad(string_temp, (4 + (7 - string_time.length)));

		// Change left string to be load/CPU temp if over threshold
		if (status.system.temperature > 65) hud_strings.left = hud_strings.load;

		// Change left string to be LCM terminal 30 voltage if under threshold
		if (status.lcm.voltage.terminal_30 < 13) hud_strings.left = hud_strings.volt;

		// Assemble text string
		let hud_string = hud_strings.left + hud_strings.center + hud_strings.right;

		// Send text to IKE and update this.last_hud_refresh value
		this.text(hud_string, () => { this.last_hud_refresh = now(); });

		// socket.lcd_text_tx({
		// 	upper : 'kdm-e39-01',
		// 	lower : status.system.temperature + 'C|' + status.system.cpu.load_pct + '%',
		// });
	}

	// OBC set clock
	obc_clock() {
		log.module({ msg : 'Setting OBC clock to current time' });

		let time = moment();

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
	obc_data(action, value, target) {
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

			case 'set' : {
				cmd       = 0x40; // OBC data set (speed limit/distance)
				action_id = 0x00;
				break;
			}
		}

		// Assemble message string, with OBC value from value argument
		let msg = [ cmd, obc_values.n2h(value), action_id ];

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

	// Check control messages
	text_urgent(message, timeout = 5000) {
		log.msg({ msg : 'Sending urgent IKE text message: \'' + message + '\'' });

		let message_hex;

		kodi.notify(module_name, message);

		message_hex = [ 0x1A, 0x35, 0x00 ];
		message_hex = message_hex.concat(this.text_prepare(message));

		bus.data.send({
			src : 'CCM',
			msg : message_hex,
		});

		// Clear the message after 5 seconds
		if (timeout !== 0) setTimeout(IKE.text_urgent_off, timeout);
	}

	// Check control warnings
	text_warning(message, timeout = 10000) {
		log.msg('Sending warning IKE text message: \'' + message + '\'');

		let message_hex;

		// 3rd byte:
		// 0x00 : arrow: none,  sound: none
		// 0x01 : arrow: solid, sound: none
		// 0x02 : arrow: none,  sound: none
		// 0x03 : arrow: flash, sound: none
		// 0x04 : arrow: none,  sound: 1 gong,  high
		// 0x08 : arrow: none,  sound: 2 gongs, high
		// 0x0C : arrow: none,  sound: 3 gongs, high
		// 0x10 : arrow: none,  sound: 1 gong,  low
		// 0x18 : arrow: none,  sound: 3 beeps

		message_hex = [ 0x1A, 0x37, 0x10 ]; // 1 gong, low
		message_hex = message_hex.concat(this.text_prepare(message));

		bus.data.send({
			src : 'CCM',
			msg : message_hex,
		});

		// Clear the message after the timeout
		if (timeout !== 0) setTimeout(this.text_urgent_off, timeout);
	}

	// Trim IKE text string and potentially space-pad
	text_prepare(message, pad = false) {
		// Trim string to max length
		message = message.substring(0, this.max_len_text);

		// Space-pad if pad === true
		if (pad === true) message = pad(message, this.max_len_text);

		// Convert ASCII to hex and return
		return hex.a2h(message);
	}

	ok2hud() {
		// Bounce if the ignition is off
		if (status.vehicle.ignition_level < 1) return false;

		// Bounce if override is active
		if (this.hud_override === true) return false;

		// Bounce if the last update was less than 1500ms ago
		if (now() - this.last_hud_refresh <= 1500) return false;

		return true;
	}

	// IKE cluster text send message - without space padding
	text_nopad(message, cb = null, override = false) {
		// Bounce if override is active
		if (override === false && this.hud_override === true) {
			log.msg({ msg : 'NOT sending non-padded IKE text message: \'' + message + '\'' });

			// Exec callback function if present
			typeof cb === 'function' && cb();
			return;
		}

		log.msg({ msg : 'Sending non-padded IKE text message: \'' + message + '\'' });

		let message_hex;

		message_hex = [ 0x23, 0x42, 0x30 ];
		message_hex = message_hex.concat(this.text_prepare(message, false));

		bus.data.send({
			src : 'TEL',
			msg : message_hex,
		});

		// Exec callback function if present
		typeof cb === 'function' && cb();
	}


	// Refresh various values every 5 seconds
	data_refresh() {
		if (status.vehicle.ignition_level === 0) {
			if (this.timeout_data_refresh !== null) {
				clearTimeout(this.timeout_data_refresh);
				this.timeout_data_refresh = null;

				log.module({ msg : 'Unset data refresh timeout' });

				return;
			}
		}

		// Request fresh data
		this.request('ignition');
		this.request('temperature');

		LCM.request('io-status');

		if (status.vehicle.ignition_level !== 0) {
			if (this.timeout_data_refresh === null) log.module({ msg : 'Set data refresh timeout' });

			// setTimeout for next update
			let self = this;
			this.timeout_data_refresh = setTimeout(() => {
				self.data_refresh();
			}, 10000);
		}
	}

	decode_ignition_status(data) {
		// Save previous ignition status
		let previous_level = status.vehicle.ignition_level;

		// Set ignition status value
		if (update.status('vehicle.ignition_level', data.msg[1])) {
			// Activate autolights if we got 'em
			LCM.auto_lights_process();
			// Disable/enable HUD refresh
			this.data_refresh();
		}

		switch (data.msg[1]) {
			case 0  : update.status('vehicle.ignition', 'off');       break;
			case 1  : update.status('vehicle.ignition', 'accessory'); break;
			case 3  : update.status('vehicle.ignition', 'run');       break;
			case 7  : update.status('vehicle.ignition', 'start');     break;
			default : update.status('vehicle.ignition', 'unknown');
		}

		// Ignition going up
		if (data.msg[1] > previous_level) {
			switch (data.msg[1]) { // Evaluate new ignition state
				case 1: // Accessory
					log.module({ msg : 'Powerup state' });
					this.emit('ignition-powerup');

					bus.cmds.request_device_status(module_name, 'RAD');
					break;

				case 3: // Run
					// If the accessory (1) ignition message wasn't caught
					if (previous_level === 0) {
						log.module({ msg : 'Powerup state' });
						this.emit('ignition-powerup');

						bus.cmds.request_device_status(module_name, 'RAD');
					}

					log.module({ msg : 'Run state' });
					this.emit('ignition-run');

					// Refresh OBC data
					if (config.options.obc_refresh_on_start === true) this.obc_refresh();
					break;

				case 7 : { // Start
					switch (previous_level) {
						case 0 : { // If the accessory (1) ignition message wasn't caught
							log.module({ msg : 'Powerup state' });
							this.emit('ignition-powerup');

							bus.cmds.request_device_status(module_name, 'RAD');
							break;
						}

						case 3 : { // If the run (3) ignition message wasn't caught
							log.module({ msg : 'Run state' });
							this.emit('ignition-run');

							// Refresh OBC data
							if (config.options.obc_refresh_on_start === true) this.obc_refresh();
							break;
						}

						default : {
							log.module({ msg : 'Start-begin state' });
							this.emit('ignition-start-begin');
						}
					}
				}
			}
		}

		// Ignition going down
		else if (data.msg[1] < previous_level) {
			switch (data.msg[1]) { // Evaluate new ignition state
				case 0: // Off
					// If the accessory (1) ignition message wasn't caught
					if (previous_level === 3) {
						log.module({ msg : 'Powerdown state' });
						this.emit('ignition-powerdown');
					}

					log.module({ msg : 'Poweroff state' });
					this.emit('ignition-poweroff');
					break;

				case 1: // Accessory
					log.module({ msg : 'Powerdown state' });
					this.emit('ignition-powerdown');
					break;

				case 3: // Run
					log.module({ msg : 'Start-end state' });
					this.emit('ignition-start-end');
			}
		}

		data.command = 'bro';
		data.value   = 'ignition: ' + status.vehicle.ignition;

		return data;
	}

	decode_sensor_status(data) {
		data.command = 'bro';
		data.value   = 'sensor status';

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
				if (status.vehicle.reverse === true) this.text_override('you\'re in reverse..');
			}
		}

		return data;
	}

	init_listeners() {
		// Refresh data on interface connection
		socket.on('accept', () => {
			this.text_warning('   bmwcd restart', 5000);

			// Clear existing timeout if exists
			if (this.timeout_accept_refresh !== null) {
				clearTimeout(this.timeout_accept_refresh);
				this.timeout_accept_refresh = null;
			}

			this.timeout_accept_refresh = setTimeout(() => {
				switch (config.options.obc_refresh_on_start) {
					case true : this.obc_refresh(); break;
					default   : this.request('ignition');
				}
			}, 2500);
		});

		// Refresh data on GM keyfob unlock event
		GM.on('keyfob', (keyfob) => {
			switch (keyfob.button) {
				case 'unlock' : this.data_refresh();
			}
		});
	}

	// Refresh OBC data
	obc_refresh() {
		this.emit('obc-refresh');

		log.module({ msg : 'Refreshing all OBC data' });

		// Immo+GM data
		EWS.request('immobiliserstatus');
		GM.request('io-status');
		GM.request('door-status');

		// IHKA IO status
		// IHKA.request('io-status');

		// DME engine data
		// DME.request('motor-values');

		// IKE data
		this.request('coding');
		this.request('ignition');
		this.request('odometer');
		this.request('sensor');
		this.request('temperature');
		this.request('vin');

		// OBC data
		this.obc_data('get', 'arrival');
		this.obc_data('get', 'timer-1');
		this.obc_data('get', 'timer-2');
		this.obc_data('get', 'auxheatvent');
		this.obc_data('get', 'code');
		this.obc_data('get', 'consumption-1');
		this.obc_data('get', 'consumption-2');
		this.obc_data('get', 'date');
		this.obc_data('get', 'distance');
		this.obc_data('get', 'range');
		this.obc_data('get', 'average-speed');
		this.obc_data('get', 'limit');
		this.obc_data('get', 'stopwatch');
		this.obc_data('get', 'outside-temp');
		this.obc_data('get', 'time');
		this.obc_data('get', 'timer');

		// Blow it out
		if (config.options.modules_refresh_on_start === true) {
			this.request('status-glo');
		}
		else {
			this.request('status-short');
		}
	}

	// Parse data sent from IKE module
	parse_out(data) {
		// Init variables
		switch (data.msg[0]) {
			case 0x07: // Gong status
				data = this.decode_gong_status(data);
				break;

			case 0x11: // Broadcast: Ignition status
				data = this.decode_ignition_status(data);
				break;

			case 0x13: // IKE sensor status
				data = this.decode_sensor_status(data);
				break;

			case 0x15: // country coding data
				data = this.decode_country_coding_data(data);
				break;

			case 0x17: // Odometer
				data = this.decode_odometer(data);
				break;

			case 0x18: // Vehicle speed and RPM
				data = this.decode_speed_values(data);
				break;

			case 0x19: // Coolant temp and external temp
				data = this.decode_temperature_values(data);
				break;

			case 0x24: // Update: OBC text
				data = this.decode_obc_text(data);
				break;

			case 0x2A: // Broadcast: Aux heat LED status
				data = this.decode_aux_heat_led(data);
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
	request(value) {
		let cmd = null;
		let src = 'VID';
		let dst = module_name;

		let loop_dst;

		switch (value) {
			case 'ignition'    : cmd = [ 0x10 ];                     break;
			case 'sensor'      : cmd = [ 0x12 ];                     break;
			case 'coding'      : cmd = [ 0x14 ];       src = 'RAD';  break;
			case 'odometer'    : cmd = [ 0x16 ];       src = 'EWS';  break;
			case 'dimmer'      : cmd = [ 0x1D, 0xC5 ]; src = 'IHKA'; break;
			case 'temperature' : cmd = [ 0x1D, 0xC5 ]; src = 'LCM';  break;

			case 'vin' : {
				src = module_name;
				dst = 'LCM';
				cmd = [ 0x53 ];
				break;
			}

			case 'status-glo' : {
				for (loop_dst in bus.modules.modules) {
					if (loop_dst != 'DIA' && loop_dst != 'GLO' && loop_dst != 'LOC' && loop_dst != src) {
						bus.cmds.request_device_status('IKE', loop_dst);
					}
				}
				return;
			}

			case 'status-short' : {
				bus.modules.modules_check.forEach((loop_dst) => {
					src = module_name;

					if (loop_dst != 'DIA' && loop_dst != 'GLO' && loop_dst != 'LOC' && loop_dst != src) {
						bus.cmds.request_device_status('IKE', loop_dst);
					}
				});
				return;
			}

			default : return;
		}

		log.module({ msg : 'Requesting \'' + value + '\'' });

		bus.data.send({
			src : src,
			dst : dst,
			msg : cmd,
		});
	}

	// IKE cluster text send message
	text(message, cb = null, override = false) {
		// Bounce if override is active
		if (override === false && this.hud_override === true) {
			log.msg({ msg : 'NOT sending space-padded IKE text message: \'' + message + '\'' });

			// Exec callback function if present
			typeof cb === 'function' && cb();
			return;
		}

		log.msg({ msg : 'Sending space-padded IKE text message: \'' + message + '\'' });

		let message_hex;

		// message_hex = [ 0x23, 0x42, 0x30 ];
		message_hex = [ 0x23, 0x50, 0x30, 0x07 ];

		message_hex = message_hex.concat(this.text_prepare(message));

		message_hex = message_hex.concat(0x04);
		// message_hex = message_hex.concat(0x66);

		bus.data.send({
			src : 'RAD',
			msg : message_hex,
		});

		// Exec callback function if present
		typeof cb === 'function' && cb();
	}

	// IKE cluster text send message, override other messages
	text_override(message, timeout = 2500, direction = 'left', turn = false) {
		// kodi.notify(module_name, message);
		let scroll_delay         = 300;
		let scroll_delay_timeout = scroll_delay * 5;

		// Override scroll_delay_timeout if we're showing a turn signal message
		if (turn === true) {
			scroll_delay         = 200;
			scroll_delay_timeout = 250;
			timeout              = 0;
		}

		// Delare that we're currently first up
		this.hud_override      = true;
		this.hud_override_text = message;

		// Equal to or less than 20 char
		if (message.length - this.max_len_text <= 0) {
			if (this.hud_override_text === message) this.text(message, null, true);
		}
		else {
			// Adjust timeout since we will be scrolling
			timeout = timeout + (scroll_delay * 5) + (scroll_delay * (message.length - this.max_len_text));

			// Send initial string if we're currently the first up
			if (this.hud_override_text == message) {
				switch (direction) {
					case 'left' : {
						this.text(message, null, true);
						break;
					}

					case 'right' : {
						this.text(message.substring(message.length - this.max_len_text, message.length), null, true);
					}
				}
			}

			// Add a time buffer before scrolling starts (if this isn't a turn signal message)
			setTimeout(() => {
				for (let scroll = 0; scroll <= message.length - this.max_len_text; scroll++) {
					setTimeout((current_scroll, message_full, direction) => {
						// Only send the message if we're currently the first up
						if (this.hud_override_text !== message_full) return;

						switch (direction) {
							case 'left' : {
								this.text(message.substring(current_scroll, current_scroll + this.max_len_text), null, true);
								break;
							}

							case 'right' : {
								this.text(message.substring(message.length - this.max_len_text - current_scroll, message.length - current_scroll), null, true);
							}
						}
					}, scroll_delay * scroll, scroll, message, direction);
				}
			}, scroll_delay_timeout);
		}

		// Clear the override flag
		setTimeout((message_full) => {
			// Only deactivate the override if we're currently first up
			if (this.hud_override_text === message_full) {
				this.hud_override = false;
				this.hud_refresh(true);
			}
		}, timeout, message);
	}

	// Welcome text message in cluster
	welcome_message() {
		if (config.options.message_welcome !== true) return;

		this.text_override('node-bmw | Host:' + os.hostname().split('.')[0] + ' | Mem:' + Math.round((os.freemem() / os.totalmem()) * 101) + '% | Up:' + parseFloat(os.uptime() / 3600).toFixed(2) + ' hrs');
	}
}

module.exports = IKE;
