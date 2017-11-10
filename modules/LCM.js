const suncalc = require('suncalc');
const now     = require('performance-now');


// Automatic lights handling
function auto_lights() {
	// Default action is true (enable/process auto lights)
	let action = true;

	// Action is false if auto lights are disabled in the config
	if (config.lights.auto !== true) action = false;

	// Action is false if ignition is not in run
	if (status.vehicle.ignition_level < 3) action = false;

	switch (action) {
		case false:
			io_encode({});

			if (LCM.timeouts.lights_auto !== null) {
				clearTimeout(LCM.timeouts.lights_auto);
				LCM.timeouts.lights_auto = null;
				log.module({ msg : 'Unset autolights timeout' });
			}

			// Set status variables
			update.status('lights.auto.active',  false);
			update.status('lights.auto.lowbeam', false);
			update.status('lights.auto.reason',  null);
			break;
		case true:
			if (LCM.timeouts.lights_auto === null) {
				log.module({ msg : 'Set autolights timeout' });
			}

			// Set status variable
			update.status('lights.auto.active', true);

			auto_lights_process();
	}
}

// Logic based on location and time of day, determine if the low beams should be on
function auto_lights_process() {
	// Init variables
	let new_reason;
	let new_lowbeam;

	let now_time  = Date.now();
	let now_epoch = Math.floor(now_time / 1000);

	let now_offset  = 0;
	let now_weather = false;

	// Factor in cloud cover to lights on/off time
	if (config.weather.apikey !== null) {
		status.weather.daily.data.forEach((value) => {
			if (now_weather === true) return;

			if ((now_epoch - value.time) <= 0) {
				// Add 3 hours * current cloudCover value
				now_offset = value.cloudCover * 3 * 60 * 60 * 1000;
				now_weather = true;
			}
		});
	}

	let sun_times  = suncalc.getTimes(now_time, config.location.latitude, config.location.longitude);
	let lights_on  = new Date(sun_times.sunsetStart.getTime() - now_offset);
	let lights_off = new Date(sun_times.sunriseEnd.getTime()  + now_offset);

	// Debug logging
	// log.module({ msg : '   current : \''+now_time+'\'' });
	// log.module({ msg : ' lights_on : \''+lights_on+'\''    });
	// log.module({ msg : 'lights_off : \''+lights_off+'\''   });

	// If ignition is not in run or auto lights are disabled in config,
	// call auto_lights() to clean up
	if (status.vehicle.ignition_level < 3 || config.lights.auto !== true) {
		auto_lights();
		return;
	}

	// log.module({ msg : 'Processing auto lights' });

	// Check wipers
	if (status.gm.wipers.speed !== null && status.gm.wipers.speed !== 'off' && status.gm.wipers.speed !== 'spray') {
		new_reason  = 'wipers on';
		new_lowbeam = true;
	}
	// Check time of day
	else if (now_time < lights_off) {
		new_reason  = 'before dawn';
		new_lowbeam = true;
	}
	else if (now_time > lights_off && now_time < lights_on) {
		new_reason  = 'after dawn, before dusk';
		new_lowbeam = false;
	}
	else if (now_time > lights_on) {
		new_reason  = 'after dusk';
		new_lowbeam = true;
	}
	else {
		new_reason  = 'failsafe';
		new_lowbeam = true;
	}

	update.status('lights.auto.reason', new_reason);

	if (update.status('lights.auto.lowbeam', new_lowbeam)) {
		// Show autolights status in cluster
		IKE.text_override('AL: ' + status.lights.auto.lowbeam);
	}

	reset();

	// Process/send LCM data on 10 second timeout (for safety)
	// LCM diag command timeout is 15 seconds
	LCM.timeouts.lights_auto = setTimeout(auto_lights_process, 10000);
}

// Cluster/interior backlight
function set_backlight(value) {
	log.module({ msg : 'Setting backlight to ' + value });

	bus.data.send({
		src : 'LCM',
		dst : 'GLO',
		msg : [ 0x5C, value.toString(16), 0x00 ],
	});
}

// Get LCM coding data
function coding_get() {
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
		case true : {
			switch (data.before.right.active) {
				case true  : break; // They can't both be active
				case false : before = 'left';
			}
			break;
		}

		case false : {
			switch (data.before.right.active) {
				case false : before = null; break; // Neither are active
				case true  : before = 'right';
			}
		}
	}

	// Determine the direction of the currently active turn signal
	let mask = bitmask.check(data.after).mask;
	let after;
	switch (mask.bit5) {
		case true : {
			switch (mask.bit6) {
				case true  : break; // They can't both be active
				case false : after = 'left';
			}
			break;
		}

		case false : {
			switch (mask.bit6) {
				case false : after = null; break; // Neither are active
				case true  : after = 'right';
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

	log.module({ msg : 'Comfort turn action: ' + action + ', elapsed: ' + status.lights.turn.depress_elapsed });

	// Update status variables, and prepare cluster message
	let cluster_msg_outer;
	switch (action) {
		case 'left':
			// Set status variables
			update.status('lights.turn.left.comfort',  true);
			update.status('lights.turn.right.comfort', false);
			cluster_msg_outer = '< < < < < < <';
			break;

		case 'right':
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

	log.module({ msg : 'Comfort turn timer: ' + timer_off + 'ms' });

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
		case 0x54: { // Vehicle data
			// This message also has days since service and total kms, but, baby steps...
			let vin_string = hex.h2a(data.msg[1].toString(16)) + hex.h2a(data.msg[2].toString(16)) + data.msg[3].toString(16) + data.msg[4].toString(16) + data.msg[5].toString(16)[0];
			update.status('vehicle.vin', vin_string);
			break;
		}

		case 0x5B: { // Decode a light status message from the LCM and act upon the results
			// Send data to comfort turn function
			comfort_turn({ before : status.lights.turn, after : data.msg[1] });

			// On
			update.status('lights.all_off', !data.msg[1]);

			update.status('lights.standing.front',    bitmask.test(data.msg[1], bitmask.bit[0]));
			update.status('lights.lowbeam',           bitmask.test(data.msg[1], bitmask.bit[1]));
			update.status('lights.highbeam',          bitmask.test(data.msg[1], bitmask.bit[2]));
			update.status('lights.fog.front',         bitmask.test(data.msg[1], bitmask.bit[3]));
			update.status('lights.fog.rear',          bitmask.test(data.msg[1], bitmask.bit[4]));
			update.status('lights.turn.left.active',  bitmask.test(data.msg[1], bitmask.bit[5]));
			update.status('lights.turn.right.active', bitmask.test(data.msg[1], bitmask.bit[6]));
			update.status('lights.turn.fast',         bitmask.test(data.msg[1], bitmask.bit[7]));

			update.status('lights.brake',            bitmask.test(data.msg[3], bitmask.bit[1]));
			update.status('lights.turn.sync',        bitmask.test(data.msg[3], bitmask.bit[2]));
			update.status('lights.standing.rear',    bitmask.test(data.msg[3], bitmask.bit[3]));
			update.status('lights.trailer.standing', bitmask.test(data.msg[3], bitmask.bit[4]));
			update.status('lights.reverse',          bitmask.test(data.msg[3], bitmask.bit[5]));
			update.status('lights.trailer.reverse',  bitmask.test(data.msg[3], bitmask.bit[6]));
			update.status('lights.hazard',           bitmask.test(data.msg[3], bitmask.bit[7]));

			// Faulty
			update.status('lights.faulty.all_ok', !data.msg[2]);

			update.status('lights.faulty.standing.front', bitmask.test(data.msg[2], bitmask.bit[0]));
			update.status('lights.faulty.lowbeam.both',   bitmask.test(data.msg[2], bitmask.bit[1]));
			update.status('lights.faulty.highbeam',       bitmask.test(data.msg[2], bitmask.bit[2]));
			update.status('lights.faulty.fog.front',      bitmask.test(data.msg[2], bitmask.bit[3]));
			update.status('lights.faulty.fog.rear',       bitmask.test(data.msg[2], bitmask.bit[4]));
			update.status('lights.faulty.turn.left',      bitmask.test(data.msg[2], bitmask.bit[5]));
			update.status('lights.faulty.turn.right',     bitmask.test(data.msg[2], bitmask.bit[6]));
			update.status('lights.faulty.license_plate',  bitmask.test(data.msg[2], bitmask.bit[7]));

			update.status('lights.faulty.brake.right',         bitmask.test(data.msg[4], bitmask.bit[0]));
			update.status('lights.faulty.brake.left',          bitmask.test(data.msg[4], bitmask.bit[1]));
			update.status('lights.faulty.standing.rear.right', bitmask.test(data.msg[4], bitmask.bit[2]));
			update.status('lights.faulty.standing.rear.left',  bitmask.test(data.msg[4], bitmask.bit[3]));
			update.status('lights.faulty.lowbeam.right',       bitmask.test(data.msg[4], bitmask.bit[4]));
			update.status('lights.faulty.lowbeam.left',        bitmask.test(data.msg[4], bitmask.bit[5]));
			break;
		}

		case 0xA0: // Decode IO status and output true/false values
			// Remove command byte
			data.msg = data.msg.slice(1);

			// Set raw IO status bitmask data
			status.lcm.io = data.msg;

			// let bitmask_18 = array[19]; // Something

			update.status('lcm.dimmer.value_2', data.msg[15]);

			update.status('lcm.voltage.terminal_30',        parseFloat((data.msg[9] * 0.0708).toFixed(2)));
			update.status('lcm.voltage.flash_to_pass',      parseFloat(data.msg[29] / 51));
			update.status('lcm.voltage.turn_signal_switch', parseFloat(data.msg[30] / 51));

			// Bitmasks
			update.status('lcm.clamp.c_30a', bitmask.test(data.msg[0], bitmask.bit[0]));
			update.status('lcm.clamp.c_15',  bitmask.test(data.msg[3], bitmask.bit[5]));
			update.status('lcm.clamp.c_r',   bitmask.test(data.msg[0], bitmask.bit[6]));
			update.status('lcm.clamp.c_30b', bitmask.test(data.msg[0], bitmask.bit[7]));

			update.status('lcm.input.fire_extinguisher',         bitmask.test(data.msg[0], bitmask.bit[1]));
			update.status('lcm.input.preheating_fuel_injection', bitmask.test(data.msg[0], bitmask.bit[2]));
			update.status('lcm.input.carb',                      bitmask.test(data.msg[0], bitmask.bit[4]));

			update.status('lcm.input.key_in_ignition',   bitmask.test(data.msg[1], bitmask.bit[0]));
			update.status('lcm.input.seat_belts_lock',   bitmask.test(data.msg[1], bitmask.bit[1]));
			update.status('lcm.input.kfn',               bitmask.test(data.msg[1], bitmask.bit[5]));
			update.status('lcm.input.armoured_door',     bitmask.test(data.msg[1], bitmask.bit[6]));
			update.status('lcm.input.brake_fluid_level', bitmask.test(data.msg[1], bitmask.bit[7]));

			update.status('lcm.input.air_suspension',     bitmask.test(data.msg[3], bitmask.bit[0]));
			update.status('lcm.input.hold_up_alarm',      bitmask.test(data.msg[3], bitmask.bit[1]));
			update.status('lcm.input.washer_fluid_level', bitmask.test(data.msg[3], bitmask.bit[2]));
			update.status('lcm.input.engine_failsafe',    bitmask.test(data.msg[3], bitmask.bit[6]));
			update.status('lcm.input.tire_defect',        bitmask.test(data.msg[3], bitmask.bit[7]));

			update.status('lcm.input.vertical_aim', bitmask.test(data.msg[6], bitmask.bit[1]));

			update.status('lcm.mode.failsafe', bitmask.test(data.msg[8], bitmask.bit[0]));
			update.status('lcm.mode.sleep',    bitmask.test(data.msg[8], bitmask.bit[6]));

			update.status('lcm.output.license.rear_left',    bitmask.test(data.msg[4], bitmask.bit[2]));
			update.status('lcm.output.brake.rear_left',      bitmask.test(data.msg[4], bitmask.bit[3]));
			update.status('lcm.output.brake.rear_right',     bitmask.test(data.msg[4], bitmask.bit[4]));
			update.status('lcm.output.highbeam.front_right', bitmask.test(data.msg[4], bitmask.bit[5]));
			update.status('lcm.output.highbeam.front_left',  bitmask.test(data.msg[4], bitmask.bit[6]));

			update.status('lcm.output.standing.front_left',      bitmask.test(data.msg[5], bitmask.bit[0]));
			update.status('lcm.output.standing.inner_rear_left', bitmask.test(data.msg[5], bitmask.bit[1]));
			update.status('lcm.output.fog.front_left',           bitmask.test(data.msg[5], bitmask.bit[2]));
			update.status('lcm.output.reverse.rear_left',        bitmask.test(data.msg[5], bitmask.bit[3]));
			update.status('lcm.output.lowbeam.front_left',       bitmask.test(data.msg[5], bitmask.bit[4]));
			update.status('lcm.output.lowbeam.front_right',      bitmask.test(data.msg[5], bitmask.bit[5]));
			update.status('lcm.output.fog.front_right',          bitmask.test(data.msg[5], bitmask.bit[6]));
			update.status('lcm.output.led.rear_fog',             bitmask.test(data.msg[5], bitmask.bit[7]));

			update.status('lcm.output.license.rear_right',   bitmask.test(data.msg[6], bitmask.bit[2]));
			update.status('lcm.output.standing.rear_left',   bitmask.test(data.msg[6], bitmask.bit[3]));
			update.status('lcm.output.brake.rear_middle',    bitmask.test(data.msg[6], bitmask.bit[4]));
			update.status('lcm.output.standing.front_right', bitmask.test(data.msg[6], bitmask.bit[5]));
			update.status('lcm.output.turn.front_right',     bitmask.test(data.msg[6], bitmask.bit[6]));
			update.status('lcm.output.turn.rear_left',       bitmask.test(data.msg[6], bitmask.bit[7]));

			update.status('lcm.output.turn.rear_right',           bitmask.test(data.msg[7], bitmask.bit[1]));
			update.status('lcm.output.fog.rear_left',             bitmask.test(data.msg[7], bitmask.bit[2]));
			update.status('lcm.output.standing.inner_rear_right', bitmask.test(data.msg[7], bitmask.bit[3]));
			update.status('lcm.output.standing.rear_right',       bitmask.test(data.msg[7], bitmask.bit[4]));
			update.status('lcm.output.turn.side_left',            bitmask.test(data.msg[7], bitmask.bit[5]));
			update.status('lcm.output.turn.front_left',           bitmask.test(data.msg[7], bitmask.bit[6]));
			update.status('lcm.output.reverse.rear_right',        bitmask.test(data.msg[7], bitmask.bit[7]));

			update.status('lcm.output.led.switch_hazard',    bitmask.test(data.msg[8], bitmask.bit[2]));
			update.status('lcm.output.led.switch_light',     bitmask.test(data.msg[8], bitmask.bit[3]));
			update.status('lcm.output.reverse.rear_trailer', bitmask.test(data.msg[8], bitmask.bit[5]));

			update.status('lcm.switch.hazard',         bitmask.test(data.msg[1], bitmask.bit[4]));
			update.status('lcm.switch.highbeam_flash', bitmask.test(data.msg[1], bitmask.bit[2]));

			update.status('lcm.switch.brake',      bitmask.test(data.msg[2], bitmask.bit[0]));
			update.status('lcm.switch.highbeam',   bitmask.test(data.msg[2], bitmask.bit[1]));
			update.status('lcm.switch.fog_front',  bitmask.test(data.msg[2], bitmask.bit[2]));
			update.status('lcm.switch.fog_rear',   bitmask.test(data.msg[2], bitmask.bit[4]));
			update.status('lcm.switch.standing',   bitmask.test(data.msg[2], bitmask.bit[5]));
			update.status('lcm.switch.turn_right', bitmask.test(data.msg[2], bitmask.bit[6]));
			update.status('lcm.switch.turn_left',  bitmask.test(data.msg[2], bitmask.bit[7]));

			update.status('lcm.switch.lowbeam_1', bitmask.test(data.msg[3], bitmask.bit[4]));
			update.status('lcm.switch.lowbeam_2', bitmask.test(data.msg[3], bitmask.bit[3]));
	}
}

// Encode the LCM bitmask string from an input of true/false values
function io_encode(object) {
	// Initialize bitmask variables
	let bitmask_0  = 0;
	let bitmask_1  = 0;
	let bitmask_2  = 0;
	let bitmask_3  = 0;
	let bitmask_4  = 0;
	let bitmask_5  = 0;
	let bitmask_6  = 0;
	let bitmask_7  = 0;
	let bitmask_8  = 0;
	let bitmask_9  = 0;
	let bitmask_10 = 0;
	let bitmask_11 = 0;
	let bitmask_12 = 0;
	let bitmask_13 = 0;
	let bitmask_14 = 0;
	let bitmask_15 = 0; // dimmer_value_2
	let bitmask_16 = 0; // Something to do with autoleveling
	let bitmask_17 = 0;
	let bitmask_18 = 0;
	let bitmask_19 = 0;
	let bitmask_20 = 0;
	let bitmask_21 = 0;
	let bitmask_22 = 0;
	let bitmask_23 = 0; // Something to do with autoleveling
	let bitmask_24 = 0; // Something to do with autoleveling
	let bitmask_25 = 0;
	let bitmask_26 = 0;
	let bitmask_27 = 0;
	let bitmask_28 = 0;
	let bitmask_29 = 0;
	let bitmask_30 = 0;
	let bitmask_31 = 0;

	// LCM dimmer
	if (object.dimmer_value_1) { bitmask_9 = parseInt(object.dimmer_value_1); }

	// Set the various bitmask values according to the input object
	if (object.clamp_30a)                       { bitmask_0 = bitmask.set(bitmask_0, bitmask.bit[0]); }
	if (object.input_fire_extinguisher)         { bitmask_0 = bitmask.set(bitmask_0, bitmask.bit[1]); }
	if (object.input_preheating_fuel_injection) { bitmask_0 = bitmask.set(bitmask_0, bitmask.bit[2]); }
	// if (object.)                             { bitmask_0 = bitmask.set(bitmask_0, bitmask.bit[3]); }
	if (object.input_carb)                      { bitmask_0 = bitmask.set(bitmask_0, bitmask.bit[4]); }
	// if (object.)                             { bitmask_0 = bitmask.set(bitmask_0, bitmask.bit[5]); }
	if (object.clamp_r)                         { bitmask_0 = bitmask.set(bitmask_0, bitmask.bit[6]); }
	if (object.clamp_30b)                       { bitmask_0 = bitmask.set(bitmask_0, bitmask.bit[7]); }

	if (object.input_key_in_ignition)   { bitmask_1 = bitmask.set(bitmask_1, bitmask.bit[0]); }
	if (object.input_seat_belts_lock)   { bitmask_1 = bitmask.set(bitmask_1, bitmask.bit[1]); }
	if (object.switch_highbeam_flash)   { bitmask_1 = bitmask.set(bitmask_1, bitmask.bit[2]); }
	// if (object.)                     { bitmask_1 = bitmask.set(bitmask_1, bitmask.bit[3]); }
	if (object.switch_hazard)           { bitmask_1 = bitmask.set(bitmask_1, bitmask.bit[4]); }
	if (object.input_kfn)               { bitmask_1 = bitmask.set(bitmask_1, bitmask.bit[5]); }
	if (object.input_armoured_door)     { bitmask_1 = bitmask.set(bitmask_1, bitmask.bit[6]); }
	if (object.input_brake_fluid_level) { bitmask_1 = bitmask.set(bitmask_1, bitmask.bit[7]); }

	if (object.switch_brake)      { bitmask_2 = bitmask.set(bitmask_2, bitmask.bit[0]); }
	if (object.switch_highbeam)   { bitmask_2 = bitmask.set(bitmask_2, bitmask.bit[1]); }
	if (object.switch_fog_front)  { bitmask_2 = bitmask.set(bitmask_2, bitmask.bit[2]); }
	// if (object.)               { bitmask_2 = bitmask.set(bitmask_2, bitmask.bit[3]); }
	if (object.switch_fog_rear)   { bitmask_2 = bitmask.set(bitmask_2, bitmask.bit[4]); }
	if (object.switch_standing)   { bitmask_2 = bitmask.set(bitmask_2, bitmask.bit[5]); }
	if (object.switch_turn_right) { bitmask_2 = bitmask.set(bitmask_2, bitmask.bit[6]); }
	if (object.switch_turn_left)  { bitmask_2 = bitmask.set(bitmask_2, bitmask.bit[7]); }

	if (object.input_air_suspension)     { bitmask_3 = bitmask.set(bitmask_3, bitmask.bit[0]); }
	if (object.input_hold_up_alarm)      { bitmask_3 = bitmask.set(bitmask_3, bitmask.bit[1]); }
	if (object.input_washer_fluid_level) { bitmask_3 = bitmask.set(bitmask_3, bitmask.bit[2]); }
	if (object.switch_lowbeam_2)         { bitmask_3 = bitmask.set(bitmask_3, bitmask.bit[3]); }
	if (object.switch_lowbeam_1)         { bitmask_3 = bitmask.set(bitmask_3, bitmask.bit[4]); }
	if (object.clamp_15)                 { bitmask_3 = bitmask.set(bitmask_3, bitmask.bit[5]); }
	if (object.input_engine_failsafe)    { bitmask_3 = bitmask.set(bitmask_3, bitmask.bit[6]); }
	if (object.input_tire_defect)        { bitmask_3 = bitmask.set(bitmask_3, bitmask.bit[7]); }

	// if (object.)                         { bitmask_4 = bitmask.set(bitmask_4, bitmask.bit[0]); }
	// if (object.)                         { bitmask_4 = bitmask.set(bitmask_4, bitmask.bit[1]); }
	if (object.output_license_rear_left)    { bitmask_4 = bitmask.set(bitmask_4, bitmask.bit[2]); }
	if (object.output_brake_rear_left)      { bitmask_4 = bitmask.set(bitmask_4, bitmask.bit[3]); }
	if (object.output_brake_rear_right)     { bitmask_4 = bitmask.set(bitmask_4, bitmask.bit[4]); }
	if (object.output_highbeam_front_right) { bitmask_4 = bitmask.set(bitmask_4, bitmask.bit[5]); }
	if (object.output_highbeam_front_left)  { bitmask_4 = bitmask.set(bitmask_4, bitmask.bit[6]); }
	// if (object.)                         { bitmask_4 = bitmask.set(bitmask_4, bitmask.bit[7]); }

	if (object.output_standing_front_left)       { bitmask_5 = bitmask.set(bitmask_5, bitmask.bit[0]); }
	if (object.output_standing_inner_rear_left)  { bitmask_5 = bitmask.set(bitmask_5, bitmask.bit[1]); }
	if (object.output_fog_front_left)            { bitmask_5 = bitmask.set(bitmask_5, bitmask.bit[2]); }
	if (object.output_reverse_rear_left)         { bitmask_5 = bitmask.set(bitmask_5, bitmask.bit[3]); }
	if (object.output_lowbeam_front_left)        { bitmask_5 = bitmask.set(bitmask_5, bitmask.bit[4]); }
	if (object.output_lowbeam_front_right)       { bitmask_5 = bitmask.set(bitmask_5, bitmask.bit[5]); }
	if (object.output_fog_front_right)           { bitmask_5 = bitmask.set(bitmask_5, bitmask.bit[6]); }
	if (object.output_fog_rear_trailer)          { bitmask_5 = bitmask.set(bitmask_5, bitmask.bit[7]); }

	// if (object.)                         { bitmask_6 = bitmask.set(bitmask_6, bitmask.bit[0]); }
	if (object.input_vertical_aim)          { bitmask_6 = bitmask.set(bitmask_6, bitmask.bit[1]); }
	if (object.output_license_rear_right)   { bitmask_6 = bitmask.set(bitmask_6, bitmask.bit[2]); }
	if (object.output_standing_rear_left)   { bitmask_6 = bitmask.set(bitmask_6, bitmask.bit[3]); }
	if (object.output_brake_rear_middle)    { bitmask_6 = bitmask.set(bitmask_6, bitmask.bit[4]); }
	if (object.output_standing_front_right) { bitmask_6 = bitmask.set(bitmask_6, bitmask.bit[5]); }
	if (object.output_turn_front_right)     { bitmask_6 = bitmask.set(bitmask_6, bitmask.bit[6]); }
	if (object.output_turn_rear_left)       { bitmask_6 = bitmask.set(bitmask_6, bitmask.bit[7]); }

	// if (object.)                              { bitmask_7 = bitmask.set(bitmask_7, bitmask.bit[0]); }
	if (object.output_turn_rear_right)           { bitmask_7 = bitmask.set(bitmask_7, bitmask.bit[1]); }
	if (object.output_fog_rear_left)             { bitmask_7 = bitmask.set(bitmask_7, bitmask.bit[2]); }
	if (object.output_standing_inner_rear_right) { bitmask_7 = bitmask.set(bitmask_7, bitmask.bit[3]); }
	if (object.output_standing_rear_right)       { bitmask_7 = bitmask.set(bitmask_7, bitmask.bit[4]); }
	if (object.output_turn_trailer_left)         { bitmask_7 = bitmask.set(bitmask_7, bitmask.bit[5]); }
	if (object.output_turn_front_left)           { bitmask_7 = bitmask.set(bitmask_7, bitmask.bit[6]); }
	if (object.output_reverse_rear_right)        { bitmask_7 = bitmask.set(bitmask_7, bitmask.bit[7]); }

	if (object.mode_failsafe)               { bitmask_8 = bitmask.set(bitmask_8, bitmask.bit[0]); }
	// if (object.)                         { bitmask_8 = bitmask.set(bitmask_8, bitmask.bit[1]); }
	if (object.output_led_switch_hazard)    { bitmask_8 = bitmask.set(bitmask_8, bitmask.bit[2]); }
	if (object.output_led_switch_light)     { bitmask_8 = bitmask.set(bitmask_8, bitmask.bit[3]); }
	// if (object.)                         { bitmask_8 = bitmask.set(bitmask_8, bitmask.bit[4]); }
	if (object.output_reverse_rear_trailer) { bitmask_8 = bitmask.set(bitmask_8, bitmask.bit[5]); }
	if (object.mode_sleep)                  { bitmask_8 = bitmask.set(bitmask_8, bitmask.bit[6]); }
	// if (object.)                         { bitmask_8 = bitmask.set(bitmask_8, bitmask.bit[7]); }

	// Suspect
	// object.clamp_58g

	// Assemble the output array
	io_set([
		bitmask_0,  bitmask_1,  bitmask_2,  bitmask_3,  bitmask_4,  bitmask_5,  bitmask_6,  bitmask_7,
		bitmask_8,  bitmask_9,  bitmask_10, bitmask_11, bitmask_12, bitmask_13, bitmask_14, bitmask_15,
		bitmask_16, bitmask_17, bitmask_18, bitmask_19, bitmask_20, bitmask_21, bitmask_22, bitmask_23,
		bitmask_24, bitmask_25, bitmask_26, bitmask_27, bitmask_28, bitmask_29, bitmask_30, bitmask_31,
	]);
}

// Send 'Set IO status' message to LCM
function io_set(packet) {
	log.module({ msg : 'Setting IO status' });

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
	// Determine dimmer value from config, depending if lowbeams are on
	let reset_dimmer_val;
	switch (status.lights.auto.lowbeam) {
		case true  : reset_dimmer_val = config.lights.dimmer.lights_on; break;
		case false : reset_dimmer_val = config.lights.dimmer.lights_off;
	}

	// Object of autolights related values
	let io_object_auto_lights = {
		dimmer_value_1                   : reset_dimmer_val,
		output_standing_front_left       : true,
		output_standing_front_right      : true,
		output_standing_inner_rear_left  : true,
		output_standing_inner_rear_right : true,
		output_standing_rear_left        : true,
		output_standing_rear_right       : true,
		switch_fog_rear                  : true, // To leverage the IKE LED as a status indicator
		switch_lowbeam_1                 : status.lights.auto.lowbeam,
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
	let src;
	let msg;

	log.module({ msg : 'Requesting \'' + value + '\'' });

	switch (value) {
		case 'coding':
			coding_get();
			break;

		case 'dimmer':
			src = 'BMBT';
			msg = [ 0x5D ];
			break;

		case 'identity':
			identity_get();
			break;

		case 'io-status':
			src = 'DIA';
			msg = [ 0x0B, 0x00 ]; // Get IO status
			break;

		case 'light-status':
			src = 'GT';
			msg = [ 0x5A ];
			break;

		case 'vehicledata':
			src = 'IKE';
			msg = [ 0x53 ];
	}

	bus.data.send({
		src : src,
		msg : msg,
	});
}

// Parse data sent from LCM module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x54: // Broadcast: vehicle data
			data.command = 'bro';
			data.value   = 'vehicle data';
			decode(data); // Decode it
			break;

		case 0x5B: // Broadcast: light status
			data.command = 'bro';
			data.value   = 'light status';
			decode(data); // Decode it
			break;

		case 0x5C: // Broadcast: light dimmer status
			data.command = 'bro';
			data.value   = 'dimmer 3 : ' + status.lights.dimmer_value_3;
			update.status('lights.dimmer_value_3', data.msg[1]);
			break;

		case 0xA0: // Reply to DIA: success
			data.command = 'rep';

			switch (data.msg.length) {
				case 33:
					data.command = 'bro';
					data.value   = 'io-status';
					decode(data); // Decode it
					break;

				case 13:
					data.command = 'bro';
					data.value   = 'io-status';
					decode(data); // Decode it
					break;

				case 1:
					data.value = 'ACK';
					break;

				default:
					data.value = Buffer.from(data.msg);
			}
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
	}

	log.bus(data);
}

// Welcome lights on unlocking/locking
function welcome_lights(action) {
	// Disable welcome lights if ignition is not fully off
	if (status.vehicle.ignition_level !== 0) action = false;

	log.module({ msg : 'Welcome lights: ' + action });

	switch (action) {
		case true :
			// Set status var to true
			update.status('lights.welcome_lights', action);

			// Send configured welcome lights
			io_encode(config.lights.welcome_lights);

			// Increment welcome lights counter
			LCM.counter_welcome_lights++;

			// Clear welcome lights status after 15 seconds
			LCM.timeouts.lights_welcome = setTimeout(() => {
				// If we're not over the configured welcome lights limit yet
				if (LCM.counter_welcome_lights <= (config.lights.welcome_lights_sec)) { LCM.welcome_lights(true); }
				else { LCM.welcome_lights(false); }
			}, 1000);
			break;

		case false:
			// Clear any remaining timeout(s)
			clearTimeout(LCM.timeouts.lights_welcome);

			// Reset welcome lights counter
			LCM.counter_welcome_lights = 0;

			// Set status var back to false
			update.status('lights.welcome_lights', action);

			// Send empty object to turn off all LCM outputs (if vehicle is off)
			if (status.vehicle.ignition_level === 0) io_encode({});
			break;
	}
}

// Configure event listeners
function init_listeners() {
	// Refresh data on IKE event
	IKE.on('obc-refresh', () => {
		request('vehicledata');
		request('light-status');
		request('dimmer');
		request('io-status');
	});

	// Enable/disable welcome lights on GM keyfob event
	GM.on('keyfob', (keyfob) => {
		log.module({ msg : 'Received GM keyfob event' });
		if (keyfob.button !== 'none') welcome_lights((keyfob.button === 'unlock'));
	});
}


module.exports = {
	// Timeout variables
	timeouts : {
		lights_auto    : null,
		lights_welcome : null,
	},

	counter_welcome_lights : 0,

	// Functions
	auto_lights         : auto_lights,
	auto_lights_process : auto_lights_process,
	comfort_turn_flash  : comfort_turn_flash,
	init_listeners      : init_listeners,
	io_encode           : io_encode,
	parse_out           : parse_out,
	request             : request,
	set_backlight       : set_backlight,
	welcome_lights      : welcome_lights,
};
