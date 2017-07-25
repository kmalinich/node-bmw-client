const module_name = __filename.slice(__dirname.length + 1, -3);

const suncalc = require('suncalc');
const now     = require('performance-now');

// Handle incoming commands from API
function api_command(data) {
	if (typeof data['lcm-get'] !== 'undefined') {
		LCM.request('io-status');
	}
	else {
		// Dirty assumption
		io_encode(data);
	}
}

// Automatic lights handling
function auto_lights(override = false) {
	let action = true;

	if (config.lights.auto !== true && override === false) return;

	if (override === true) action = false;

	if (status.vehicle.ignition_level < 3) action = false;

	if (action === false) io_encode({});

	if (LCM.status_lights_auto === action) return;

	log.change({
		src   : module_name,
		value : 'Auto lights',
		old   : LCM.status_lights_auto,
		new   : action,
	});

	switch (action) {
		case false:
			io_encode({});
			if (LCM.timeouts.lights_auto !== null) {
				clearTimeout(LCM.timeouts.lights_auto);
				LCM.timeouts.lights_auto = null;
				log.module({ src : module_name, msg : 'Unset autolights timeout' });
			}

			// Set status variables
			LCM.status_lights_auto = false;

			update.status('lights.auto.reason',  null);
			update.status('lights.auto.lowbeam', false);
			break;
		case true:
			if (LCM.timeouts.lights_auto === null) {
				log.module({ src : module_name, msg : 'Set autolights timeout' });
			}

			// Set status variable
			LCM.status_lights_auto = true;

			// Process/send LCM data on 7 second timeout
			// LCM diag command timeout is 15 seconds
			auto_lights_process();
	}

	// Set status variable
	update.status('lights.auto.active', LCM.status_lights_auto);
}

// Logic based on location and time of day, determine if the low beams should be on
function auto_lights_process() {
	// Init variables
	let current_reason  = status.lights.auto.reason;
	let current_lowbeam = status.lights.auto.lowbeam;
	let current_time    = Date.now();
	let sun_times       = suncalc.getTimes(current_time, config.location.latitude, config.location.longitude);
	let lights_on       = sun_times.sunsetStart;
	let lights_off      = sun_times.sunriseEnd;

	// Debug logging
	// log.module({ src : module_name, msg : '   current : \''+current_time+'\'' });
	// log.module({ src : module_name, msg : ' lights_on : \''+lights_on+'\''    });
	// log.module({ src : module_name, msg : 'lights_off : \''+lights_off+'\''   });

	if (status.vehicle.ignition_level < 3) {
		auto_lights();
		return;
	}

	if (config.lights.auto !== true) {
		auto_lights();
		return;
	}

	// log.module({
	// 	src : module_name,
	// 	msg : 'Processing auto lights',
	// });

	// Check wipers
	if (status.gm.wipers.speed !== null && status.gm.wipers.speed != 'off') {
		status.lights.auto.reason  = 'wipers on';
		status.lights.auto.lowbeam = true;
	}
	// Check time of day
	else if (current_time < lights_off) {
		status.lights.auto.reason  = 'before dawn';
		status.lights.auto.lowbeam = true;
	}
	else if (current_time > lights_off && current_time < lights_on) {
		status.lights.auto.reason  = 'after dawn, before dusk';
		status.lights.auto.lowbeam = false;
	}
	else if (current_time > lights_on) {
		status.lights.auto.reason  = 'after dusk';
		status.lights.auto.lowbeam = true;
	}
	else {
		status.lights.auto.reason  = 'failsafe';
		status.lights.auto.lowbeam = true;
	}

	update.status('lights.auto.reason', current_reason);

	if (update.status('lights.auto.lowbeam', current_lowbeam)) {
		// Show autolights status in cluster
		IKE.text_override('AL: '+status.lights.auto.lowbeam);
	}

	reset();
	LCM.timeouts.lights_auto = setTimeout(auto_lights_process, 6000);
}

// Cluster/interior backlight
function set_backlight(value) {
	log.module({ src : module_name, msg : 'Setting backlight to '+value });

	bus_data.send({
		src: module_name,
		dst: 'GLO',
		msg: [0x5C, value.toString(16), 0x00]
	});
}

// Get LCM coding data
function coding_get() {
	// Get all 20 blocks of coding data
	for (let byte = 0; byte < 21; byte++) {
		bus_data.send({
			src: 'DIA',
			dst: module_name,
			msg: [0x08, byte],
		});
	}
}

// Comfort turn signal handling
function comfort_turn(data) {
	// Init variables
	let cluster_msg_outer;
	let action;

	// If comfort turn is not enabled
	if (config.lights.comfort_turn.enable !== true) return;

	// If comfort turn is not currently engaged
	if (status.lights.turn.left.comfort === true || status.lights.turn.right.comfort === true) {
		return;
	}

	// If we haven't passed the cooldown yet
	if (status.lights.turn.comfort_cool === false) {
		return;
	}

	if (data.before.left.active === false) { // left turn was previously off
		if (data.after.left.active && !data.after.right.active) { // left turn is now on, and right turn is now off
			status.lights.turn.left.depress = now();
			return;
		}
	}
	else { // left turn was previously on
		if (!data.after.left.active && !data.after.right.active) { // If left turn is now off and right turn is now off
			// If the time difference is less than 1000ms, fire comfort turn signal
			status.lights.turn.depress_elapsed = now()-status.lights.turn.left.depress;
			// log.module({ src : module_name, msg : 'Evaluating comfort turn after '+status.lights.turn.depress_elapsed+'ms' });
			if (status.lights.turn.depress_elapsed > 0 && status.lights.turn.depress_elapsed < 1000) {
				action = 'left';
			}
		}
	}

	if (data.before.right.active === false) { // right turn was previously off
		if (!data.after.left.active && data.after.right.active) { // left turn is now off, and right turn is now on
			status.lights.turn.right.depress = now();
			return;
		}
	}
	else { // right turn was previously on
		if (!data.after.left.active && !data.after.right.active) { // If left turn is now off and right turn is now off
			// If the time difference is less than 1000ms, fire comfort turn signal
			status.lights.turn.depress_elapsed = now()-status.lights.turn.right.depress;
			// log.module({ src : module_name, msg : 'Evaluating comfort turn after '+status.lights.turn.depress_elapsed+'ms' });
			if (status.lights.turn.depress_elapsed > 0 && status.lights.turn.depress_elapsed < 1000) {
				action = 'right';
			}
		}
	}

	if (action === 'left' || action === 'right') {
		log.module({ src : module_name, msg : 'Comfort turn: '+action });

		switch (action) {
			case 'left':
				// Set status variables
				status.lights.turn.left.comfort  = true;
				status.lights.turn.right.comfort = false;
				cluster_msg_outer = '< < < < < < <';
				break;

			case 'right':
				// Set status variables
				status.lights.turn.left.comfort  = false;
				status.lights.turn.right.comfort = true;
				cluster_msg_outer = '> > > > > > >';
		}

		// Send cluster message if configured to do so
		if (config.lights.comfort_turn.cluster_msg === true) {
			// Concat message string
			cluster_msg = cluster_msg_outer+' '+action.charAt(0).toUpperCase()+' '+cluster_msg_outer;

			IKE.text_override(cluster_msg, 2000+status.lights.turn.depress_elapsed, action, true);
		}

		reset();
		status.lights.turn.comfort_cool = false;

		// Turn off comfort turn signal - 1 blink ~ 500ms, so 5x blink ~ 2500ms
		setTimeout(() => {
			log.module({ src : module_name, msg : 'Comfort turn: off' });
			// Set status variables
			status.lights.turn.left.comfort  = false;
			status.lights.turn.right.comfort = false;
			reset();
		}, (300*config.lights.comfort_turn.flashes)+status.lights.turn.depress_elapsed); // Subtract the time from the initial blink

		// Timeout for cooldown period
		setTimeout(() => {
			log.module({ src : module_name, msg : 'Comfort turn: cooldown done' });
			status.lights.turn.comfort_cool = true;
		}, (300*config.lights.comfort_turn.flashes)+status.lights.turn.depress_elapsed+1500); // Subtract the time from the initial blink
	}
}

// Decode various bits of data into usable information
function decode(data) {
	switch (data.msg[0]) {
		case 0x54: // Vehicle data
			// This message also has days since service and total kms, but, baby steps...
			let vin_string     = hex.h2a(data.msg[1].toString(16))+hex.h2a(data.msg[2].toString(16))+data.msg[3].toString(16)+data.msg[4].toString(16)+data.msg[5].toString(16)[0];
			update.status('vehicle.vin', vin_string);
			break;

		case 0x5B: // Decode a light status message from the LCM and act upon the results
			// Send data to comfort turn function
			comfort_turn({
				before : status.lights.turn,
				after : {
					left  : {
						active : bitmask.test(data.msg[1], bitmask.bit[5]),
					},
					right : {
						active : bitmask.test(data.msg[1], bitmask.bit[6]),
					},
				},
			});

			// On
			update.status('lights.all_off', !Boolean(data.msg[1]));

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
			update.status('lights.faulty.all_ok', !Boolean(data.msg[2]));

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

		case 0xA0: // Decode IO status and output true/false values
			// Remove command byte
			data.msg = data.msg.slice(1);

			// Set raw IO status bitmask data
			status.lcm.io = data.msg;

			// let bitmask_18 = array[19]; // Something

			update.status('lcm.dimmer.value_2', data.msg[15]);

			update.status('lcm.voltage.terminal_30',        parseFloat((data.msg[9]*.0708).toFixed(2)));
			update.status('lcm.voltage.flash_to_pass',      parseFloat(data.msg[29]/51));
			update.status('lcm.voltage.turn_signal_switch', parseFloat(data.msg[30]/51));

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
	// log.module({ src : module_name, msg : 'Setting IO status' });

	packet.unshift(0x0C);
	bus_data.send({
		src: 'DIA',
		dst: module_name,
		msg: packet,
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
		case true:
			reset_dimmer_val = config.lights.dimmer.lights_on;
			break;
		case false:
			reset_dimmer_val = config.lights.dimmer.lights_off;
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
	let cmd;

	log.bus({
		bus : 'node',
		src : {
			name : 'NODE',
		},
		dst : {
			name : module_name,
		},
		command : 'req',
		value : value,
	});

	switch (value) {
		case 'coding':
			get_coding();
			break;
		case 'dimmer':
			src = 'BMBT';
			cmd = [0x5D];
			break;
		case 'io-status':
			src = 'DIA';
			cmd = [0x0B, 0x00]; // Get IO status
			break;
		case 'light-status':
			src = 'GT';
			cmd = [0x5A];
			break;
		case 'vehicledata':
			src = 'IKE';
			cmd = [0x53];
	}

	bus_data.send({
		src: src,
		dst: module_name,
		msg: cmd,
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
			status.lights.dimmer_value_3 = data.msg[1];
			data.command = 'bro';
			data.value   = 'dimmer 3 : '+status.lights.dimmer_value_3;
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
	if (status.vehicle.ignition_level > 0 || status.lights.welcome_lights === action) return;

	switch (action) {
		case true :
			log.module({ src : module_name, msg : 'Welcome lights activating' });
			update.status('lights.welcome_lights', true);

			// Send configured welcome lights
			io_encode(config.lights.welcome_lights);

			// Clear welcome lights status after 15 seconds
			LCM.timeouts.lights_welcome = setTimeout(() => {
				update.status('lights.welcome_lights', false);
				// io_encode({});
			}, 15000);
			break;
		case false:
			clearTimeout(LCM.timeouts.lights_welcome);
			update.status('lights.welcome_lights', false);
			io_encode({});
			break;
	}
}

module.exports = {
	// Variables
	counter_lights_welcome : null,

	timeouts : {
		lights_auto    : null,
		lights_welcome : null,
	},

	status_lights_auto : false,

	// Functions
	api_command         : (data) => { api_command(data);         },
	auto_lights         : (data) => { auto_lights(data);         },
	auto_lights_process : (data) => { auto_lights_process(data); },
	parse_out           : (data) => { parse_out(data);           },
	request             : (data) => { request(data);             },
	set_backlight       : (data) => { set_backlight(data);       },
	welcome_lights      : (data) => { welcome_lights(data);      },
};
