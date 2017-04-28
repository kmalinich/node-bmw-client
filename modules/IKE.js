var module_name = __filename.slice(__dirname.length + 1, -3);

var pitemp = require('pi-temperature');

// ASCII to hex for cluster message
function ascii2hex(str) {
	var array = [];
	for (var n = 0, l = str.length; n < l; n ++) {
		var hex = str.charCodeAt(n);
		array.push(hex);
	}
	return array;
}

// Cluster/interior backlight
function backlight(value) {
	console.log('[node::IKE] Setting LCD screen backlight to %s', value);
	bus_client.data_send({
		src: 'LCM',
		dst: 'GLO',
		msg: [0x5C, value.toString(16), 0x00]
	});
}

// Pretend to be IKE saying the car is on
// Note - this can and WILL set the alarm off - kudos to the Germans...
function ignition(value) {
	console.log('[node::IKE] Claiming ignition is \'%s\'', value);

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
			break;
	}

	bus_client.data_send({
		src: 'IKE',
		dst: 'GLO',
		msg: [0x11, status],
	});
}

// OBC set clock
function obc_clock() {
	console.log('[node::IKE] Setting OBC clock to current time');

	var time = moment();

	// Time
	bus_client.data_send({
		src: 'GT',
		dst: 'IKE',
		msg: [0x40, 0x01, time.format('H'), time.format('m')],
	});

	// Date
	bus_client.data_send({
		src: 'GT',
		dst: 'IKE',
		msg: [0x40, 0x02, time.format('D'), time.format('M'), time.format('YY')],
	});
}

// OBC data request
function obc_data(action, value, target) {
	var cmd = 0x41; // OBC data request

	// Init action_id, value_id
	var action_id;
	var value_id;

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

	// Determine value_id from value argument
	switch (value) {
		case 'arrival'       : value_id = 0x08; break;
		case 'auxheat1'      : value_id = 0x0F; break;
		case 'auxheat2'      : value_id = 0x10; break;
		case 'auxheatvent'   : value_id = 0x1B; break;
		case 'code'          : value_id = 0x0D; break;
		case 'cons1'         : value_id = 0x04; break;
		case 'cons2'         : value_id = 0x05; break;
		case 'date'          : value_id = 0x02; break;
		case 'distance'      : value_id = 0x07; break;
		case 'range'         : value_id = 0x06; break;
		case 'speedavg'      : value_id = 0x0A; break;
		case 'speedlimit'    : value_id = 0x09; break;
		case 'stopwatch'     : value_id = 0x1A; break;
		case 'temp_exterior' : value_id = 0x03; break;
		case 'time'          : value_id = 0x01; break;
		case 'timer'         : value_id = 0x0E; break;
	}

	// Assemble message string
	var msg = [cmd, value_id, action_id];

	// If we're setting, insert the data
	if (typeof target !== 'undefined' && target) {
		msg = [msg, target];
	}

	// console.log('[node::IKE] Performing \'%s\' on OBC value \'%s\'', action, value);

	bus_client.data_send({
		src: 'GT',
		dst: 'IKE',
		msg: msg,
	});
}

// Clear check control messages, then refresh HUD
function text_urgent_off() {
	bus_client.data_send({
		src: 'CCM',
		dst: 'IKE',
		msg: [0x1A, 0x30, 0x00],
	});
	IKE.hud_refresh();
}

function decode_ignition_status(data) {
	// Below is a s**t hack workaround while I contemplate firing actual events

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
				log.msg({
					src : 'IKE',
					msg : 'Powerup state',
				});
				IKE.state_powerup = true;
				break;
			case 3: // Run
				if (status.vehicle.ignition_level === 0) {
					log.msg({
						src : 'IKE',
						msg : 'Powerup state',
					});
					IKE.state_powerup = true;
				}

				log.msg({
					src : 'IKE',
					msg : 'Run state',
				});
				IKE.state_run = true;
				break;
			case 7: // Start
				if (status.vehicle.ignition_level === 0) {
					log.msg({
						src : 'IKE',
						msg : 'Powerup state',
					});
					IKE.state_powerup = true;
				}

				log.msg({
					src : 'IKE',
					msg : 'Start-begin state',
				});
				IKE.state_start_begin = true;
		}
	}

	// Ignition going down
	else if (data.msg[1] < status.vehicle.ignition_level) {
		switch (data.msg[1]) { // Evaluate new ignition state
			case 0: // Off
				if (status.vehicle.ignition_level === 3) {
					log.msg({
						src : 'IKE',
						msg : 'Powerdown state',
					});
					IKE.state_powerdown = true;
				}

				log.msg({
					src : 'IKE',
					msg : 'Poweroff state',
				});
				IKE.state_poweroff = true;
				break;
			case 1: // Accessory
				log.msg({
					src : 'IKE',
					msg : 'Powerdown state',
				});
				IKE.state_powerdown = true;
				break;
			case 3: // Run
				log.msg({
					src : 'IKE',
					msg : 'Start-end state',
				});
				IKE.state_start_end = true;
		}
	}

	// Set ignition status value
	if (status.vehicle.ignition_level != data.msg[1]) {
		log.msg({
			src : 'IKE',
			msg : 'Ignition level change \''+status.vehicle.ignition_level+'\' => \''+data.msg[1]+'\'',
		});
		status.vehicle.ignition_level = data.msg[1];
	}

	// Activate autolights if we got 'em
	LCM.auto_lights_check();

	switch (data.msg[1]) {
		case 0  : status.vehicle.ignition = 'off';       break;
		case 1  : status.vehicle.ignition = 'accessory'; break;
		case 3  : status.vehicle.ignition = 'run';       break;
		case 7  : status.vehicle.ignition = 'start';     break;
		default : status.vehicle.ignition = 'unknown';   break;
	}

	// Ignition changed to off
	if (IKE.state_poweroff === true) {
		// Disable HUD refresh
		clearInterval(IKE.interval_data_refresh, () => {
			log.msg({
				src : 'IKE',
				msg : 'Cleared data refresh interval',
			});
		});

		// Disable BMBT/MID keepalive
		BMBT.status_loop(false);
		MID.status_loop(false);

		// Toggle media playback
		kodi.command('pause');
		BT.command('disconnect');

		// Set modules as not ready
		json.modules_reset();

		// Turn off HDMI display after 2 seconds
		setTimeout(() => {
			HDMI.command('poweroff');
		}, 2000);

		json.write(); // Write JSON config and status files
	}

	// Ignition changed to accessory, from off
	if (IKE.state_powerup === true) {
		IKE.state_powerup = false;

		// Enable BMBT/MID keepalive
		BMBT.status_loop(true);
		MID.status_loop(true);
		RAD.send_audio_control('tuner/tape');

		// Toggle media playback
		kodi.command('pause');
		BT.command('connect');

		// Welcome message
		// IKE.text_override('node-bmw | Host:'+os.hostname()+' | Mem:'+Math.round((os.freemem()/os.totalmem())*101)+'% | Up:'+parseFloat(os.uptime()/3600).toFixed(2)+' hrs');
		IKE.text_override('RESTART! RESTART! RESTART!');

		// Refresh OBC data
		IKE.obc_refresh();

		// Refresh OBC HUD once every 5 seconds, by requesting current temperatures
		IKE.interval_data_refresh = setInterval(() => {
			// Get+save RPi temp
			pitemp.measure((temperature) => {
				status.pi.temperature = parseFloat(temperature.toFixed(0));
			});
			IKE.request('temperature');
		}, 5000);
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
		json.write(); // Write JSON config and status files
	}
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

	if (status.vehicle.handbrake != bitmask.bit_test(data.msg[1], bitmask.bit[0])) {
		status.vehicle.handbrake = bitmask.bit_test(data.msg[1], bitmask.bit[0]);
	}

	if (status.engine.running != bitmask.bit_test(data.msg[2], bitmask.bit[0])) {
		status.engine.running = bitmask.bit_test(data.msg[2], bitmask.bit[0]);
		// If the engine is newly running, power up HDMI display
		if (status.engine.running === true) {
			HDMI.command('poweron');
		}
	}

	if (status.vehicle.reverse != bitmask.bit_test(data.msg[2], bitmask.bit[4])) {
		status.vehicle.reverse = bitmask.bit_test(data.msg[2], bitmask.bit[4]);
		// If the vehicle is newly in reverse, send message
		if (status.vehicle.reverse === true) {
			IKE.text_override('you\'re in reverse..');
		}
	}
}

function decode_odometer(data) {
	var odometer_value1 = data.msg[3] << 16;
	var odometer_value2 = data.msg[2] << 8;
	var odometer_value  = odometer_value1 + odometer_value2 + data.msg[1];

	status.vehicle.odometer.km = odometer_value;
	status.vehicle.odometer.mi = Math.round(convert(odometer_value).from('kilometre').to('us mile'));
}

function decode_speed_values(data) {
	// Update vehicle and engine speed variables
	status.vehicle.speed.kmh = parseFloat(data.msg[1]*2);
	status.engine.speed      = parseFloat(data.msg[2]*100);

	// Convert values and round to 2 decimals
	status.vehicle.speed.mph = parseFloat(convert(parseFloat((data.msg[1]*2))).from('kilometre').to('us mile').toFixed(2));
}

function decode_temperature_values(data) {
	// Update external and engine coolant temp variables
	status.temperature.exterior.c = parseFloat(data.msg[1]);
	status.temperature.coolant.c  = parseFloat(data.msg[2]);

	status.temperature.exterior.f = Math.round(convert(parseFloat(data.msg[1])).from('celsius').to('fahrenheit'));
	status.temperature.coolant.f  = Math.round(convert(parseFloat(data.msg[2])).from('celsius').to('fahrenheit'));

	// Trigger a HUD refresh
	IKE.hud_refresh();
}

function decode_aux_heat_led(data) {
	// This actually is a bitmask but.. this is also a freetime project
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


// Exported functions
module.exports = {
	// Parse data sent from IKE module
	parse_out : (data) => {
		// Init variables
		switch (data.msg[0]) {
			case 0x07: // Gong status
				data.command = 'bro';
				data.value   = 'gong status '+data.msg;
				break;

			case 0x11: // Broadcast: Ignition status
				decode_ignition_status(data);
				data.command = 'bro';
				data.value   = 'ignition status : '+status.vehicle.ignition;
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

			case 0x24: // OBC values broadcast
				switch (data.msg[1]) {
					case 0x01: // Time
						// Parse unit
						string_time_unit = Buffer.from([data.msg[8], data.msg[9]]);
						string_time_unit = string_time_unit.toString().trim().toLowerCase();

						// Detect 12h or 24h time and parse value
						if (string_time_unit === 'am' || string_time_unit === 'pm') {
							status.coding.unit.time = '12h';
							string_time = Buffer.from([data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7], data.msg[8], data.msg[9]]);
						}
						else {
							status.coding.unit.time = '24h';
							string_time = Buffer.from([data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7]]);
						}

						string_time = string_time.toString().trim().toLowerCase();

						// Update status variables
						status.obc.time = string_time;
						data.command    = 'OBC time';
						data.value      = status.obc.time;
						break;

					case 0x02: // Date
						// Parse value
						string_date = Buffer.from([data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7], data.msg[8], data.msg[9], data.msg[10], data.msg[11], data.msg[12]]);
						string_date = string_date.toString().trim();

						// Update status variables
						status.obc.date = string_date;
						data.command    = 'OBC date';
						data.value      = status.obc.date;
						break;

					case 0x03: // Exterior temp
						// Parse unit
						string_temp_exterior_unit = Buffer.from([data.msg[9]]);
						string_temp_exterior_unit = string_temp_exterior_unit.toString().trim().toLowerCase();

						// Parse if it is +/-
						string_temp_exterior_negative = Buffer.from([data.msg[9]]);
						string_temp_exterior_negative = string_temp_exterior_negative.toString().trim().toLowerCase();

						// Parse value
						if (string_temp_exterior_negative === '-') {
							string_temp_exterior_value = Buffer.from(data.msg[3], [data.msg[4], data.msg[5], data.msg[6], data.msg[7]]);
							string_temp_exterior_value = string_temp_exterior_value.toString().trim().toLowerCase();
						}
						else {
							string_temp_exterior_value = Buffer.from([data.msg[4], data.msg[5], data.msg[6], data.msg[7]]);
							string_temp_exterior_value = string_temp_exterior_value.toString().trim().toLowerCase();
						}

						// Update status variables
						switch (string_temp_exterior_unit) {
							case 'c':
								status.coding.unit.temp           = 'c';
								status.temperature.exterior.obc.c = parseFloat(string_temp_exterior_value);
								status.temperature.exterior.obc.f = parseFloat(convert(parseFloat(string_temp_exterior_value)).from('celsius').to('fahrenheit'));
								break;
							case 'f':
								status.coding.unit.temp           = 'f';
								status.temperature.exterior.obc.c = parseFloat(convert(parseFloat(string_temp_exterior_value)).from('fahrenheit').to('celsius'));
								status.temperature.exterior.obc.f = parseFloat(string_temp_exterior_value);
								break;
						}

						data.command = 'OBC exterior temperature';
						data.value   = status.temperature.exterior.obc.c;
						break;

					case 0x04: // Consumption 1
						// Parse unit
						string_consumption_1_unit = Buffer.from([data.msg[8]]);
						string_consumption_1_unit = string_consumption_1_unit.toString().trim().toLowerCase();

						// Parse value
						string_consumption_1 = Buffer.from([data.msg[3], data.msg[4], data.msg[5], data.msg[6]]);
						string_consumption_1 = parseFloat(string_consumption_1.toString().trim().toLowerCase());

						// Perform appropriate conversions between units
						switch (string_consumption_1_unit) {
							case 'm':
								status.coding.unit.cons = 'mpg';
								consumption_mpg         = string_consumption_1;
								consumption_l100        = 235.21/string_consumption_1;
								break;

							default:
								status.coding.unit.cons = 'l100';
								consumption_mpg         = 235.21/string_consumption_1;
								consumption_l100        = string_consumption_1;
								break;
						}

						// Update status variables
						status.obc.consumption.c1.mpg  = parseFloat(consumption_mpg.toFixed(2));
						status.obc.consumption.c1.l100 = parseFloat(consumption_l100.toFixed(2));

						data.command = 'OBC consumption 1';
						data.value   = status.obc.consumption.c1.mpg;
						break;

					case 0x05: // Consumption 2
						// Parse unit
						string_consumption_2_unit = Buffer.from([data.msg[8]]);
						string_consumption_2_unit = string_consumption_2_unit.toString().trim().toLowerCase();

						// Parse value
						string_consumption_2 = Buffer.from([data.msg[3], data.msg[4], data.msg[5], data.msg[6]]);
						string_consumption_2 = parseFloat(string_consumption_2.toString().trim().toLowerCase());

						// Perform appropriate conversions between units and round to 2 decimals
						if (string_consumption_2_unit === 'm') {
							consumption_mpg  = string_consumption_2;
							consumption_l100 = 235.215/string_consumption_2;
						}
						else {
							consumption_mpg  = 235.215/string_consumption_2;
							consumption_l100 = string_consumption_2;
						}

						// Update status variables
						status.obc.consumption.c2.mpg  = parseFloat(consumption_mpg.toFixed(2));
						status.obc.consumption.c2.l100 = parseFloat(consumption_l100.toFixed(2));

						data.command = 'OBC consumption 2';
						data.value   = status.obc.consumption.c2.mpg;
						break;

					case 0x06: // Range
						// Parse value
						string_range = Buffer.from([data.msg[3], data.msg[4], data.msg[5], data.msg[6]]);
						string_range = string_range.toString().trim();

						string_range_unit = Buffer.from([data.msg[7], data.msg[8]]);
						string_range_unit = string_range_unit.toString().trim().toLowerCase();

						// Update status variables
						switch (string_range_unit) {
							case 'ml':
								status.coding.unit.distance = 'mi';
								status.obc.range.mi = parseFloat(string_range);
								status.obc.range.km = parseFloat(convert(parseFloat(string_range)).from('kilometre').to('us mile').toFixed(2));
								break;

							case 'km':
								status.coding.unit.distance = 'km';
								status.obc.range.mi = parseFloat(convert(parseFloat(string_range)).from('us mile').to('kilometre').toFixed(2));
								status.obc.range.km = parseFloat(string_range);
								break;
						}

						data.command = 'OBC range to empty';
						data.value   = status.obc.range.mi;
						break;

					case 0x07: // Distance
						// Parse value
						string_distance = Buffer.from([data.msg[3], data.msg[4], data.msg[5], data.msg[6]]);
						string_distance = string_distance.toString().trim().toLowerCase();

						// Update status variables
						status.obc.distance = parseFloat(string_distance);
						data.command        = 'OBC distance remaining';
						data.value          = status.obc.distance;
						break;

					case 0x08: // Arrival time
						data.command = 'OBC arrival time';
						// Parse value
						string_arrival = Buffer.from([data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7], data.msg[8], data.msg[9]]);
						string_arrival = string_arrival.toString().trim().toLowerCase();

						// Update status variables
						status.obc.arrival = string_arrival;
						value              = status.obc.arrival;
						break;

					case 0x09: // Limit
						// Parse value
						string_speedlimit = Buffer.from([data.msg[3], data.msg[4], data.msg[5]]);
						string_speedlimit = parseFloat(string_speedlimit.toString().trim().toLowerCase());

						// Update status variables
						status.obc.speedlimit = parseFloat(string_speedlimit.toFixed(2));
						data.command          = 'OBC speed limit';
						data.value            = status.obc.speedlimit;
						break;

					case 0x0A: // average speed
						// Parse unit
						string_speedavg_unit = Buffer.from([data.msg[8]]);
						string_speedavg_unit = string_speedavg_unit.toString().trim().toLowerCase();

						// Parse value
						string_speedavg = Buffer.from([data.msg[3], data.msg[4], data.msg[5], data.msg[6]]);
						string_speedavg = parseFloat(string_speedavg.toString().trim().toLowerCase());

						// Convert values appropriately based on coding valueunits
						switch (string_speedavg_unit) {
							case 'k':
								status.coding.unit.speed = 'kmh';
								// Update status variables
								status.obc.speedavg.kmh = parseFloat(string_speedavg.toFixed(2));
								status.obc.speedavg.mph = parseFloat(convert(string_speedavg).from('kilometre').to('us mile').toFixed(2));
								break;

							case 'm':
								status.coding.unit.speed = 'mph';
								// Update status variables
								status.obc.speedavg.kmh = parseFloat(convert(string_speedavg).from('us mile').to('kilometre').toFixed(2));
								status.obc.speedavg.mph = parseFloat(string_speedavg.toFixed(2));
								break;
						}

						data.command = 'OBC average speed';
						data.value   = status.obc.speedavg.mph;
						break;

					case 0x0B: //
						data.command = 'OBC 0x0B';
						data.value   = Buffer.from(data.msg);
						break;

					case 0x0C: //
						data.command = 'OBC 0x0C';
						data.value   = Buffer.from(data.msg);
						break;

					case 0x0D: //
						// Parse value
						string_code = Buffer.from([data.msg[3], data.msg[4], data.msg[5], data.msg[6]]);
						string_code = string_code.toString().trim().toLowerCase();

						// Update status variable
						status.obc.code = string_code;
						data.command    = 'OBC code';
						data.value      = status.obc.code;
						break;

					case 0x0E: // Timer
						// Parse value
						string_timer = Buffer.from([data.msg[3], data.msg[4], data.msg[5], data.msg[6]]);
						string_timer = parseFloat(string_timer.toString().trim().toLowerCase()).toFixed(2);

						// Update status variables
						status.obc.timer = string_timer;
						data.command     = 'OBC timer';
						data.value       = status.obc.timer;
						break;

					case 0x0F: // Aux heat timer 1
						// Parse value
						string_aux_heat_timer_1 = Buffer.from([data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7], data.msg[8], data.msg[9]]);
						string_aux_heat_timer_1 = string_aux_heat_timer_1.toString().trim().toLowerCase();

						// Update status variables
						status.obc.aux_heat_timer.t1 = string_aux_heat_timer_1;
						data.command                 = 'OBC aux heat timer 1';
						data.value                   = status.obc.aux_heat_timer.t1;
						break;

					case 0x10: // Aux heat timer 2
						// Parse value
						string_aux_heat_timer_2 = Buffer.from([data.msg[3], data.msg[4], data.msg[5], data.msg[6], data.msg[7], data.msg[8], data.msg[9]]);
						string_aux_heat_timer_2 = string_aux_heat_timer_2.toString().trim().toLowerCase();

						// Update status variables
						status.obc.aux_heat_timer.t2 = string_aux_heat_timer_2;
						data.command                 = 'OBC aux heat timer 2';
						data.value                   = status.obc.aux_heat_timer.t2;
						break;

					case 0x1A: // Stopwatch
						// Parse value
						string_stopwatch = Buffer.from([data.msg[3], data.msg[4], data.msg[5], data.msg[6]]);
						string_stopwatch = parseFloat(string_stopwatch.toString().trim().toLowerCase()).toFixed(2);

						// Update status variables
						status.obc.stopwatch = parseFloat(string_stopwatch);
						data.command         = 'OBC stopwatch';
						data.value           = status.obc.stopwatch;
						break;

					default:
						data.command = 'bro';
						data.value   = 'OBC unknown value : '+Buffer.from(data.msg);
				}
				break;

			case 0x2A: // aux heating LED
				data.command = 'bro';
				data.value   = 'aux heating LED : '+status.obc.aux_heat_led;
				decode_aux_heat_led(data);
				break;

			case 0x57: // BC button in cluster
				data.command = 'bro';
				data.value   = 'BC button';
				break;

			default:
				data.command = 'unk';
				data.value   = Buffer.from(data.msg);
				break;
		}

		log.bus(data);
	},

	// Handle incoming commands from API
	// This is pure garbage and COMPLETELY needs to be done way differently
	api_command : (data) => {
		switch (data.command) {
			case 'ike-backlight': // Set IKE backlight
				backlight(data.value);
				break;
			case 'ike-ignition': // Send fake ignition status (but don't tho - you've been warned)
				ignition(data.value);
				break;
			case 'ike-text': // Display text string in cluster
				IKE.text(data.value);
				break;
			case 'obc-clock': // Set OBC clock
				obc_clock();
				break;
			case 'obc-gong': // Fire OBC gong
				obc_gong(data.value);
				break;
			case 'obc-get-all': // Refresh all OBC data value
				IKE.obc_refresh();
				break;
			case 'obc-get': // Refresh specific OBC data value
				obc_data('get', data.value);
				break;
			case 'obc-reset': // Reset specific OBC data value
				obc_data('reset', data.value);
				break;
			default: // Dunno.
				console.log('[node::IKE] api_command(): Unknown command \'%s\', \'%s\'', data.command, data.value);
		}
	},

	// Refresh custom HUD
	hud_refresh : (interval = false) => {
		var time_now = now();

		// Bounce if the override is active
		if(IKE.hud_override === true) {
			log.msg({
				src : module_name,
				msg : 'HUD refresh: override active',
			});
			return;
		}

		// Bounce if the last update was less than 3 sec ago
		if (time_now-IKE.last_hud_refresh <= 3000) {
			log.msg({
				src : module_name,
				msg : 'HUD refresh: too soon ('+(time_now-IKE.last_hud_refresh).toFixed(0)+' ms)',
			});
			return;
		}

		var spacing1;
		var spacing2;
		var string_cons;
		var string_temp;
		var string_time = moment().format('HH:mm');

		// Populate values if missing
		if (status.obc.consumption_1_mpg === null) {
			obc_data('get', 'cons1');
			string_cons = '     ';
		}
		else {
			string_cons = parseFloat(status.obc.consumption_1_mpg).toFixed(1)+'m';
		}

		if (status.temperature.coolant.c === null) {
			IKE.request('temperature');
			string_temp = '  ';
		}
		else {
			string_temp = Math.round(status.temperature.coolant.c)+'¨';
		}

		// Format the output (ghetto-ly)
		switch (string_temp.length) {
			case 4:
				spacing2 = '   ';
				break;
			case 3:
				string_temp = ' '+string_temp;
				spacing2 = '   ';
				break;
			case 2:
				string_temp = ' '+string_temp;
				spacing2 = '    ';
				break;
		}

		// 1m sysload to percentage
		var load_1m = (parseFloat((os.loadavg()[0]/os.cpus().length).toFixed(2))*100).toFixed(0);
		var load_1m = status.pi.temperature+'¨|'+load_1m+'%';

		// Format the output
		var load_1m = pad(load_1m, 8);

		// Add space to left-most string (consumption 1)
		if (string_cons.length === 4) {
			string_cons = '0'+string_cons;
		}

		if (status.vehicle.ignition_level < 1) {
			log.msg({
				src : module_name,
				msg : 'HUD refresh: ignition level '+status.vehicle.ignition_level+' is less than 1 ('+(time_now-IKE.last_hud_refresh)+' ms)',
			});
			return;
		}
		else {
			var hud_string = load_1m+string_temp+spacing2+string_time;
			IKE.text(hud_string, () => {
				IKE.last_hud_refresh = now();
			});
		}
	},

	// Refresh OBC data
	obc_refresh : () => {
		log.msg({
			src : 'IKE',
			msg : 'Refreshing all OBC data',
		});

		// LCM data
		LCM.request('vehicledata');
		LCM.request('light-status');
		LCM.request('dimmer');
		LCM.request('io-status');

		// Immo+GM data
		EWS.request('immobiliserstatus');
		// GM.request('io-status');
		GM.request('door-status');

		// IKE data
		IKE.request('coding'     );
		IKE.request('ignition'   );
		IKE.request('odometer'   );
		IKE.request('sensor'     );
		IKE.request('temperature');
		IKE.request('vin'        );

		// OBC data
		obc_data('get', 'arrival'      );
		obc_data('get', 'auxheat1'     );
		obc_data('get', 'auxheat2'     );
		obc_data('get', 'auxheatvent'  );
		obc_data('get', 'code'         );
		obc_data('get', 'cons1'        );
		obc_data('get', 'cons2'        );
		obc_data('get', 'date'         );
		obc_data('get', 'distance'     );
		obc_data('get', 'range'        );
		obc_data('get', 'speedavg'     );
		obc_data('get', 'speedlimit'   );
		obc_data('get', 'stopwatch'    );
		obc_data('get', 'temp_exterior');
		obc_data('get', 'time'         );
		obc_data('get', 'timer'        );

		// Blow it out
		// IKE.request('status-glo');
	},

	// Request various things from IKE
	request : (value) => {
		var cmd = null;
		var src = 'VID';
		var dst = 'IKE';
		switch (value) {
			case 'ignition':
				cmd = [0x10];
				break;
			case 'sensor':
				cmd = [0x12];
				break;
			case 'coding':
				src = 'RAD';
				cmd = [0x14];
				break;
			case 'odometer':
				src = 'EWS';
				cmd = [0x16];
				break;
			case 'dimmer':
				src = 'IHKA';
				cmd = [0x1D, 0xC5];
				break;
			case 'temperature':
				src = 'LCM';
				cmd = [0x1D, 0xC5];
				break;
			case 'status-glo':
				src = 'IKE';
				for (var dst in bus_modules.modules) {
					if (dst != 'DIA' && dst != 'GLO' && dst != 'LOC') {
						bus_client.data_send({
							src: src,
							dst: dst,
							msg: [0x01],
						});
					}
				}
				break;
			case 'status-loc':
				src = 'IKE';
				for (var dst in bus_modules.modules) {
					if (dst != 'DIA' && dst != 'GLO' && dst != 'LOC') {
						bus_client.data_send({
							src: src,
							dst: dst,
							msg: [0x01],
						});
					}
				}
				break;
			case 'vin':
				src = 'IKE';
				dst = 'LCM';
				cmd = [0x53];
				break;
		}

		if (cmd !== null) {
			bus_client.data_send({
				src: src,
				dst: dst,
				msg: cmd,
			});
		}
	},

	// Check control warnings
	text_warning : (message, timeout = 10000) => {
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

		var message_hex = [0x1A, 0x37, 0x03]; // no gong, flash arrow
		var message_hex = message_hex.concat(ascii2hex(pad(message, 20)));

		bus_client.data_send({
			src : 'CCM',
			dst : 'IKE',
			msg : message_hex,
		});

		// Clear the message after the timeout
		setTimeout(() => {
			text_urgent_off();
		}, timeout);
	},

	// Check control messages
	text_urgent : (message, timeout = 5000) => {
		var message_hex = [0x1A, 0x35, 0x00];
		var message_hex = message_hex.concat(ascii2hex(pad(message, 20)));

		bus_client.data_send({
			src : 'CCM',
			dst : 'IKE',
			msg : message_hex,
		});

		// Clear the message after 5 seconds
		setTimeout(() => {
			text_urgent_off();
		}, timeout);
	},

	// IKE cluster text send message, override other messages
	text_override : (message, timeout = 2500) => {
		var max_length   = 20;
		var scroll_delay = 300;

		// Delare that we're currently first up
		IKE.hud_override      = true;
		IKE.hud_override_text = message;

		// Equal to or less than 20 char
		if (message.length-max_length <= 0) {
			if (IKE.hud_override_text == message) {
				IKE.text(message);
			}
		}
		else {
			// Adjust timeout since we will be scrolling
			timeout = timeout+(scroll_delay*5)+(scroll_delay*(message.length-max_length));

			// Send initial string if we're currently the first up
			if (IKE.hud_override_text == message) {
				IKE.text(message);
			}

			// Add a time buffer before scrolling starts
			setTimeout(() => {
				for (var scroll = 0; scroll <= message.length-max_length ; scroll++) {
					setTimeout((current_scroll, message_full) => {
						// Only send the message if we're currently the first up
						if (IKE.hud_override_text == message_full) {
							IKE.text(message.substring(current_scroll, current_scroll+max_length));
						}
					}, scroll_delay*scroll, scroll, message);
				}
			}, (scroll_delay*5));
		}

		// Clear the override flag
		setTimeout((message_full) => {
			// Only deactivate the override if we're currently first up
			if (IKE.hud_override_text == message_full) {
				IKE.hud_override = false;
				IKE.hud_refresh();
			}
		}, timeout, message);
	},

	// IKE cluster text send message
	text : (message) => {
		var max_length = 20;

		var message_hex = [0x23, 0x50, 0x30, 0x07];
		// Trim string to max length
		var message_hex = message_hex.concat(ascii2hex(pad(message.substring(0, max_length), 20)));
		var message_hex = message_hex.concat(0x04);

		bus_client.data_send({
			src: 'RAD',
			dst: 'IKE',
			msg: message_hex,
		});
	},

	// HUD refresh vars
	interval_data_refresh : null,
	last_hud_refresh      : now(),
	hud_override          : false,
	hud_override_text     : null,

	// Ignition state change vars
	state_powerdown   : null,
	state_poweroff    : null,
	state_powerup     : null,
	state_run         : null,
	state_start_begin : null,
	state_start_end   : null,
};
