var module_name = __filename.slice(__dirname.length + 1, -3);

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
	var action = true;
	if (config.lights.auto !== true && override === false) return;
	if (override === true) var action = false;
	if (status.vehicle.ignition_level < 3   ) var action = false;
	if (action === false                    ) io_encode({});
	if (status.lights.auto.active === action) return;

	log.change({
		src   : module_name,
		value : 'Auto lights',
		old   : status.lights.auto.active,
		new   : action,
	});

	switch (action) {
		case false:
			io_encode({});
			if (LCM.timeout_lights_auto !== null) {
				clearTimeout(LCM.timeout_lights_auto);
				LCM.timeout_lights_auto = null;
				log.module({ src : module_name, msg : 'Cleared autolights timeout' });
			}

			// Set status variables
			status.lights.auto.reason  = null;
			status.lights.auto.active  = false;
			status.lights.auto.lowbeam = false;
			break;
		case true:
			// Set status variable
			status.lights.auto.active = true;

			// Process/send LCM data on 7 second timeout
			// LCM diag command timeout is 15 seconds
			auto_lights_process();
	}
}

// Logic based on location and time of day, determine if the low beams should be on
function auto_lights_process() {
	// Init variables
	var current_reason  = status.lights.auto.reason;
	var current_lowbeam = status.lights.auto.lowbeam;
	var current_time    = Date.now();
	var sun_times       = suncalc.getTimes(current_time, config.location.latitude, config.location.longitude);
	var lights_on       = sun_times.sunsetStart;
	var lights_off      = sun_times.sunriseEnd;

	// Debug logging
	// log.module({ src : module_name, msg : '   current : \''+current_time+'\'' });
	// log.module({ src : module_name, msg : ' lights_on : \''+lights_on+'\''    });
	// log.module({ src : module_name, msg : 'lights_off : \''+lights_off+'\''   });

	if (status.vehicle.ignition_level < 3) {
		auto_lights();
		return;
	}

	log.module({
		src : module_name,
		msg : 'Processing auto lights',
	});

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

	if (current_reason != status.lights.auto.reason) {
		log.change({
			src   : module_name,
			value : 'Auto lights reason',
			old   : current_reason,
			new   : status.lights.auto.reason,
		});
	}

	if (current_lowbeam != status.lights.auto.lowbeam) {
		log.change({
			src   : module_name,
			value : 'Auto lights lowbeam',
			old   : current_lowbeam,
			new   : status.lights.auto.lowbeam,
		});

		if (status.lights.auto.lowbeam === true) { var status_string = 'on'; } else { var status_string = 'off'; }
		// Show status+reason in cluster
		IKE.text_override('AL '+status_string+': '+status.lights.auto.reason);
	}

	reset();
	LCM.timeout_lights_auto = setTimeout(auto_lights_process, 7000);
}

// Cluster/interior backlight
function set_backlight(value) {
	log.module({ src : module_name, msg : 'Setting backlighting to '+value });
	socket.data_send({
		src: module_name,
		dst: 'GLO',
		msg: [0x5C, value.toString(16), 0x00]
	});
}

// Get LCM coding data
function coding_get() {
	// Get all 20 blocks of coding data
	for (var byte = 0; byte < 21; byte++) {
		socket.data_send({
			src: 'DIA',
			dst: module_name,
			msg: [0x08, byte],
		});
	}
}

// Comfort turn signal handling
function comfort_turn(data) {
	// Init variables
	var cluster_msg_outer;
	var action;

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
				cluster_msg_outer = '< < < < < < < < <';
				break;

			case 'right':
				// Set status variables
				status.lights.turn.left.comfort  = false;
				status.lights.turn.right.comfort = true;
				cluster_msg_outer = '> > > > > > > > >';
		}

		// Concat message string
		cluster_msg = cluster_msg_outer+' '+action.charAt(0).toUpperCase()+' '+cluster_msg_outer;

		status.lights.turn.comfort_cool = false;
		IKE.text_override(cluster_msg, 2000+status.lights.turn.depress_elapsed, action, true);
		reset();

		// Turn off comfort turn signal - 1 blink ~ 500ms, so 5x blink ~ 2500ms
		setTimeout(() => {
			log.module({ src : module_name, msg : 'Comfort turn: off' });
			// Set status variables
			status.lights.turn.left.comfort  = false;
			status.lights.turn.right.comfort = false;
			reset();
		}, 1500+status.lights.turn.depress_elapsed); // Subtract the time from the initial blink

		// Timeout for cooldown period
		setTimeout(() => {
			log.module({ src : module_name, msg : 'Comfort turn: cooldown done' });
			status.lights.turn.comfort_cool = true;
		}, 3000+status.lights.turn.depress_elapsed); // Subtract the time from the initial blink
	}
}

// Decode various bits of data into usable information
function decode(data) {
	switch (data.msg[0]) {
		case 0x54: // Vehicle data
			// This message also has days since service and total kms, but, baby steps...
			var vin_string     = hex.h2a(data.msg[1].toString(16))+hex.h2a(data.msg[2].toString(16))+data.msg[3].toString(16)+data.msg[4].toString(16)+data.msg[5].toString(16)[0];
			status.vehicle.vin = vin_string;
			log.module({
				src : module_name,
				msg : 'VIN: \''+vin_string+'\'',
			});
			break;

		case 0x5B: // Decode a light status message from the LCM and act upon the results
			// Send data to comfort turn function
			comfort_turn({
				before : status.lights.turn,
				after : {
					left  : {
						active : bitmask.bit_test(data.msg[1], bitmask.bit[5]),
					},
					right : {
						active : bitmask.bit_test(data.msg[1], bitmask.bit[6]),
					},
				},
			});

			// On
			status.lights.all_off = !Boolean(data.msg[1]);

			status.lights.standing.front    = bitmask.bit_test(data.msg[1], bitmask.bit[0]);
			status.lights.lowbeam           = bitmask.bit_test(data.msg[1], bitmask.bit[1]);
			status.lights.highbeam          = bitmask.bit_test(data.msg[1], bitmask.bit[2]);
			status.lights.fog.front         = bitmask.bit_test(data.msg[1], bitmask.bit[3]);
			status.lights.fog.rear          = bitmask.bit_test(data.msg[1], bitmask.bit[4]);
			status.lights.turn.left.active  = bitmask.bit_test(data.msg[1], bitmask.bit[5]);
			status.lights.turn.right.active = bitmask.bit_test(data.msg[1], bitmask.bit[6]);
			status.lights.turn.fast         = bitmask.bit_test(data.msg[1], bitmask.bit[7]);

			status.lights.brake            = bitmask.bit_test(data.msg[3], bitmask.bit[1]);
			status.lights.turn.sync        = bitmask.bit_test(data.msg[3], bitmask.bit[2]);
			status.lights.standing.rear    = bitmask.bit_test(data.msg[3], bitmask.bit[3]);
			status.lights.trailer.standing = bitmask.bit_test(data.msg[3], bitmask.bit[4]);
			status.lights.reverse          = bitmask.bit_test(data.msg[3], bitmask.bit[5]);
			status.lights.trailer.reverse  = bitmask.bit_test(data.msg[3], bitmask.bit[6]);
			status.lights.hazard           = bitmask.bit_test(data.msg[3], bitmask.bit[7]);

			// Faulty
			status.lights.faulty.all_ok = !Boolean(data.msg[2]);

			status.lights.faulty.standing.front = bitmask.bit_test(data.msg[2], bitmask.bit[0]);
			status.lights.faulty.lowbeam        = bitmask.bit_test(data.msg[2], bitmask.bit[1]);
			status.lights.faulty.highbeam       = bitmask.bit_test(data.msg[2], bitmask.bit[2]);
			status.lights.faulty.fog.front      = bitmask.bit_test(data.msg[2], bitmask.bit[3]);
			status.lights.faulty.fog.rear       = bitmask.bit_test(data.msg[2], bitmask.bit[4]);
			status.lights.faulty.turn.left      = bitmask.bit_test(data.msg[2], bitmask.bit[5]);
			status.lights.faulty.turn.right     = bitmask.bit_test(data.msg[2], bitmask.bit[6]);
			status.lights.faulty.license_plate  = bitmask.bit_test(data.msg[2], bitmask.bit[7]);

			status.lights.faulty.brake.right         = bitmask.bit_test(data.msg[4], bitmask.bit[0]);
			status.lights.faulty.brake.left          = bitmask.bit_test(data.msg[4], bitmask.bit[1]);
			status.lights.faulty.standing.rear.right = bitmask.bit_test(data.msg[4], bitmask.bit[2]);
			status.lights.faulty.standing.rear.left  = bitmask.bit_test(data.msg[4], bitmask.bit[3]);
			status.lights.faulty.lowbeam.right       = bitmask.bit_test(data.msg[4], bitmask.bit[4]);
			status.lights.faulty.lowbeam.left        = bitmask.bit_test(data.msg[4], bitmask.bit[5]);

			// log.module({ src : module_name, msg : 'Decoded light status' });
			break;

		case 0xA0: // Decode IO status and output true/false values
			// Remove command byte
			data.msg.shift();

			// Set raw IO status bitmask data
			status.lcm.io = data.msg;

			// var bitmask_18 = array[19]; // Something

			status.lcm.dimmer.value_2 = data.msg[15];

			status.lcm.voltage.terminal_30        = parseFloat(data.msg[9]*.0708);
			status.lcm.voltage.flash_to_pass      = parseFloat(data.msg[29]/51);
			status.lcm.voltage.turn_signal_switch = parseFloat(data.msg[30]/51);

			// Bitmasks
			status.lcm.clamp.c_30a = bitmask.bit_test(data.msg[0], bitmask.bit[0]);
			status.lcm.clamp.c_15  = bitmask.bit_test(data.msg[3], bitmask.bit[5]);
			status.lcm.clamp.c_r   = bitmask.bit_test(data.msg[0], bitmask.bit[6]);
			status.lcm.clamp.c_30b = bitmask.bit_test(data.msg[0], bitmask.bit[7]);

			status.lcm.input.fire_extinguisher         = bitmask.bit_test(data.msg[0], bitmask.bit[1]);
			status.lcm.input.preheating_fuel_injection = bitmask.bit_test(data.msg[0], bitmask.bit[2]);
			status.lcm.input.carb                      = bitmask.bit_test(data.msg[0], bitmask.bit[4]);

			status.lcm.input.key_in_ignition   = bitmask.bit_test(data.msg[1], bitmask.bit[0]);
			status.lcm.input.seat_belts_lock   = bitmask.bit_test(data.msg[1], bitmask.bit[1]);
			status.lcm.input.kfn               = bitmask.bit_test(data.msg[1], bitmask.bit[5]);
			status.lcm.input.armoured_door     = bitmask.bit_test(data.msg[1], bitmask.bit[6]);
			status.lcm.input.brake_fluid_level = bitmask.bit_test(data.msg[1], bitmask.bit[7]);

			status.lcm.input.air_suspension     = bitmask.bit_test(data.msg[3], bitmask.bit[0]);
			status.lcm.input.hold_up_alarm      = bitmask.bit_test(data.msg[3], bitmask.bit[1]);
			status.lcm.input.washer_fluid_level = bitmask.bit_test(data.msg[3], bitmask.bit[2]);
			status.lcm.input.engine_failsafe    = bitmask.bit_test(data.msg[3], bitmask.bit[6]);
			status.lcm.input.tire_defect        = bitmask.bit_test(data.msg[3], bitmask.bit[7]);

			status.lcm.input.vertical_aim = bitmask.bit_test(data.msg[6], bitmask.bit[1]);

			status.lcm.mode.failsafe = bitmask.bit_test(data.msg[8], bitmask.bit[0]);
			status.lcm.mode.sleep    = bitmask.bit_test(data.msg[8], bitmask.bit[6]);

			status.lcm.output.license.rear_left    = bitmask.bit_test(data.msg[4], bitmask.bit[2]);
			status.lcm.output.brake.rear_left      = bitmask.bit_test(data.msg[4], bitmask.bit[3]);
			status.lcm.output.brake.rear_right     = bitmask.bit_test(data.msg[4], bitmask.bit[4]);
			status.lcm.output.highbeam.front_right = bitmask.bit_test(data.msg[4], bitmask.bit[5]);
			status.lcm.output.highbeam.front_left  = bitmask.bit_test(data.msg[4], bitmask.bit[6]);

			status.lcm.output.standing.front_left      = bitmask.bit_test(data.msg[5], bitmask.bit[0]);
			status.lcm.output.standing.inner_rear_left = bitmask.bit_test(data.msg[5], bitmask.bit[1]);
			status.lcm.output.fog.front_left           = bitmask.bit_test(data.msg[5], bitmask.bit[2]);
			status.lcm.output.reverse.rear_left        = bitmask.bit_test(data.msg[5], bitmask.bit[3]);
			status.lcm.output.lowbeam.front_left       = bitmask.bit_test(data.msg[5], bitmask.bit[4]);
			status.lcm.output.lowbeam.front_right      = bitmask.bit_test(data.msg[5], bitmask.bit[5]);
			status.lcm.output.fog.front_right          = bitmask.bit_test(data.msg[5], bitmask.bit[6]);
			status.lcm.output.led.rear_fog             = bitmask.bit_test(data.msg[5], bitmask.bit[7]);

			status.lcm.output.license.rear_right   = bitmask.bit_test(data.msg[6], bitmask.bit[2]);
			status.lcm.output.standing.rear_left   = bitmask.bit_test(data.msg[6], bitmask.bit[3]);
			status.lcm.output.brake.rear_middle    = bitmask.bit_test(data.msg[6], bitmask.bit[4]);
			status.lcm.output.standing.front_right = bitmask.bit_test(data.msg[6], bitmask.bit[5]);
			status.lcm.output.turn.front_right     = bitmask.bit_test(data.msg[6], bitmask.bit[6]);
			status.lcm.output.turn.rear_left       = bitmask.bit_test(data.msg[6], bitmask.bit[7]);

			status.lcm.output.turn.rear_right           = bitmask.bit_test(data.msg[7], bitmask.bit[1]);
			status.lcm.output.fog.rear_left             = bitmask.bit_test(data.msg[7], bitmask.bit[2]);
			status.lcm.output.standing.inner_rear_right = bitmask.bit_test(data.msg[7], bitmask.bit[3]);
			status.lcm.output.standing.rear_right       = bitmask.bit_test(data.msg[7], bitmask.bit[4]);
			status.lcm.output.turn.side_left            = bitmask.bit_test(data.msg[7], bitmask.bit[5]);
			status.lcm.output.turn.front_left           = bitmask.bit_test(data.msg[7], bitmask.bit[6]);
			status.lcm.output.reverse.rear_right        = bitmask.bit_test(data.msg[7], bitmask.bit[7]);

			status.lcm.output.led.switch_hazard    = bitmask.bit_test(data.msg[8], bitmask.bit[2]);
			status.lcm.output.led.switch_light     = bitmask.bit_test(data.msg[8], bitmask.bit[3]);
			status.lcm.output.reverse.rear_trailer = bitmask.bit_test(data.msg[8], bitmask.bit[5]);

			status.lcm.switch.hazard         = bitmask.bit_test(data.msg[1], bitmask.bit[4]);
			status.lcm.switch.highbeam_flash = bitmask.bit_test(data.msg[1], bitmask.bit[2]);

			status.lcm.switch.brake      = bitmask.bit_test(data.msg[2], bitmask.bit[0]);
			status.lcm.switch.highbeam   = bitmask.bit_test(data.msg[2], bitmask.bit[1]);
			status.lcm.switch.fog_front  = bitmask.bit_test(data.msg[2], bitmask.bit[2]);
			status.lcm.switch.fog_rear   = bitmask.bit_test(data.msg[2], bitmask.bit[4]);
			status.lcm.switch.standing   = bitmask.bit_test(data.msg[2], bitmask.bit[5]);
			status.lcm.switch.turn_right = bitmask.bit_test(data.msg[2], bitmask.bit[6]);
			status.lcm.switch.turn_left  = bitmask.bit_test(data.msg[2], bitmask.bit[7]);

			status.lcm.switch.lowbeam_1 = bitmask.bit_test(data.msg[3], bitmask.bit[4]);
			status.lcm.switch.lowbeam_2 = bitmask.bit_test(data.msg[3], bitmask.bit[3]);

			// log.module({ src : module_name, msg : 'Decoded IO status' });
	}
}

// Encode the LCM bitmask string from an input of true/false values
function io_encode(object) {
	// Initialize bitmask variables
	var bitmask_0  = 0;
	var bitmask_1  = 0;
	var bitmask_2  = 0;
	var bitmask_3  = 0;
	var bitmask_4  = 0;
	var bitmask_5  = 0;
	var bitmask_6  = 0;
	var bitmask_7  = 0;
	var bitmask_8  = 0;
	var bitmask_9  = 0;
	var bitmask_10 = 0;
	var bitmask_11 = 0;
	var bitmask_12 = 0;
	var bitmask_13 = 0;
	var bitmask_14 = 0;
	var bitmask_15 = 0; // dimmer_value_2
	var bitmask_16 = 0; // Something to do with autoleveling
	var bitmask_17 = 0;
	var bitmask_18 = 0;
	var bitmask_19 = 0;
	var bitmask_20 = 0;
	var bitmask_21 = 0;
	var bitmask_22 = 0;
	var bitmask_23 = 0; // Something to do with autoleveling
	var bitmask_24 = 0; // Something to do with autoleveling
	var bitmask_25 = 0;
	var bitmask_26 = 0;
	var bitmask_27 = 0;
	var bitmask_28 = 0;
	var bitmask_29 = 0;
	var bitmask_30 = 0;
	var bitmask_31 = 0;

	// LCM dimmer
	if (object.dimmer_value_1) { bitmask_9 = parseInt(object.dimmer_value_1); }

	// Set the various bitmask values according to the input object
	if (object.clamp_30a)                       { bitmask_0 = bitmask.bit_set(bitmask_0, bitmask.bit[0]); }
	if (object.input_fire_extinguisher)         { bitmask_0 = bitmask.bit_set(bitmask_0, bitmask.bit[1]); }
	if (object.input_preheating_fuel_injection) { bitmask_0 = bitmask.bit_set(bitmask_0, bitmask.bit[2]); }
	// if (object.)                             { bitmask_0 = bitmask.bit_set(bitmask_0, bitmask.bit[3]); }
	if (object.input_carb)                      { bitmask_0 = bitmask.bit_set(bitmask_0, bitmask.bit[4]); }
	// if (object.)                             { bitmask_0 = bitmask.bit_set(bitmask_0, bitmask.bit[5]); }
	if (object.clamp_r)                         { bitmask_0 = bitmask.bit_set(bitmask_0, bitmask.bit[6]); }
	if (object.clamp_30b)                       { bitmask_0 = bitmask.bit_set(bitmask_0, bitmask.bit[7]); }

	if (object.input_key_in_ignition)   { bitmask_1 = bitmask.bit_set(bitmask_1, bitmask.bit[0]); }
	if (object.input_seat_belts_lock)   { bitmask_1 = bitmask.bit_set(bitmask_1, bitmask.bit[1]); }
	if (object.switch_highbeam_flash)   { bitmask_1 = bitmask.bit_set(bitmask_1, bitmask.bit[2]); }
	// if (object.)                     { bitmask_1 = bitmask.bit_set(bitmask_1, bitmask.bit[3]); }
	if (object.switch_hazard)           { bitmask_1 = bitmask.bit_set(bitmask_1, bitmask.bit[4]); }
	if (object.input_kfn)               { bitmask_1 = bitmask.bit_set(bitmask_1, bitmask.bit[5]); }
	if (object.input_armoured_door)     { bitmask_1 = bitmask.bit_set(bitmask_1, bitmask.bit[6]); }
	if (object.input_brake_fluid_level) { bitmask_1 = bitmask.bit_set(bitmask_1, bitmask.bit[7]); }

	if (object.switch_brake)      { bitmask_2 = bitmask.bit_set(bitmask_2, bitmask.bit[0]); }
	if (object.switch_highbeam)   { bitmask_2 = bitmask.bit_set(bitmask_2, bitmask.bit[1]); }
	if (object.switch_fog_front)  { bitmask_2 = bitmask.bit_set(bitmask_2, bitmask.bit[2]); }
	// if (object.)               { bitmask_2 = bitmask.bit_set(bitmask_2, bitmask.bit[3]); }
	if (object.switch_fog_rear)   { bitmask_2 = bitmask.bit_set(bitmask_2, bitmask.bit[4]); }
	if (object.switch_standing)   { bitmask_2 = bitmask.bit_set(bitmask_2, bitmask.bit[5]); }
	if (object.switch_turn_right) { bitmask_2 = bitmask.bit_set(bitmask_2, bitmask.bit[6]); }
	if (object.switch_turn_left)  { bitmask_2 = bitmask.bit_set(bitmask_2, bitmask.bit[7]); }

	if (object.input_air_suspension)     { bitmask_3 = bitmask.bit_set(bitmask_3, bitmask.bit[0]); }
	if (object.input_hold_up_alarm)      { bitmask_3 = bitmask.bit_set(bitmask_3, bitmask.bit[1]); }
	if (object.input_washer_fluid_level) { bitmask_3 = bitmask.bit_set(bitmask_3, bitmask.bit[2]); }
	if (object.switch_lowbeam_2)         { bitmask_3 = bitmask.bit_set(bitmask_3, bitmask.bit[3]); }
	if (object.switch_lowbeam_1)         { bitmask_3 = bitmask.bit_set(bitmask_3, bitmask.bit[4]); }
	if (object.clamp_15)                 { bitmask_3 = bitmask.bit_set(bitmask_3, bitmask.bit[5]); }
	if (object.input_engine_failsafe)    { bitmask_3 = bitmask.bit_set(bitmask_3, bitmask.bit[6]); }
	if (object.input_tire_defect)        { bitmask_3 = bitmask.bit_set(bitmask_3, bitmask.bit[7]); }

	// if (object.)                         { bitmask_4 = bitmask.bit_set(bitmask_4, bitmask.bit[0]); }
	// if (object.)                         { bitmask_4 = bitmask.bit_set(bitmask_4, bitmask.bit[1]); }
	if (object.output_license_rear_left)    { bitmask_4 = bitmask.bit_set(bitmask_4, bitmask.bit[2]); }
	if (object.output_brake_rear_left)      { bitmask_4 = bitmask.bit_set(bitmask_4, bitmask.bit[3]); }
	if (object.output_brake_rear_right)     { bitmask_4 = bitmask.bit_set(bitmask_4, bitmask.bit[4]); }
	if (object.output_highbeam_front_right) { bitmask_4 = bitmask.bit_set(bitmask_4, bitmask.bit[5]); }
	if (object.output_highbeam_front_left)  { bitmask_4 = bitmask.bit_set(bitmask_4, bitmask.bit[6]); }
	// if (object.)                         { bitmask_4 = bitmask.bit_set(bitmask_4, bitmask.bit[7]); }

	if (object.output_standing_front_left)       { bitmask_5 = bitmask.bit_set(bitmask_5, bitmask.bit[0]); }
	if (object.output_standing_inner_rear_left)  { bitmask_5 = bitmask.bit_set(bitmask_5, bitmask.bit[1]); }
	if (object.output_fog_front_left)            { bitmask_5 = bitmask.bit_set(bitmask_5, bitmask.bit[2]); }
	if (object.output_reverse_rear_left)         { bitmask_5 = bitmask.bit_set(bitmask_5, bitmask.bit[3]); }
	if (object.output_lowbeam_front_left)        { bitmask_5 = bitmask.bit_set(bitmask_5, bitmask.bit[4]); }
	if (object.output_lowbeam_front_right)       { bitmask_5 = bitmask.bit_set(bitmask_5, bitmask.bit[5]); }
	if (object.output_fog_front_right)           { bitmask_5 = bitmask.bit_set(bitmask_5, bitmask.bit[6]); }
	if (object.output_fog_rear_trailer)          { bitmask_5 = bitmask.bit_set(bitmask_5, bitmask.bit[7]); }

	// if (object.)                         { bitmask_6 = bitmask.bit_set(bitmask_6, bitmask.bit[0]); }
	if (object.input_vertical_aim)          { bitmask_6 = bitmask.bit_set(bitmask_6, bitmask.bit[1]); }
	if (object.output_license_rear_right)   { bitmask_6 = bitmask.bit_set(bitmask_6, bitmask.bit[2]); }
	if (object.output_standing_rear_left)   { bitmask_6 = bitmask.bit_set(bitmask_6, bitmask.bit[3]); }
	if (object.output_brake_rear_middle)    { bitmask_6 = bitmask.bit_set(bitmask_6, bitmask.bit[4]); }
	if (object.output_standing_front_right) { bitmask_6 = bitmask.bit_set(bitmask_6, bitmask.bit[5]); }
	if (object.output_turn_front_right)     { bitmask_6 = bitmask.bit_set(bitmask_6, bitmask.bit[6]); }
	if (object.output_turn_rear_left)       { bitmask_6 = bitmask.bit_set(bitmask_6, bitmask.bit[7]); }

	// if (object.)                              { bitmask_7 = bitmask.bit_set(bitmask_7, bitmask.bit[0]); }
	if (object.output_turn_rear_right)           { bitmask_7 = bitmask.bit_set(bitmask_7, bitmask.bit[1]); }
	if (object.output_fog_rear_left)             { bitmask_7 = bitmask.bit_set(bitmask_7, bitmask.bit[2]); }
	if (object.output_standing_inner_rear_right) { bitmask_7 = bitmask.bit_set(bitmask_7, bitmask.bit[3]); }
	if (object.output_standing_rear_right)       { bitmask_7 = bitmask.bit_set(bitmask_7, bitmask.bit[4]); }
	if (object.output_turn_trailer_left)         { bitmask_7 = bitmask.bit_set(bitmask_7, bitmask.bit[5]); }
	if (object.output_turn_front_left)           { bitmask_7 = bitmask.bit_set(bitmask_7, bitmask.bit[6]); }
	if (object.output_reverse_rear_right)        { bitmask_7 = bitmask.bit_set(bitmask_7, bitmask.bit[7]); }

	if (object.mode_failsafe)               { bitmask_8 = bitmask.bit_set(bitmask_8, bitmask.bit[0]); }
	// if (object.)                         { bitmask_8 = bitmask.bit_set(bitmask_8, bitmask.bit[1]); }
	if (object.output_led_switch_hazard)    { bitmask_8 = bitmask.bit_set(bitmask_8, bitmask.bit[2]); }
	if (object.output_led_switch_light)     { bitmask_8 = bitmask.bit_set(bitmask_8, bitmask.bit[3]); }
	// if (object.)                         { bitmask_8 = bitmask.bit_set(bitmask_8, bitmask.bit[4]); }
	if (object.output_reverse_rear_trailer) { bitmask_8 = bitmask.bit_set(bitmask_8, bitmask.bit[5]); }
	if (object.mode_sleep)                  { bitmask_8 = bitmask.bit_set(bitmask_8, bitmask.bit[6]); }
	// if (object.)                         { bitmask_8 = bitmask.bit_set(bitmask_8, bitmask.bit[7]); }

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
	socket.data_send({
		src: 'DIA',
		dst: module_name,
		msg: packet,
	});

	// Request the IO status after
	LCM.request('io-status');
}

// Make things.. how they should be?
function reset() {
	// Determine dimmer value from config, depending if lowbeams are on
	switch (status.lights.auto.lowbeam) {
		case true:
			var reset_dimmer_val = config.lights.dimmer.lights_on;
			break;
		case false:
			var reset_dimmer_val = config.lights.dimmer.lights_off;
	}

	// Object of autolights related values
	var io_object_auto_lights = {
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
	var io_object = {
		switch_turn_left  : status.lights.turn.left.comfort,
		switch_turn_right : status.lights.turn.right.comfort,
	};

	// If autolights are enabled, use ES6 object merge to use auto lights
	if (config.lights.auto === true) Object.assign(io_object, io_object_auto_lights);

	io_encode(io_object);
}

// Request various things from LCM
function request(value) {
	var src;
	var cmd;

	log.bus({
		bus : 'dbus',
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

	socket.data_send({
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

	log.change({
		src   : module_name,
		value : 'Welcome lights',
		old   : status.lights.welcome_lights,
		new   : action,
	});

	switch (action) {
		case true :
			log.module({ src : module_name, msg : 'Welcome lights activating' });
			status.lights.welcome_lights = true;

			// Send configured welcome lights
			io_encode(config.lights.welcome_lights);

			// Clear welcome lights status after 15 seconds
			LCM.timeout_lights_welcome = setTimeout(() => {
				log.module({ src : module_name, msg : 'Welcome lights timeout expired' });
				status.lights.welcome_lights = false;
				// io_encode({});
			}, 15000);
			break;
		case false:
			log.module({ src : module_name, msg : 'Welcome lights deactivating' });
			clearTimeout(LCM.timeout_lights_welcome);
			status.lights.welcome_lights = false;
			io_encode({});
			break;
	}
}

module.exports = {
	// Variables
	counter_lights_welcome  : null,
	timeout_lights_auto     : null,
	timeout_lights_welcome  : null,
	timeout_lights_welcome  : null,

	// Functions
	api_command    : (data) => { api_command(data);     },
	auto_lights    : (data) => { auto_lights(data);     },
	request        : (data) => { request(data);         },
	set_backlight  : (data) => { set_backlight(data);   },
	parse_out      : (data) => { parse_out(data);       },
	welcome_lights : (data) => { welcome_lights(data);  },
};
