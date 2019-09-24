const module_name = __filename.slice(__dirname.length + 1, -3);

const EventEmitter = require('events');
const convert      = require('node-unit-conversion');
const moment       = require('moment');
const now          = require('performance-now');
const os           = require('os');


// Clear check control messages, then refresh HUD
function text_urgent_off() {
	if (config.intf.ibus.enabled !== true) return;

	bus.data.send({
		src : 'CCM',
		msg : [ 0x1A, 0x30, 0x00 ],
	});
}


class IKE extends EventEmitter {
	constructor() {
		super();

		// Max length of cluster text
		this.max_len_text = 20;

		// HUD refresh vars
		this.timeout_data_refresh = null;
		this.hud_override         = false;
		this.hud_override_text    = null;

		this.timeout_accept_refresh = null;

		this.hud_refresh = this.hud_refresh;

		this.text_urgent_off = text_urgent_off;
	}


	// Broadcast: Aux heat LED status
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

		update.status('obc.aux_heat_led', aux_heat_led, false);
		data.value = 'aux heat LED: ' + status.obc.aux_heat_led;

		return data;
	}

	// Broadcast: BC button press (MFL BC stalk button)
	decode_bc_button(data) {
		data.command = 'bro';
		data.value   = 'BC button';

		// Extend cluster HUD refresh by 5 seconds, so you can read what's on the screen
		update.status('hud.refresh_last', (status.hud.refresh_last + 5000));

		// 5.2 seconds later, re-refresh it
		setTimeout(() => {
			this.hud_refresh();
		}, 5200);

		return data;
	}

	// Broadcast: Country coding data
	decode_country_coding_data(data) {
		data.command = 'bro';
		data.value   = 'TODO country coding data';

		return data;
	}

	// Gong status
	decode_gong_status(data) {
		data.command = 'bro';
		data.value   = 'TODO gong status ' + data.msg;

		return data;
	}

	// Update: OBC text
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
					update.status('coding.unit.time', '12h', false);
					string_time = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7], data.msg[8], data.msg[9] ]);
				}
				else {
					update.status('coding.unit.time', '24h', false);
					string_time = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7] ]);
				}

				string_time = string_time.toString().trim().toLowerCase();

				// Update status object
				update.status('obc.time', string_time, false);
				break;
			}

			case 'date' : {
				let string_date;

				// Parse value
				string_date = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7], data.msg[8], data.msg[9], data.msg[10], data.msg[11], data.msg[12] ]);
				string_date = string_date.toString().trim();

				// Update status object
				update.status('obc.date', string_date, false);
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

				// Update status object
				switch (string_outside_temp_unit) {
					case 'c' : {
						update.status('coding.unit.temp', 'c', false);

						update.status('temperature.exterior.obc.c', Math.floor(parseFloat(string_outside_temp_value)),                                                       false);
						update.status('temperature.exterior.obc.f', Math.floor(parseFloat(convert(parseFloat(string_outside_temp_value)).from('celsius').to('fahrenheit'))), false);
						break;
					}

					case 'f' : {
						update.status('coding.unit.temp', 'f', false);

						update.status('temperature.exterior.obc.c', Math.floor(parseFloat(convert(parseFloat(string_outside_temp_value)).from('fahrenheit').to('celsius'))), false);
						update.status('temperature.exterior.obc.f', Math.floor(parseFloat(string_outside_temp_value)),                                                       false);
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
				string_consumption_1 = parseFloat(string_consumption_1.toString().trim()) || 0;

				// Perform appropriate conversions between units
				switch (string_consumption_1_unit) {
					case 'm' : {
						update.status('coding.unit.cons', 'mpg', false);
						consumption_mpg  = string_consumption_1;
						consumption_l100 = 235.21 / string_consumption_1;
						break;
					}

					default: {
						update.status('coding.unit.cons', 'l100', false);
						consumption_mpg  = 235.21 / string_consumption_1;
						consumption_l100 = string_consumption_1;
						break;
					}
				}

				// Update status object
				update.status('obc.consumption.c1.mpg',  parseFloat(consumption_mpg.toFixed(2)),  false);
				update.status('obc.consumption.c1.l100', parseFloat(consumption_l100.toFixed(2)), false);
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
				string_consumption_2 = parseFloat(string_consumption_2.toString().trim()) || 0;

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

				// Update status object
				update.status('obc.consumption.c2.mpg',  parseFloat(consumption_mpg.toFixed(2)),  false);
				update.status('obc.consumption.c2.l100', parseFloat(consumption_l100.toFixed(2)), false);
				break;
			}

			case 'range' : {
				let string_range;
				let string_range_unit;

				// Parse value
				string_range = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6] ]);
				string_range = parseFloat(string_range.toString().trim());

				string_range_unit = Buffer.from([ data.msg[7], data.msg[8] ]);
				string_range_unit = string_range_unit.toString().trim().toLowerCase();

				// Update status object
				switch (string_range_unit) {
					case 'ml' : {
						update.status('coding.unit.distance', 'mi', false);

						update.status('obc.range.mi', string_range,                                                                      false);
						update.status('obc.range.km', parseFloat(convert(string_range).from('kilometre').to('us mile').toFixed(2)) || 0, false);
						break;
					}

					case 'km' : {
						update.status('coding.unit.distance', 'km', false);

						update.status('obc.range.mi', parseFloat(convert(string_range).from('us mile').to('kilometre').toFixed(2)) || 0, false);
						update.status('obc.range.km', string_range,                                                                      false);
					}
				}

				break;
			}

			case 'distance' : {
				let string_distance;

				// Parse value
				string_distance = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6] ]);
				string_distance = parseFloat(string_distance.toString().trim().toLowerCase()) || 0;

				// Update status object
				update.status('obc.distance', string_distance, false);
				break;
			}

			case 'arrival' : {
				let string_arrival;

				// Parse value
				string_arrival = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7], data.msg[8], data.msg[9] ]);
				string_arrival = string_arrival.toString().trim().toLowerCase();

				// Update status object
				update.status('obc.arrival', string_arrival, false);
				break;
			}

			case 'limit' : {
				let string_limit;

				// Parse value
				string_limit = Buffer.from([ data.msg[3], data.msg[4], data.msg[5] ]);
				string_limit = parseFloat(string_limit.toString().trim().toLowerCase()) || 0;

				// Update status object
				update.status('obc.limit', string_limit, false);
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
				string_average_speed = parseFloat(string_average_speed.toString().trim()) || 0;

				// Convert values appropriately based on coding valueunits
				switch (string_average_speed_unit) {
					case 'k' : {
						update.status('obc.coding.unit.speed', 'kmh', false);

						// Update status object
						update.status('obc.average_speed.kmh', string_average_speed,                                                                 false);
						update.status('obc.average_speed.mph', parseFloat(convert(string_average_speed).from('kilometre').to('us mile').toFixed(2)), false);
						break;
					}

					case 'm' : {
						update.status('obc.coding.unit.speed', 'mph', false);

						// Update status object
						update.status('obc.average_speed.kmh', parseFloat(convert(string_average_speed).from('us mile').to('kilometre').toFixed(2)), false);
						update.status('obc.average_speed.mph', string_average_speed,                                                                 false);
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

				// Update status object
				update.status('obc.code', string_code, false);
				break;
			}

			case 'stopwatch' : {
				let string_stopwatch;

				// Parse value
				string_stopwatch = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6] ]);
				string_stopwatch = parseFloat(string_stopwatch.toString().trim()) || 0;

				// Update status object
				update.status('obc.stopwatch', string_stopwatch, false);
				break;
			}

			case 'timer-1' : {
				let string_aux_heat_timer_1;

				// Parse value
				string_aux_heat_timer_1 = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7], data.msg[8], data.msg[9] ]);
				string_aux_heat_timer_1 = string_aux_heat_timer_1.toString().trim().toLowerCase();

				// Update status object
				update.status('obc.aux_heat_timer.t1', string_aux_heat_timer_1, false);
				break;
			}

			case 'timer-2' : {
				let string_aux_heat_timer_2;

				// Parse value
				string_aux_heat_timer_2 = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7], data.msg[8], data.msg[9] ]);
				string_aux_heat_timer_2 = string_aux_heat_timer_2.toString().trim().toLowerCase();

				// Update status object
				update.status('obc.aux_heat_timer.t2', string_aux_heat_timer_2, false);
				break;
			}

			case 'interim' : {
				let string_interim;

				// Parse value
				string_interim = Buffer.from([ data.msg[3], data.msg[4], data.msg[5], data.msg[6] ]);
				string_interim = parseFloat(string_interim.toString().trim().toFixed(2)) || 0;

				// Update status object
				update.status('obc.interim', string_interim, false);
				break;
			}
		}

		data.value = 'OBC ' + layout.replace(/-/, ' ') + ': \'' + hex.h2s(data.msg) + '\'';

		return data;
	}

	// Broadcast: Odometer
	decode_odometer(data) {
		data.command = 'bro';
		data.value   = 'odometer';

		let odometer_value1 = data.msg[3] << 16;
		let odometer_value2 = data.msg[2] << 8;
		let odometer_value  = odometer_value1 + odometer_value2 + data.msg[1];

		update.status('vehicle.odometer.km', odometer_value,                                                      false);
		update.status('vehicle.odometer.mi', Math.floor(convert(odometer_value).from('kilometre').to('us mile')), false);

		return data;
	}

	// Broadcast: Vehicle speed and RPM
	decode_speed_values(data) {
		data.command = 'bro';
		data.value   = 'speed values';

		// Update vehicle and engine speed variables
		// Also allow update from IBUS/KBUS even if CANBUS is enabled when the ignition is not in run
		if (config.canbus.speed === false || status.vehicle.ignition_level < 3) {
			update.status('vehicle.speed.kmh', parseFloat(data.msg[1] * 2));
			update.status('vehicle.speed.mph', parseFloat(convert(parseFloat((data.msg[1] * 2))).from('kilometre').to('us mile').toFixed(2)));
		}

		if (config.canbus.rpm === false || status.vehicle.ignition_level < 3) {
			update.status('engine.rpm', parseFloat(data.msg[2] * 100));
		}

		return data;
	}

	// Broadcast: Coolant temp and external temp
	// Update exterior and engine coolant temperature data
	decode_temperature_values(data) {
		data.command = 'bro';
		data.value   = 'temperature values';

		// Temperatures are not broadcast over CANBUS when ignition is not in run
		if (config.canbus.coolant === false || status.vehicle.ignition_level < 3) {
			let temp_coolant = parseFloat(data.msg[2]);

			// Signed value?
			if (temp_coolant > 128) temp_coolant = temp_coolant - 256;

			update.status('temperature.coolant.c', Math.floor(temp_coolant), false);
			update.status('temperature.coolant.f', Math.floor(convert(temp_coolant).from('celsius').to('fahrenheit')));
		}

		// Temperatures are not broadcast over CANBUS when ignition is not in run
		if (config.canbus.exterior === false || status.vehicle.ignition_level < 3) {
			let temp_exterior = parseFloat(data.msg[1]);

			// Signed value?
			if (temp_exterior > 128) temp_exterior = temp_exterior - 256;

			update.status('temperature.exterior.c', Math.floor(temp_exterior), false);
			update.status('temperature.exterior.f', Math.floor(convert(temp_exterior).from('celsius').to('fahrenheit')));
		}

		return data;
	}

	// Pretend to be IKE saying the car is on
	// Note - this can and WILL set the alarm off - kudos to the Germans
	ignition(state) {
		if (config.intf.ibus.enabled !== true) return;

		// Format state name
		switch (state) {
			case 0       :
			case false   :
			case '0'     :
			case 'false' :
			case 'o'     :
			case 'off'   : state = 'off'; break;

			case 1           :
			case '1'         :
			case 'a'         :
			case 'acc'       :
			case 'accessory' :
			case 'pos1'      : state = 'accessory'; break;

			case 2      :
			case '2'    :
			case 'r'    :
			case 'run'  :
			case 'pos2' : state = 'run'; break;

			case 3       :
			case '3'     :
			case 's'     :
			case 'start' :
			case 'pos3'  : state = 'start'; break;

			default : {
				log.module('Invalid ignition state: ' + state);
				return;
			}
		}

		// Prepare state value
		let value;
		switch (state) {
			case 'off'       : value = 0x00; break;
			case 'accessory' : value = 0x01; break;
			case 'run'       : value = 0x03; break;
			case 'start'     : value = 0x07;
		}

		log.module('Sending ignition state: ' + state);

		let ignition_msg = {
			src : 'IKE',
			dst : 'GLO',
			msg : [ 0x11, value ],
		};

		// If in full emulation mode, "send" the data, if not, just parse the message as if it were real
		switch (config.loopback) {
			case false : this.decode_ignition_status(ignition_msg); break;
			case true  : bus.data.send(ignition_msg);
		}
	}


	ok2hud() {
		// Bounce if the ignition is off
		if (status.vehicle.ignition_level < 1) return false;

		// Bounce if override is active
		if (this.hud_override === true) return false;

		let time_now = now();
		let refresh_delta = time_now - status.hud.refresh_last;

		// Bonce if the last update was less than the configured value in milliseconds ago
		if (refresh_delta <= config.hud.refresh_max) return false;

		update.status('hud.refresh_last', time_now);

		return true;
	}

	// Refresh custom HUD
	hud_refresh(override = false) {
		if (config.intf.ibus.enabled !== true) return;

		// Bounce if not in override mode AND it's not OK (yet) to post a HUD update
		if (override === false && !this.ok2hud()) return;

		this.hud_render(override, () => {
			// Send text to IKE
			this.text(status.hud.string);
		});
	}

	// Refresh custom HUD speed
	hud_refresh_speed() {
		if (config.intf.ibus.enabled !== true) return;

		// Bounce if it's not OK (yet) to post a HUD update
		if (!this.ok2hud()) return;

		// Send text to IKE
		this.text(status.vehicle.speed.mph + 'mph');
	}


	// Render custom HUD string
	hud_render(override = false, hud_render_cb = null) {
		if (config.intf.ibus.enabled !== true) return;

		// Determine Moment.js format string
		let moment_format;
		switch (config.hud.time.format) {
			case '24h' : moment_format = 'H:mm'; break;

			default : moment_format = 'h:mm';
		}

		let hud_strings = {
			left   : '',
			center : '',
			right  : '',

			// TODO: Use unit from config
			cons  : status.obc.consumption.c1.mpg.toFixed(1) + 'mg',
			egt   : Math.floor(status.temperature.exhaust.c) + '¨',
			iat   : Math.floor(status.temperature.intake.c) + '¨',
			load  : status.system.temperature + '¨|' + Math.ceil(status.system.cpu.load_pct) + '%',
			range : Math.floor(status.obc.range.mi) + 'mi',
			speed : status.vehicle.speed.mph + 'mph',
			temp  : Math.floor(status.temperature.coolant.c) + '¨',
			time  : moment().format(moment_format),
			volt  : status.dme.voltage,

			// Clutch count
			cc : status.vehicle.clutch_count + 'gc',
		};

		// Only use voltage from CANBUS if configured to do so, and ignition is in run
		// CANBUS data is not broadcast when key is in accessory
		if (config.canbus.voltage === false || status.vehicle.ignition_level < 3) {
			hud_strings.volt = parseFloat(status.lcm.voltage.terminal_30.toFixed(1));
		}

		// Add oil temp to temp string if configured
		if (config.hud.temp.oil === true) {
			hud_strings.temp += ' ' + Math.floor(status.temperature.oil.c) + '¨';
		}


		// TODO: Use layout from config
		hud_strings.left   = hud_strings.temp;
		hud_strings.center = hud_strings.egt;
		hud_strings.right  = hud_strings.iat;

		// Change string to be load/CPU temp if over threshold
		if (status.system.temperature > config.system.temperature.fan_enable) {
			hud_strings.left = hud_strings.load;
		}

		// Change center string to be voltage if under threshold
		if (status.dme.voltage <= config.hud.volt.threshold) {
			hud_strings.center = hud_strings.volt + 'v';
		}

		// Space-pad HUD strings
		if (typeof hud_strings.left.padEnd    === 'function') hud_strings.left  = hud_strings.left.padEnd(9);
		if (typeof hud_strings.right.padStart === 'function') hud_strings.right = hud_strings.right.padStart(4);

		if (typeof hud_strings.center.padEnd  === 'function') {
			hud_strings.center = hud_strings.center.padStart(6);
			hud_strings.center = hud_strings.center.padEnd(7);
		}

		// Update hud string in status object
		let hud_string_rendered = hud_strings.left + hud_strings.center + hud_strings.right;

		// If the newly rendered string matches the existing string, bail out
		if (override === false && status.hud.string === hud_string_rendered) return;

		update.status('hud.string', hud_string_rendered);

		typeof hud_render_cb === 'function' && process.nextTick(hud_render_cb);
		hud_render_cb = undefined;
	}


	// OBC set clock
	obc_clock() {
		if (config.intf.ibus.enabled !== true) return;

		log.module('Setting OBC clock to current time');

		// Time
		bus.data.send({
			src : 'GT',
			msg : [ 0x40, 0x01, moment().format('H'), moment().format('m') ],
		});

		// Date
		bus.data.send({
			src : 'GT',
			msg : [ 0x40, 0x02, moment().format('D'), moment().format('M'), moment().format('YY') ],
		});
	}

	// OBC data request
	obc_data(action, value, target) {
		if (config.intf.ibus.enabled !== true) return;

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
			}
		}

		// Assemble message string, with OBC value from value argument
		let msg = [ cmd, obc_values.n2h(value), action_id ];

		// If we're setting, insert the data
		if (typeof target !== 'undefined' && target) {
			msg = [ msg, target ];
		}

		// log.module(action + ' OBC value \''+value+'\'');

		bus.data.send({
			src : 'GT',
			msg : msg,
		});
	}

	// Check control messages
	text_urgent(message, timeout = 5000) {
		if (config.intf.ibus.enabled !== true) return;

		log.module('Sending urgent IKE text message: \'' + message + '\'');

		let message_hex;

		kodi.notify(module_name, message);

		message_hex = [ 0x1A, 0x35, 0x00 ];
		message_hex = message_hex.concat(this.text_prepare(message));

		bus.data.send({
			src : 'CCM',
			msg : message_hex,
		});

		// Clear the message after 5 seconds
		if (timeout !== 0) setTimeout(this.text_urgent_off, timeout);
	}

	// Check control warnings
	text_warning(message, timeout = 10000) {
		if (config.intf.ibus.enabled !== true) return;

		log.module('Sending warning IKE text message: \'' + message + '\'');

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
		// 0x13 : arrow: flash, sound: 1 gong,  low
		// 0x18 : arrow: none,  sound: 3 beeps

		message_hex = [ 0x1A, 0x37, 0x13 ]; // flash + 1 low gong
		message_hex = message_hex.concat(this.text_prepare(message, true));

		bus.data.send({
			src : 'CCM',
			msg : message_hex,
		});

		// Clear the message after the timeout
		if (timeout !== 0) setTimeout(this.text_urgent_off, timeout);
	}

	// Trim IKE text string and potentially space-pad
	text_prepare(message, pad = false) {
		if (config.intf.ibus.enabled !== true) return;

		// Trim string to max length
		message = message.substring(0, this.max_len_text);

		// Space-pad if pad === true
		switch (pad) {
			case false : {
				// log.module('Sending non-padded IKE text message: \'' + message + '\'');
				break;
			}

			case true : {
				message = message.padEnd(this.max_len_text, ' ');
				// log.module('Sending space-padded IKE text message: \'' + message + '\'');
			}
		}

		// Convert ASCII to hex and return
		return hex.a2h(message);
	}

	// IKE cluster text send message - without space padding
	text_nopad(message, cb = null, override = false) {
		if (config.intf.ibus.enabled !== true) return;

		// Bounce if override is active
		if (override === false && this.hud_override === true) {
			log.module('NOT sending non-padded IKE text message: \'' + message + '\'');

			// Exec callback function if present
			typeof cb === 'function' && cb();
			return;
		}

		let message_hex;

		message_hex = [ 0x23, 0x42, 0x04 ];
		message_hex = message_hex.concat(this.text_prepare(message, false));

		bus.data.send({
			src : 'TEL',
			msg : message_hex,
		});

		// Exec callback function if present
		typeof cb === 'function' && cb();
	}


	// Refresh various values every 12 seconds
	data_refresh() {
		if (config.intf.ibus.enabled !== true) return;

		// Only execute if ignition is in accessory or run
		if (status.vehicle.ignition_level !== 1 && status.vehicle.ignition_level !== 3) {
			if (this.timeout_data_refresh !== null) {
				clearTimeout(this.timeout_data_refresh);
				this.timeout_data_refresh = null;

				log.module('Unset data refresh timeout');

				return;
			}
		}

		log.module('Refreshing');

		// Request fresh data
		this.request('ignition');
		// LCM.request('io-status');

		// Refresh HUD display
		this.hud_refresh(true);

		// Only request temperatures if not configured to get both from CANBUS or ignition is not in run
		if (config.canbus.coolant === false || config.canbus.exterior === false || status.vehicle.ignition_level < 3) {
			this.request('temperature');
		}

		if (status.vehicle.ignition_level === 0) return;

		if (this.timeout_data_refresh === null) log.module('Set data refresh timeout');

		// setTimeout for next update
		// TODO: Make this setTimeout delay value a config param
		let self = this;
		this.timeout_data_refresh = setTimeout(() => {
			self.data_refresh();
		}, 12000);
	}

	// Broadcast: Ignition status
	decode_ignition_status(data) {
		let new_level_name;

		// Save previous ignition status
		let previous_level = status.vehicle.ignition_level;

		// Set ignition status value
		if (update.status('vehicle.ignition_level', data.msg[1], false)) {
			// Disable/enable HUD refresh
			this.data_refresh();
		}

		switch (data.msg[1]) {
			case 0  : new_level_name = 'off';       break;
			case 1  : new_level_name = 'accessory'; break;
			case 3  : new_level_name = 'run';       break;
			case 7  : new_level_name = 'start';     break;
			default : new_level_name = 'unknown';
		}

		update.status('vehicle.ignition', new_level_name, false);

		if (data.msg[1] > previous_level) { // Ignition going up
			switch (data.msg[1]) { // Evaluate new ignition state
				case 1 : { // Accessory
					log.module('Powerup state');
					this.emit('ignition-powerup');

					bus.cmds.request_device_status(module_name, 'RAD');
					break;
				}

				case 3 : { // Run
					// If the accessory (1) ignition message wasn't caught
					if (previous_level === 0) {
						log.module('Powerup state');
						this.emit('ignition-powerup');

						bus.cmds.request_device_status(module_name, 'RAD');
					}

					log.module('Run state');
					this.emit('ignition-run');

					// Refresh OBC data
					if (config.options.obc_refresh_on_start === true) this.obc_refresh();

					break;
				}

				case 7 : { // Start
					switch (previous_level) {
						case 0 : { // If the accessory (1) ignition message wasn't caught
							log.module('Powerup state');
							this.emit('ignition-powerup');

							bus.cmds.request_device_status(module_name, 'RAD');
							break;
						}

						case 3 : { // If the run (3) ignition message wasn't caught
							log.module('Run state');
							this.emit('ignition-run');

							// Refresh OBC data
							if (config.options.obc_refresh_on_start === true) this.obc_refresh();
							break;
						}

						default : {
							log.module('Start-begin state');
							this.emit('ignition-start-begin');
						}
					}
				}
			}
		}
		else if (data.msg[1] < previous_level) { // Ignition going down
			switch (data.msg[1]) { // Evaluate new ignition state
				case 0 : { // Off
					// If the accessory (1) ignition message wasn't caught
					if (previous_level === 3) {
						log.module('Powerdown state');
						this.emit('ignition-powerdown');
					}

					log.module('Poweroff state');
					this.emit('ignition-poweroff');

					break;
				}

				case 1 : { // Accessory
					log.module('Powerdown state');
					this.emit('ignition-powerdown');

					break;
				}

				case 3 : { // Run
					log.module('Start-end state');
					this.emit('ignition-start-end');

					// Set OBC clock
					this.obc_clock();
				}
			}
		}

		data.command = 'bro';
		data.value   = 'ignition: ' + status.vehicle.ignition;

		return data;
	}

	// Broadcast: IKE sensor status
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

		update.status('vehicle.handbrake', bitmask.test(data.msg[1], bitmask.bit[0]), false);

		// If the engine is newly running
		let engine_running = bitmask.test(data.msg[2], bitmask.bit[0]);
		if (update.status('engine.running', engine_running, false) && engine_running === true) {
			this.emit('engine-running');
			update.status('engine.start_time_last', Date.now(), false);
		}

		// If the vehicle is newly in reverse, show IKE message if configured to do so
		if (update.status('vehicle.reverse', bitmask.test(data.msg[2], bitmask.bit[4]), false)) {
			if (config.options.message_reverse === true) {
				if (status.vehicle.reverse === true) this.text_override('you\'re in reverse..');
			}
		}

		return data;
	}

	init_listeners() {
		if (config.intf.ibus.enabled !== true) return;

		// Bring up last HUD refresh time
		update.status('hud.refresh_last', now());

		// Refresh data on interface connection
		socket.on('recv-host-connect', (data) => {
			// Show warning message in cluster if app running for longer than 30 seconds
			if (now() > 30000) {
				this.text_urgent('    ' + data.intf + ' restart    ');
			}

			// Only refresh on new IBUS interface connection
			if (data.intf !== 'ibus') return;

			// Clear existing timeout if exists
			if (this.timeout_accept_refresh !== null) {
				clearTimeout(this.timeout_accept_refresh);
				this.timeout_accept_refresh = null;
			}

			this.timeout_accept_refresh = setTimeout(() => {
				switch (config.options.obc_refresh_on_start) {
					case false : this.request('ignition'); break;
					case true  : this.obc_refresh();
				}
			}, 250);
		});


		// Refresh data on GM keyfob unlock event
		GM.on('keyfob', (keyfob) => {
			switch (keyfob.button) {
				case 'unlock' : this.data_refresh();
			}
		});

		// Refresh HUD after certain data values update
		update.on('status.dme.voltage',             () => { this.hud_refresh(); });
		update.on('status.lcm.voltage.terminal_30', () => { this.hud_refresh(); });
		// update.on('status.obc.consumption.c1.mpg',  () => { this.hud_refresh(); });
		// update.on('status.obc.range.mi',            () => { this.hud_refresh(); });
		update.on('status.system.temperature',      () => { this.hud_refresh(); });
		update.on('status.temperature.coolant.c',   () => { this.hud_refresh(); });
		update.on('status.temperature.exhaust.c',   () => { this.hud_refresh(); });
		update.on('status.temperature.intake.c',    () => { this.hud_refresh(); });
		update.on('status.temperature.oil.c',       () => { this.hud_refresh(); });
		// update.on('status.vehicle.clutch_count',    () => { this.hud_refresh(); });
		// update.on('status.vehicle.speed.mph',       () => { this.hud_refresh(); });

		// DSC off CC message
		update.on('status.vehicle.dsc.active', (value) => {
			switch (value.new) {
				case false : {
					// Don't send CC message if engine is not running or was started in the last 15 seconds
					if (status.engine.running === false)                      break;
					if ((Date.now() - status.engine.start_time_last) < 15000) break;

					this.text_warning('  DSC deactivated!  ');
					break;
				}
			}
		});

		log.msg('Initialized listeners');
	}

	// Refresh OBC data
	obc_refresh() {
		if (config.intf.ibus.enabled !== true) return;

		this.emit('obc-refresh');

		log.module('Refreshing all OBC data');

		// Immo+GM data
		EWS.request('immobilizerstatus');
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
		switch (data.msg[0]) {
			case 0x07 : return this.decode_gong_status(data);
			case 0x11 : return this.decode_ignition_status(data);
			case 0x13 : return this.decode_sensor_status(data);
			case 0x15 : return this.decode_country_coding_data(data);
			case 0x17 : return this.decode_odometer(data);
			case 0x18 : return this.decode_speed_values(data);
			case 0x19 : return this.decode_temperature_values(data);
			case 0x24 : return this.decode_obc_text(data);
			case 0x2A : return this.decode_aux_heat_led(data);
			case 0x57 : return this.decode_bc_button(data);
		}

		return data;
	}


	// Request various things from IKE
	request(value) {
		if (config.intf.ibus.enabled !== true) return;

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
				log.module('Requesting \'' + value + '\'');

				for (loop_dst in bus.modules.modules) {
					switch (loop_dst) {
						case 'DIA' : break;
						case 'GLO' : break;
						case 'LOC' : break;
						case src   : break;

						default : bus.cmds.request_device_status('IKE', loop_dst);
					}
				}

				return;
			}

			case 'status-short' : {
				log.module('Requesting \'' + value + '\'');

				bus.modules.modules_check.forEach((loop_dst) => {
					src = module_name;

					switch (loop_dst) {
						case 'DIA' : break;
						case 'GLO' : break;
						case 'LOC' : break;
						case src   : break;

						default : bus.cmds.request_device_status('IKE', loop_dst);
					}
				});

				return;
			}

			default : return;
		}

		log.module('Requesting \'' + value + '\'');

		bus.data.send({
			src : src,
			dst : dst,
			msg : cmd,
		});
	}

	// IKE cluster text send message
	text(message, cb = null, override = false) {
		if (config.intf.ibus.enabled !== true) return;

		// Bounce if override is active
		if (override === false && this.hud_override === true) {
			log.module('NOT sending space-padded IKE text message: \'' + message + '\'');

			// Exec callback function if present
			typeof cb === 'function' && cb();
			return;
		}

		let message_hex;

		// message_hex = [ 0x23, 0x42, 0x30 ];
		message_hex = [ 0x23, 0x41, 0x30, 0x07 ];

		message_hex = message_hex.concat(this.text_prepare(message));

		message_hex = message_hex.concat(0x04);
		// message_hex = message_hex.concat(0x66);

		bus.data.send({
			src : 'RAD',
			dst : 'IKE',
			msg : message_hex,
		});

		// Exec callback function if present
		typeof cb === 'function' && cb();
	}

	// IKE cluster text send message, override other messages
	text_override(message, timeout = 2500, direction = 'left', turn = false) {
		if (config.intf.ibus.enabled !== true) return;

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
			if (this.hud_override_text === message) {
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

		this.text_override('node-bmw | Host:' + os.hostname().split('.')[0] + ' | Mem:' + Math.floor((os.freemem() / os.totalmem()) * 101) + '% | Up:' + parseFloat(os.uptime() / 3600).toFixed(2) + ' hrs');
	}
}

module.exports = IKE;
