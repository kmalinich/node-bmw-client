const suncalc = require('suncalc');
const now     = require('performance-now');


// Automatic lights handling
function auto_lights() {
	if (config.chassis.model !== 'e39') return;

	// Default action is true (enable/process auto lights)
	let action = true;

	// Return if auto lights are disabled in the config
	if (config.lights.auto !== true) return;

	// Action is false if ignition is not in run
	if (status.vehicle.ignition_level < 3) action = false;

	switch (action) {
		case false : {
			io_encode({});

			if (LCM.timeout.lights_auto !== null) {
				clearTimeout(LCM.timeout.lights_auto);
				LCM.timeout.lights_auto = null;
				log.module('Unset autolights timeout');
			}

			// Set status variables
			update.status('lights.auto.active',  false);
			update.status('lights.auto.lowbeam', false);
			update.status('lights.auto.reason',  null);
			break;
		}

		case true : {
			if (LCM.timeout.lights_auto === null) {
				log.module('Set autolights timeout');
			}

			// Set status variable
			update.status('lights.auto.active', true);

			auto_lights_process();
		}
	}
}

// Logic based on location and time of day, determine if the low beams should be on
function auto_lights_process() {
	if (config.chassis.model !== 'e39') return;

	// Init variables
	let new_reason;
	let new_lowbeam;
	let night_percentage;

	let now_time  = Date.now();
	let now_epoch = Math.floor(now_time / 1000);

	let now_offset  = 0;
	let now_weather = false;

	// Factor in cloud cover to lights on/off time
	if (config.weather.apikey !== null) {
		status.weather.daily.data.forEach((value) => {
			if (now_weather === true) return;

			if ((now_epoch - value.time) <= 0) {
				// Add 5 hours * current cloudCover value
				now_offset = value.cloudCover * 5 * 60 * 60 * 1000;
				now_weather = true;
			}
		});
	}

	let sun_times  = suncalc.getTimes(now_time, config.location.latitude, config.location.longitude);
	let lights_on  = new Date(sun_times.sunsetStart.getTime() - now_offset);
	let lights_off = new Date(sun_times.sunriseEnd.getTime()  + now_offset);

	// Debug logging
	// log.module('   current : \''+now_time+'\'' });
	// log.module(' lights_on : \''+lights_on+'\''    });
	// log.module('lights_off : \''+lights_off+'\''   });

	// If ignition is not in run or auto lights are disabled in config,
	// call auto_lights() to clean up
	if (status.vehicle.ignition_level < 3 || config.lights.auto !== true) {
		auto_lights();
		return;
	}

	// log.module('Processing auto lights' });

	// Check wipers
	if (status.gm.wipers.speed !== null && status.gm.wipers.speed !== 'off' && status.gm.wipers.speed !== 'spray') {
		new_reason       = 'wipers on';
		new_lowbeam      = true;
		night_percentage = 1;
	}
	// Check time of day
	else if (now_time < lights_off) {
		new_reason       = 'before dawn';
		new_lowbeam      = true;
		night_percentage = now_time / lights_off;
	}
	else if (now_time > lights_off && now_time < lights_on) {
		new_reason       = 'after dawn, before dusk';
		new_lowbeam      = false;
		night_percentage = 0;
	}
	else if (now_time > lights_on) {
		new_reason       = 'after dusk';
		new_lowbeam      = true;
		night_percentage = lights_on / now_time;
	}
	else {
		new_reason       = 'failsafe';
		new_lowbeam      = true;
		night_percentage = 1;
	}

	update.status('lights.auto.reason', new_reason);

	update.status('lights.auto.night_percentage', parseFloat(night_percentage.toFixed(2)) * 100);

	if (update.status('lights.auto.lowbeam', new_lowbeam)) {
		// Show autolights status in cluster
		IKE.text_override('AL: ' + status.lights.auto.lowbeam);
	}

	reset();

	// Process/send LCM data on 5 second timeout (for safety)
	// LCM diag command timeout is 15 seconds
	LCM.timeout.lights_auto = setTimeout(auto_lights_process, 5000);
}

// Cluster/interior backlight
function set_backlight(value) {
	if (config.chassis.model !== 'e39') return;

	log.module('Setting backlight to ' + value);

	bus.data.send({
		src : 'LCM',
		dst : 'GLO',
		msg : [ 0x5C, value.toString(16), 0x00 ],
	});
}

// Get LCM coding data
function coding_get() {
	if (config.chassis.model !== 'e39') return;

	// Get all 20 blocks of coding data
	for (let byte = 0; byte < 21; byte++) {
		bus.data.send({
			src : 'DIA',
			msg : [ 0x08, byte ],
		});
	}
}

// Get LCM identity data
function identity_get() {
	if (config.chassis.model !== 'e39') return;

	bus.data.send({
		src : 'DIA',
		msg : [ 0x00 ],
	});
}

// Comfort turn signal handling
function comfort_turn(data) {
	// If comfort turn is not enabled
	if (config.lights.comfort_turn.enable !== true) return;

	// If comfort turn is not currently engaged
	if (status.lights.turn.left.comfort === true || status.lights.turn.right.comfort === true) return;

	// If we haven't passed the cooldown yet
	if (status.lights.turn.comfort_cool === false) return;

	// Determine the direction of the previously active turn signal
	let before;
	switch (data.before.left.active) {
		case false : {
			switch (data.before.right.active) {
				case false : before = null; break; // Neither are active
				case true  : before = 'right';
			}

			break;
		}

		case true : {
			switch (data.before.right.active) {
				case false : before = 'left'; // They can't both be active
			}
		}
	}

	// Determine the direction of the currently active turn signal
	let mask = bitmask.check(data.after).mask;
	let after;
	switch (mask.bit5) {
		case false : {
			switch (mask.bit6) {
				case false : after = null; break; // Neither are active
				case true  : after = 'right';
			}

			break;
		}

		case true : {
			switch (mask.bit6) {
				case false : after = 'left'; // They can't both be active
			}
		}
	}

	// If the currently active signal is the same as the previously active signal, bounce
	if (before === after) return;

	// Mark the currently active signal's depress timestamp
	if (after !== null) update.status('lights.turn.' + after + '.depress', now());

	// If NEITHER signal WAS active, or EITHER signal IS active, bounce
	// That way we only continue if we're going from ON to OFF
	if (before === null || after !== null) return;

	// Update the previously active signal's elapsed time
	update.status('lights.turn.depress_elapsed', now() - status.lights.turn[before].depress);

	// Attempt to fire comfort turn signal
	comfort_turn_flash(before);
}

function comfort_turn_flash(action) {
	// If the time difference is more than 1000ms, bounce
	if (status.lights.turn.depress_elapsed >= 1000) return;

	// Double-check the requested action
	if (action !== 'left' && action !== 'right') return;

	log.module('Comfort turn action: ' + action + ', elapsed: ' + status.lights.turn.depress_elapsed);

	// Update status variables, and prepare cluster message
	let cluster_msg_outer;
	switch (action) {
		case 'left' :
			// Set status variables
			update.status('lights.turn.left.comfort',  true);
			update.status('lights.turn.right.comfort', false);
			cluster_msg_outer = '< < < < < < <';
			break;

		case 'right' :
			// Set status variables
			update.status('lights.turn.left.comfort',  false);
			update.status('lights.turn.right.comfort', true);
			cluster_msg_outer = '> > > > > > >';
	}

	// Send cluster message if configured to do so
	if (config.lights.comfort_turn.cluster_msg === true) {
		// Concat message string
		let cluster_msg = cluster_msg_outer + ' ' + action.charAt(0).toUpperCase() + ' ' + cluster_msg_outer;
		IKE.text_override(cluster_msg, 2000 + status.lights.turn.depress_elapsed, action, true);
	}

	// Fire!
	reset();

	// Begin comfort turn cooldown period
	update.status('lights.turn.comfort_cool', false);

	// Calculate timeout length, accounting for the time from the initial flash
	// 1 flash ~ 500ms, so 5x flash ~ 2500ms
	let timer_off  = (config.lights.comfort_turn.flashes - 1) * 500;
	let timer_cool = timer_off + 1500; // Cooldown period ends 1.5s after last comfort turn

	log.module('Comfort turn timer: ' + timer_off + 'ms');

	// Timeout for turning off the comfort turn signal
	setTimeout(() => {
		// Update status variables
		update.status('lights.turn.left.comfort',  false);
		update.status('lights.turn.right.comfort', false);
		reset();
	}, timer_off);

	// Timeout for comfort turn cooldown period
	setTimeout(() => { update.status('lights.turn.comfort_cool', true); }, timer_cool);
}

// Decode various bits of data into usable information
function decode(data) {
	switch (data.msg[0]) {
		case 0x54: { // Vehicle service data
			let parse = {
				vin      : hex.h2a(hex.i2s(data.msg[1], false)) + hex.h2a(hex.i2s(data.msg[2], false)) + hex.i2s(data.msg[3], false) + hex.i2s(data.msg[4], false) + hex.i2s(data.msg[5], false)[0],
				odometer : ((data.msg[6] << 8) | (data.msg[7])) * 100,

				since_service : {
					days   : ((data.msg[10] << 8) | (data.msg[11])),
					liters : (((data.msg[8] << 8) | data.msg[9]) & 0x7FF) * 10,
				},
			};

			update.status('vehicle.vin', parse.vin);

			update.status('vehicle.coding.since_service.days',   parse.since_service.days);
			update.status('vehicle.coding.since_service.liters', parse.since_service.liters);
			break;
		}

		case 0x5B: { // Decode a light status message from the LCM and act upon the results
			// Remove command byte
			data.msg = data.msg.slice(1);

			// Send data to comfort turn function
			comfort_turn({ before : status.lights.turn, after : data.msg[0] });

			// Decode bitmasks
			let masks = {
				m0 : bitmask.check(data.msg[0]).mask,
				m1 : bitmask.check(data.msg[1]).mask,
				m2 : bitmask.check(data.msg[2]).mask,
				m3 : bitmask.check(data.msg[3]).mask,
			};

			// On
			update.status('lights.all_off', masks.m0.b8);

			update.status('lights.standing.front',    masks.m0.b0);
			update.status('lights.lowbeam',           masks.m0.b1);
			update.status('lights.highbeam',          masks.m0.b2);
			update.status('lights.fog.front',         masks.m0.b3);
			update.status('lights.fog.rear',          masks.m0.b4);
			update.status('lights.turn.left.active',  masks.m0.b5);
			update.status('lights.turn.right.active', masks.m0.b6);
			update.status('lights.turn.fast',         masks.m0.b7);

			update.status('lights.brake',            masks.m2.b1);
			update.status('lights.turn.sync',        masks.m2.b2);
			update.status('lights.standing.rear',    masks.m2.b3);
			update.status('lights.trailer.standing', masks.m2.b4);
			update.status('lights.reverse',          masks.m2.b5);
			update.status('lights.trailer.reverse',  masks.m2.b6);
			update.status('lights.hazard',           masks.m2.b7);

			// Faulty
			update.status('lights.faulty.all_ok', masks.m1.b8);

			update.status('lights.faulty.standing.front', masks.m1.b0);
			update.status('lights.faulty.lowbeam.both',   masks.m1.b1);
			update.status('lights.faulty.highbeam',       masks.m1.b2);
			update.status('lights.faulty.fog.front',      masks.m1.b3);
			update.status('lights.faulty.fog.rear',       masks.m1.b4);
			update.status('lights.faulty.turn.left',      masks.m1.b5);
			update.status('lights.faulty.turn.right',     masks.m1.b6);
			update.status('lights.faulty.license_plate',  masks.m1.b7);

			update.status('lights.faulty.brake.right',         masks.m3.b0);
			update.status('lights.faulty.brake.left',          masks.m3.b1);
			update.status('lights.faulty.standing.rear.right', masks.m3.b2);
			update.status('lights.faulty.standing.rear.left',  masks.m3.b3);
			update.status('lights.faulty.lowbeam.right',       masks.m3.b4);
			update.status('lights.faulty.lowbeam.left',        masks.m3.b5);
			break;
		}

		case 0xA0: { // Decode IO status and output true/false values
			// Remove command byte
			data.msg = data.msg.slice(1);

			// Set raw IO status bitmask data
			update.status('lcm.io.0',  data.msg[0]);
			update.status('lcm.io.1',  data.msg[1]);
			update.status('lcm.io.2',  data.msg[2]);
			update.status('lcm.io.3',  data.msg[3]);
			update.status('lcm.io.4',  data.msg[4]);
			update.status('lcm.io.5',  data.msg[5]);
			update.status('lcm.io.6',  data.msg[6]);
			update.status('lcm.io.7',  data.msg[7]);
			update.status('lcm.io.8',  data.msg[8]);
			update.status('lcm.io.9',  data.msg[9]); // Voltage: Terminal 30
			update.status('lcm.io.10', data.msg[10]);
			update.status('lcm.io.11', data.msg[11]);
			update.status('lcm.io.12', data.msg[12]);
			update.status('lcm.io.13', data.msg[13]);
			update.status('lcm.io.14', data.msg[14]);
			update.status('lcm.io.15', data.msg[15]);
			update.status('lcm.io.16', data.msg[16]);
			update.status('lcm.io.17', data.msg[17]);
			update.status('lcm.io.18', data.msg[18]); // Changes while running (autolevel?)
			update.status('lcm.io.19', data.msg[19]); // Changes while running (autolevel?)
			update.status('lcm.io.20', data.msg[20]);
			update.status('lcm.io.21', data.msg[21]); // Changes while running (autolevel?)
			update.status('lcm.io.22', data.msg[22]);
			update.status('lcm.io.23', data.msg[23]);
			update.status('lcm.io.24', data.msg[24]);
			update.status('lcm.io.25', data.msg[25]);
			update.status('lcm.io.26', data.msg[26]);
			update.status('lcm.io.27', data.msg[27]);
			update.status('lcm.io.28', data.msg[28]);
			update.status('lcm.io.29', data.msg[29]); // Voltage: Flash to pass
			update.status('lcm.io.30', data.msg[30]); // Voltage: Turn signal
			update.status('lcm.io.31', data.msg[31]);

			// Decode values
			update.status('lcm.dimmer.value_2', data.msg[15]);

			update.status('lcm.voltage.terminal_30',        parseFloat((data.msg[9] * 0.0708).toFixed(2)));
			update.status('lcm.voltage.flash_to_pass',      parseFloat(data.msg[29] / 51));
			update.status('lcm.voltage.turn_signal_switch', parseFloat(data.msg[30] / 51));

			// Decode bitmasks
			let masks = {
				m0 : bitmask.check(data.msg[0]).mask,
				m1 : bitmask.check(data.msg[1]).mask,
				m2 : bitmask.check(data.msg[2]).mask,
				m3 : bitmask.check(data.msg[3]).mask,
				m4 : bitmask.check(data.msg[4]).mask,
				m5 : bitmask.check(data.msg[5]).mask,
				m6 : bitmask.check(data.msg[6]).mask,
				m7 : bitmask.check(data.msg[7]).mask,
				m8 : bitmask.check(data.msg[8]).mask,
			};

			// Bitmasks
			update.status('lcm.clamp.c_30a', masks.m0.b0);
			update.status('lcm.clamp.c_15',  masks.m3.b5);
			update.status('lcm.clamp.c_r',   masks.m0.b6);
			update.status('lcm.clamp.c_30b', masks.m0.b7);

			update.status('lcm.input.fire_extinguisher',         masks.m0.b1);
			update.status('lcm.input.preheating_fuel_injection', masks.m0.b2);
			update.status('lcm.input.carb',                      masks.m0.b4);

			update.status('lcm.input.key_in_ignition',   masks.m1.b0);
			update.status('lcm.input.seat_belts_lock',   masks.m1.b1);
			update.status('lcm.input.kfn',               masks.m1.b5);
			update.status('lcm.input.armoured_door',     masks.m1.b6);
			update.status('lcm.input.brake_fluid_level', masks.m1.b7);

			update.status('lcm.input.air_suspension',     masks.m3.b0);
			update.status('lcm.input.hold_up_alarm',      masks.m3.b1);
			update.status('lcm.input.washer_fluid_level', masks.m3.b2);
			update.status('lcm.input.engine_failsafe',    masks.m3.b6);
			update.status('lcm.input.tire_defect',        masks.m3.b7);

			update.status('lcm.input.vertical_aim', masks.m6.b1);

			update.status('lcm.mode.failsafe', masks.m8.b0);
			update.status('lcm.mode.sleep',    masks.m8.b6);

			update.status('lcm.output.license.rear_left',    masks.m4.b2);
			update.status('lcm.output.brake.rear_left',      masks.m4.b3);
			update.status('lcm.output.brake.rear_right',     masks.m4.b4);
			update.status('lcm.output.highbeam.front_right', masks.m4.b5);
			update.status('lcm.output.highbeam.front_left',  masks.m4.b6);

			update.status('lcm.output.standing.front_left',      masks.m5.b0);
			update.status('lcm.output.standing.inner_rear_left', masks.m5.b1);
			update.status('lcm.output.fog.front_left',           masks.m5.b2);
			update.status('lcm.output.reverse.rear_left',        masks.m5.b3);
			update.status('lcm.output.lowbeam.front_left',       masks.m5.b4);
			update.status('lcm.output.lowbeam.front_right',      masks.m5.b5);
			update.status('lcm.output.fog.front_right',          masks.m5.b6);
			update.status('lcm.output.fog.rear_trailer',         masks.m5.b7);

			update.status('lcm.output.license.rear_right',   masks.m6.b2);
			update.status('lcm.output.standing.rear_left',   masks.m6.b3);
			update.status('lcm.output.brake.rear_middle',    masks.m6.b4);
			update.status('lcm.output.standing.front_right', masks.m6.b5);
			update.status('lcm.output.turn.front_right',     masks.m6.b6);
			update.status('lcm.output.turn.rear_left',       masks.m6.b7);

			update.status('lcm.output.turn.rear_right',           masks.m7.b1);
			update.status('lcm.output.fog.rear_left',             masks.m7.b2);
			update.status('lcm.output.standing.inner_rear_right', masks.m7.b3);
			update.status('lcm.output.standing.rear_right',       masks.m7.b4);
			update.status('lcm.output.turn.side_left',            masks.m7.b5);
			update.status('lcm.output.turn.front_left',           masks.m7.b6);
			update.status('lcm.output.reverse.rear_right',        masks.m7.b7);

			update.status('lcm.output.led.switch_hazard',    masks.m8.b2);
			update.status('lcm.output.led.switch_light',     masks.m8.b3);
			update.status('lcm.output.reverse.rear_trailer', masks.m8.b5);

			update.status('lcm.switch.hazard',         masks.m1.b4);
			update.status('lcm.switch.highbeam_flash', masks.m1.b2);

			update.status('lcm.switch.brake',      masks.m2.b0);
			update.status('lcm.switch.highbeam',   masks.m2.b1);
			update.status('lcm.switch.fog_front',  masks.m2.b2);
			update.status('lcm.switch.fog_rear',   masks.m2.b4);
			update.status('lcm.switch.standing',   masks.m2.b5);
			update.status('lcm.switch.turn_right', masks.m2.b6);
			update.status('lcm.switch.turn_left',  masks.m2.b7);

			update.status('lcm.switch.lowbeam_1', masks.m3.b4);
			update.status('lcm.switch.lowbeam_2', masks.m3.b3);
		}
	}
}

// Encode the LCM bitmask string from an input of true/false values
function io_encode(object) {
	// Initialize bitmask variables
	let output = {
		b0 : bitmask.create({
			b0 : object.clamp_30a,
			b1 : object.input_fire_extinguisher,
			b2 : object.input_preheating_fuel_injection,
			b3 : false,
			b4 : object.input_carb,
			b5 : false,
			b6 : object.clamp_r,
			b7 : object.clamp_30b,
		}),

		b1 : bitmask.create({
			b0 : object.input_key_in_ignition,
			b1 : object.input_seat_belts_lock,
			b2 : object.switch_highbeam_flash,
			b3 : false,
			b4 : object.switch_hazard,
			b5 : object.input_kfn,
			b6 : object.input_armoured_door,
			b7 : object.input_brake_fluid_level,
		}),

		b2 : bitmask.create({
			b0 : object.switch_brake,
			b1 : object.switch_highbeam,
			b2 : object.switch_fog_front,
			b3 : false,
			b4 : object.switch_fog_rear,
			b5 : object.switch_standing,
			b6 : object.switch_turn_right,
			b7 : object.switch_turn_left,
		}),

		b3 : bitmask.create({
			b0 : object.input_air_suspension,
			b1 : object.input_hold_up_alarm,
			b2 : object.input_washer_fluid_level,
			b3 : object.switch_lowbeam_2,
			b4 : object.switch_lowbeam_1,
			b5 : object.clamp_15,
			b6 : object.input_engine_failsafe,
			b7 : object.input_tire_defect,
		}),

		b4 : bitmask.create({
			b0 : false,
			b1 : false,
			b2 : object.output_license_rear_left,
			b3 : object.output_brake_rear_left,
			b4 : object.output_brake_rear_right,
			b5 : object.output_highbeam_front_right,
			b6 : object.output_highbeam_front_left,
			b7 : object.output_turn_side_left,
		}),

		b5 : bitmask.create({
			b0 : object.output_standing_front_left,
			b1 : object.output_standing_inner_rear_left,
			b2 : object.output_fog_front_left,
			b3 : object.output_reverse_rear_left,
			b4 : object.output_lowbeam_front_left,
			b5 : object.output_lowbeam_front_right,
			b6 : object.output_fog_front_right,
			b7 : object.output_fog_rear_trailer,
		}),

		b6 : bitmask.create({
			b0 : false,
			b1 : object.input_vertical_aim,
			b2 : object.output_license_rear_right,
			b3 : object.output_standing_rear_left,
			b4 : object.output_brake_rear_middle,
			b5 : object.output_standing_front_right,
			b6 : object.output_turn_front_right,
			b7 : object.output_turn_rear_left,
		}),

		b7 : bitmask.create({
			b0 : object.output_turn_side_right,
			b1 : object.output_turn_rear_right,
			b2 : object.output_fog_rear_left,
			b3 : object.output_standing_inner_rear_right,
			b4 : object.output_standing_rear_right,
			b5 : object.output_turn_trailer_left,
			b6 : object.output_turn_front_left,
			b7 : object.output_reverse_rear_right,
		}),

		b8 : bitmask.create({
			b0 : object.mode_failsafe,
			b1 : false,
			b2 : object.output_led_switch_hazard,
			b3 : object.output_led_switch_light,
			b4 : false,
			b5 : object.output_reverse_rear_trailer,
			b6 : object.mode_sleep,
			b7 : false,
		}),

		b9  : status.lcm.io[9],
		b10 : status.lcm.io[10],
		b11 : status.lcm.io[11],
		b12 : status.lcm.io[12],
		b13 : status.lcm.io[13],
		b14 : status.lcm.io[14],
		b15 : status.lcm.io[15], // dimmer_value_2
		b16 : status.lcm.io[16], // Something to do with autoleveling
		b17 : status.lcm.io[17],
		b18 : status.lcm.io[18],
		b19 : status.lcm.io[19],
		b20 : status.lcm.io[20],
		b21 : status.lcm.io[21],
		b22 : status.lcm.io[22],
		b23 : status.lcm.io[23], // Something to do with autoleveling
		b24 : status.lcm.io[24], // Something to do with autoleveling
		b25 : status.lcm.io[25],
		b26 : status.lcm.io[26],
		b27 : status.lcm.io[27],
		b28 : status.lcm.io[28],
		b29 : status.lcm.io[29],
		b30 : status.lcm.io[30],
		b31 : status.lcm.io[31],
	};

	// LCM dimmer
	if (object.dimmer_value_2) bitmask.b15 = parseInt(object.dimmer_value_2);

	// Suspect
	// object.clamp_58g

	// Assemble the output array
	io_set([
		output.b0,  output.b1,  output.b2,  output.b3,  output.b4,  output.b5,  output.b6,  output.b7,
		output.b8,  output.b9,  output.b10, output.b11, output.b12, output.b13, output.b14, output.b15,
		output.b16, output.b17, output.b18, output.b19, output.b20, output.b21, output.b22, output.b23,
		output.b24, output.b25, output.b26, output.b27, output.b28, output.b29, output.b30, output.b31,
	]);
}

// Send 'Set IO status' message to LCM
function io_set(packet) {
	if (config.chassis.model !== 'e39') return;

	log.module('Setting IO status');

	packet.unshift(0x0C);
	bus.data.send({
		src : 'DIA',
		msg : packet,
	});

	// Request the IO status after
	// setImmediate(() => {
	// 	LCM.request('io-status');
	// });
}

// Make things.. how they should be?
function reset() {
	// Object of autolights related values
	let io_object_auto_lights = {
		dimmer_value_2              : Math.round(status.lights.auto.night_percentage * 254),
		output_standing_front_left  : true,
		output_standing_front_right : true,
		output_standing_rear_left   : true,
		output_standing_rear_right  : true,
		switch_fog_rear             : true, // To leverage the IKE LED as a status indicator
		switch_lowbeam_1            : status.lights.auto.lowbeam,
	};

	// Object of only comfort turn values
	let io_object = {
		switch_turn_left  : status.lights.turn.left.comfort,
		switch_turn_right : status.lights.turn.right.comfort,
	};

	// If autolights are enabled, use ES6 object merge to use auto lights
	if (config.lights.auto === true) Object.assign(io_object, io_object_auto_lights);

	io_encode(io_object);
}

// Request various things from LCM
function request(value) {
	if (config.chassis.model !== 'e39') return;

	let src;
	let msg;

	log.module('Requesting \'' + value + '\'');

	switch (value) {
		case 'coding' : coding_get(); return;

		case 'dimmer' : {
			src = 'BMBT';
			msg = [ 0x5D ];
			break;
		}

		case 'identity' : identity_get(); return;

		case 'io-status' : {
			src = 'DIA';
			msg = [ 0x0B, 0x00 ]; // Get IO status
			break;
		}

		case 'light-status' : {
			src = 'GT';
			msg = [ 0x5A ];
			break;
		}

		case 'vehicledata' : {
			src = 'IKE';
			msg = [ 0x53 ];
		}
	}

	bus.data.send({
		src : src,
		msg : msg,
	});
}

// Parse data sent from LCM module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x54 : { // Broadcast: vehicle data
			data.command = 'bro';
			data.value   = 'vehicle data';
			decode(data); // Decode it
			break;
		}

		case 0x5B : { // Broadcast: light status
			data.command = 'bro';
			data.value   = 'light status';
			decode(data); // Decode it
			break;
		}

		case 0x5C : { // Broadcast: light dimmer status
			data.command = 'bro';
			data.value   = 'dimmer value 1';

			update.status('lcm.dimmer.value_1', data.msg[1]);
			// update.status('lcm.io.15',          data.msg[1]);
			break;
		}

		case 0xA0 : { // Reply to DIA: success
			data.command = 'rep';

			switch (data.msg.length) {
				case 33 : {
					data.command = 'bro';
					data.value   = 'io-status';
					decode(data); // Decode it
					break;
				}

				case 13 : {
					data.command = 'bro';
					data.value   = 'io-status';
					decode(data); // Decode it
					break;
				}

				case 1  : data.value = 'ACK'; break;
				default : data.value = Buffer.from(data.msg);
			}

			break;
		}

		default : {
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
		}
	}

	log.bus(data);
}

// Welcome lights on unlocking/locking
function welcome_lights(action, override = false) {
	// Disable welcome lights if ignition is not fully off
	if (status.vehicle.ignition_level !== 0) action = false;

	// Bounce if welcome lights status is equal to request
	if (status.lights.welcome_lights === action && override === false) return;

	log.module('Welcome lights: ' + action);

	switch (action) {
		case false : {
			// Clear any remaining timeout(s)
			clearTimeout(LCM.timeout.lights_welcome);
			LCM.timeout.lights_welcome = null;

			// Reset welcome lights counter
			LCM.counts.welcome_lights = 0;

			// Set status var back to false
			update.status('lights.welcome_lights', action);

			// Send empty object to turn off all LCM outputs (if vehicle is off)
			if (status.vehicle.ignition_level === 0) io_encode({});

			break;
		}

		case true : {
			// Set status var to true
			update.status('lights.welcome_lights', action);

			// Send configured welcome lights
			io_encode(config.lights.welcome_lights);

			// Increment welcome lights counter
			LCM.counts.welcome_lights++;

			// Clear welcome lights status after configured timeout
			LCM.timeout.lights_welcome = setTimeout(() => {
				// If we're not over the configured welcome lights limit yet
				LCM.welcome_lights((LCM.counts.welcome_lights <= config.lights.welcome_lights_sec), true);
			}, 1000);

			break;
		}
	}
}

// Police lights!
function pl() {
	if (status.lcm.police_lights.counts.loop >= config.lights.police_lights.limit || status.lcm.police_lights.ok !== true) {
		update.status('lcm.police_lights.ok', false);

		clearTimeout(LCM.timeout.lights_police);
		LCM.timeout.lights_police = null;

		io_encode({});

		if (update.status('lcm.police_lights.on', false)) {
			setTimeout(IKE.text_urgent_off, 1000);
		}
		return;
	}

	if (update.status('lcm.police_lights.on', true)) {
		IKE.text_warning('   Police lights!   ', 0);
	}

	let object = {
		front : {
			left : {
				fog      : false,
				highbeam : pl_check([ 0, 2, 8, 16, 18, 24 ]),
				lowbeam  : false,
				standing : pl_check([ 0, 2, 8, 16, 18, 24 ]),
				turn     : pl_check([ 4, 6, 10, 20, 22, 26 ]),
				// standing : pl_check([ 2, 3, 6, 7, 10, 11, 14, 15, 18, 19, 22, 23, 26, 27, 30, 31 ]),
				// turn     : pl_check([ 4, 5, 6, 7, 12, 13, 14, 15, 20, 21, 22, 23, 28, 29, 30, 31 ]),
			},
			right : {
				fog      : false,
				highbeam : pl_check([ 4, 6, 10, 20, 22, 26 ]),
				lowbeam  : false,
				standing : pl_check([ 4, 6, 10, 20, 22, 26 ]),
				turn     : pl_check([ 0, 2, 8, 16, 18, 24 ]),
				// standing : pl_check([ 0, 1, 4, 5, 8, 9, 12, 13, 16, 17, 20, 21, 24, 25, 28, 29 ]),
				// turn     : pl_check([ 0, 1, 2, 3, 8, 9, 10, 11, 16, 17, 18, 19, 24, 25, 26, 27 ]),
			},
		},

		side : {
			left : {
				turn : pl_check([ 0, 2, 8, 16, 18, 24 ]),
			},
			right : {
				turn : pl_check([ 4, 6, 10, 20, 22, 26 ]),
			},
		},

		rear : {
			left : {
				brake    : pl_check([ 0, 1, 6, 7, 8, 9, 14, 15, 16, 17, 22, 23, 24, 25, 30, 31 ]),
				reverse  : pl_check([ 4, 6, 10, 20, 22, 26 ]),
				standing : pl_check([ 2, 3, 4, 5, 10, 11, 12, 13, 18, 19, 20, 21, 26, 27, 28, 29 ]),
				turn     : pl_check([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ]),
			},
			right : {
				brake    : pl_check([ 2, 3, 4, 5, 10, 11, 12, 13, 18, 19, 20, 21, 26, 27, 28, 29 ]),
				reverse  : pl_check([ 0, 2, 8, 16, 18, 24 ]),
				standing : pl_check([ 0, 1, 6, 7, 8, 9, 14, 15, 16, 17, 22, 23, 24, 25, 30, 31 ]),
				turn     : pl_check([ 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31 ]),
			},
			middle : {
				brake : pl_check([ 4, 5, 6, 7, 12, 13, 14, 15, 20, 21, 22, 23, 28, 29, 30, 31 ]),
			},
		},
	};

	// Clean this up later
	let io_object = {
		output_standing_front_left  : object.front.left.standing,
		output_standing_front_right : object.front.right.standing,

		output_standing_inner_rear_left  : object.rear.left.standing,
		output_standing_inner_rear_right : object.rear.right.standing,

		output_standing_rear_left  : object.rear.left.standing,
		output_standing_rear_right : object.rear.right.standing,

		output_brake_rear_left   : object.rear.left.brake,
		output_brake_rear_middle : object.rear.middle.brake,
		output_brake_rear_right  : object.rear.right.brake,

		output_reverse_rear_left  : object.rear.left.reverse,
		output_reverse_rear_right : object.rear.right.reverse,

		output_turn_rear_left  : object.rear.left.turn,
		output_turn_rear_right : object.rear.right.turn,

		output_turn_side_left  : object.side.left.turn,
		output_turn_side_right : object.side.right.turn,

		output_turn_front_left  : object.front.left.turn,
		output_turn_front_right : object.front.left.turn,

		output_highbeam_front_left  : object.front.left.highbeam,
		output_highbeam_front_right : object.front.right.highbeam,
	};

	io_encode(io_object);

	update.status('lcm.police_lights.counts.main', (status.lcm.police_lights.counts.main + 1), false);

	if (status.lcm.police_lights.counts.main === 32) {
		update.status('lcm.police_lights.counts.main', 0, false);
		update.status('lcm.police_lights.counts.loop', (status.lcm.police_lights.counts.loop + 1));
	}

	LCM.timeout.lights_police = setTimeout(pl, config.lights.police_lights.delay);
}

// Check if the current police lights count is in the provided array
function pl_check(data) {
	return data.includes(status.lcm.police_lights.counts.main);
}

function police(action = false) {
	update.status('lcm.police_lights.ok', action);

	if (status.lcm.police_lights.on === action) return;

	switch (action) {
		case true : {
			if (status.lcm.police_lights.on !== true) {
				update.status('lcm.police_lights.counts.loop', 0);
				update.status('lcm.police_lights.counts.main', 0);
			}
		}
	}

	pl();
}

// Configure event listeners
function init_listeners() {
	if (config.chassis.model !== 'e39') return;

	// Refresh data on IKE event
	IKE.on('obc-refresh', () => {
		request('dimmer');
		request('io-status');
		request('light-status');
		request('vehicledata');
	});

	// Enable/disable welcome lights on GM keyfob event
	GM.on('keyfob', (keyfob) => {
		log.module('Received GM keyfob event');
		if (keyfob.button !== 'none') welcome_lights((keyfob.button === 'unlock'));
	});

	// Activate autolights if we got 'em
	update.on('status.vehicle.ignition', auto_lights_process);

	// Update autolights status on wiper speed change
	update.on('status.gm.wipers.speed', () => {
		// Call auto_lights_process() after 1.5s, else just tapping mist/spray turns on the lights
		setTimeout(auto_lights_process, 1500);
	});

	log.msg('Initialized listeners');
}


module.exports = {
	// Interval/loop/timeout variables
	counts : {
		welcome_lights : 0,
	},

	// Timeout variables
	timeout : {
		lights_auto    : null,
		lights_police  : null,
		lights_welcome : null,
	},

	// Functions
	decode : decode,

	auto_lights         : auto_lights,
	auto_lights_process : auto_lights_process,
	comfort_turn_flash  : comfort_turn_flash,
	init_listeners      : init_listeners,
	io_encode           : io_encode,
	parse_out           : parse_out,
	police              : police,
	request             : request,
	set_backlight       : set_backlight,
	welcome_lights      : welcome_lights,
};
