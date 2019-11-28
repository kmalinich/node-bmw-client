import suncalc from 'suncalc';
import now     from 'performance-now';

import hex from '../share/hex.js';
import num from '../share/num.js';


// Automatic lights handling
function auto() {
	if (config.intf.ibus.enabled !== true) return;

	// Default action is true (enable/process auto lights)
	let action = true;

	// Return if auto lights are disabled in the config
	if (config.lcm.auto !== true) return;

	// Action is false if ignition is not in run
	if (status.vehicle.ignition_level < 3) action = false;

	switch (action) {
		case false : {
			io_encode({});

			if (LCM.timeout.auto !== null) {
				clearTimeout(LCM.timeout.auto);
				LCM.timeout.auto = null;
				log.module('Unset autolights timeout');
			}

			// Update status object
			update.status('lcm.auto.active',  false, false);
			update.status('lcm.auto.lowbeam', false, false);
			update.status('lcm.auto.reason',  null,  false);
			break;
		}

		case true : {
			if (LCM.timeout.auto === null) {
				log.module('Set autolights timeout');
			}

			// Update status object
			update.status('lcm.auto.active', true, false);

			auto_process();
		}
	}
}

// Logic based on location and time of day, determine if the low beams should be on
function auto_process() {
	if (config.intf.ibus.enabled !== true) return;

	// Init variables
	const times = {
		now : Date.now(),

		offset  : 0,
		weather : false,

		on  : null,
		off : null,
	};

	times.sun = suncalc.getTimes(times.now, config.location.latitude, config.location.longitude);

	// Factor in cloud cover to lights on/off time
	if (config.weather.apikey !== null) {
		status.weather.daily.data.forEach(value => {
			if (times.weather === true) return;

			// time / 1000 = epoch
			if ((Math.floor(times.now / 1000) - value.time) <= 0) {
				// Add 5 hours * current cloudCover value
				times.offset  = value.cloudCover * 5 * 60 * 60 * 1000;
				times.weather = true;
			}
		});
	}

	times.on  = new Date(times.sun.sunsetStart.getTime() - times.offset);
	times.off = new Date(times.sun.sunriseEnd.getTime()  + times.offset);

	// If ignition is not in run or auto lights are disabled in config, call auto() to clean up
	if (status.vehicle.ignition_level < 3 || config.lcm.auto !== true) return auto();


	let new_reason;
	let new_lowbeam;
	let night_percentage;

	// TODO: Find some other way to do this in another function or something. ELSE IS EVIL

	// Check wipers
	if (status.gm.wipers.speed !== null && status.gm.wipers.speed !== 'off' && status.gm.wipers.speed !== 'spray') {
		new_reason       = 'wipers on';
		new_lowbeam      = true;
		night_percentage = 1;
	}
	// Check time of day
	else if (times.now < times.off) {
		new_reason       = 'before dawn';
		new_lowbeam      = true;
		night_percentage = times.now / times.off;
	}
	else if (times.now > times.off && times.now < times.on) {
		new_reason       = 'after dawn, before dusk';
		new_lowbeam      = false;
		night_percentage = 0;
	}
	else if (times.now > times.on) {
		new_reason       = 'after dusk';
		new_lowbeam      = true;
		night_percentage = times.on / times.now;
	}
	else {
		new_reason       = 'failsafe';
		new_lowbeam      = true;
		night_percentage = 1;
	}

	Math.ceil(night_percentage * 100);

	update.status('lcm.auto.reason',           new_reason,       false);
	update.status('lcm.auto.night_percentage', night_percentage, false);

	if (update.status('lcm.auto.lowbeam', new_lowbeam, false)) {
		// Show autolights status in cluster
		IKE.text_override('AL: ' + status.lcm.auto.lowbeam);
	}

	reset();

	// Process/send LCM data on 5 second timeout (for safety)
	// LCM diag command timeout is 15 seconds
	// TODO: Move this value into config object
	LCM.timeout.auto = setTimeout(auto_process, 5000);
}

// Cluster/interior backlight
function set_backlight(value) {
	if (config.intf.ibus.enabled !== true) return;

	log.module('Setting backlight to ' + value);

	bus.data.send({
		src : 'LCM',
		dst : 'GLO',
		msg : [ 0x5C, value.toString(16), 0x00 ],
	});
}

// Get LCM coding data
function coding_get() {
	if (config.intf.ibus.enabled !== true) return;

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
	if (config.intf.ibus.enabled !== true) return;

	bus.data.send({
		src : 'DIA',
		msg : [ 0x00 ],
	});
}

// Comfort turn signal handling
function comfort_turn(data) {
	// If comfort turn is not enabled
	if (config.lcm.comfort_turn.enable !== true) return;

	// If comfort turn is not currently engaged
	if (status.lcm.turn.left.comfort === true || status.lcm.turn.right.comfort === true) return;

	// If we haven't passed the cooldown yet
	if (status.lcm.turn.comfort_cool === false) return;

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
	const mask = bitmask.check(data.after).mask;
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
	if (after !== null) update.status('lcm.turn.' + after + '.depress', now());

	// If NEITHER signal WAS active, or EITHER signal IS active, bounce
	// That way we only continue if we're going from ON to OFF
	if (before === null || after !== null) return;

	// Update the previously active signal's elapsed time
	update.status('lcm.turn.depress_elapsed', now() - status.lcm.turn[before].depress);

	// Attempt to fire comfort turn signal
	comfort_turn_flash(before);
}

function comfort_turn_flash(action) {
	// TODO: Make the time difference value configurable
	// If the time difference is more than the configured value, bounce
	if (status.lcm.turn.depress_elapsed >= 600) return;

	// Double-check the requested action
	if (action !== 'left' && action !== 'right') return;

	log.module('Comfort turn action: ' + action + ', elapsed: ' + status.lcm.turn.depress_elapsed);

	// Update status object, and prepare cluster message
	let cluster_msg_outer;
	switch (action) {
		case 'left' :
			// Update status object
			update.status('lcm.turn.left.comfort',  true,  false);
			update.status('lcm.turn.right.comfort', false, false);
			cluster_msg_outer = '< < < < < < <';
			break;

		case 'right' :
			// Update status object
			update.status('lcm.turn.left.comfort',  false, false);
			update.status('lcm.turn.right.comfort', true,  false);
			cluster_msg_outer = '> > > > > > >';
	}

	// Send cluster message if configured to do so
	if (config.lcm.comfort_turn.cluster_msg === true) {
		// Concat message string
		const cluster_msg = cluster_msg_outer + ' ' + action.charAt(0).toUpperCase() + ' ' + cluster_msg_outer;
		IKE.text_override(cluster_msg, 2000 + status.lcm.turn.depress_elapsed, action, true);
	}

	// Fire!
	reset();

	// Begin comfort turn cooldown period
	update.status('lcm.turn.comfort_cool', false, false);

	// Calculate timeout length, accounting for the time from the initial flash
	// 1 flash ~ 500ms, so 5x flash ~ 2500ms
	const timer_off  = (config.lcm.comfort_turn.flashes - 1) * 500;
	const timer_cool = timer_off + 1500; // Cooldown period ends 1.5s after last comfort turn

	log.module('Comfort turn timer: ' + timer_off + 'ms');

	// Timeout for turning off the comfort turn signal
	setTimeout(() => {
		// Update status object
		update.status('lcm.turn.left.comfort',  false, false);
		update.status('lcm.turn.right.comfort', false, false);
		reset();
	}, timer_off);

	// Timeout for comfort turn cooldown period
	setTimeout(() => { update.status('lcm.turn.comfort_cool', true, false); }, timer_cool);
}


// Encode the LCM bitmask string from an input of true/false values
function io_encode(object) {
	// Initialize bitmask variables
	const output = {
		b0 : bitmask.create({
			b0 : object.clamp_30a,
			b1 : object.input_fire_extinguisher,
			b2 : object.input_preheating_fuel_injection,
			b3 : false, // VGLESP
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
			b7 : object.output_fog_rear_right,
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
			b1 : false, // KL58G on
			b2 : object.output_led_switch_hazard,
			b3 : object.output_led_switch_light,
			b4 : object.output_fog_rear_trailer,
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
	if (config.intf.ibus.enabled !== true) return;

	log.module('Setting IO status');

	packet.unshift(0x0C);
	bus.data.send({
		src : 'DIA',
		msg : packet,
	});
}

// Make things.. how they should be?
function reset() {
	// Object of autolights related values
	const io_object_auto = {
		dimmer_value_2              : Math.ceil(status.lcm.auto.night_percentage * 254),
		output_standing_front_left  : true,
		output_standing_front_right : true,
		output_standing_rear_left   : true,
		output_standing_rear_right  : true,
		switch_lowbeam_1            : status.lcm.auto.lowbeam,
	};

	// Object of only comfort turn values
	const io_object = {
		switch_turn_left  : status.lcm.turn.left.comfort,
		switch_turn_right : status.lcm.turn.right.comfort,
	};

	// If autolights are enabled, use ES6 object merge to use auto lights
	if (config.lcm.auto === true) Object.assign(io_object, io_object_auto);

	io_encode(io_object);
}

// Request various things from LCM
function request(value) {
	if (config.intf.ibus.enabled !== true) return;

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

	bus.data.send({ src, msg });
}


// Decode IO status and output true/false values
function parse_dia(data) {
	data.command = 'rep';
	data.value   = 'ACK';

	// Bounce out now if this is a single-byte DIA command ACK message
	if (data.msg.length === 1) return data;

	// Bounce now if this is not a 13 or 33 byte DIA reply message
	if (data.msg.length !== 13 && data.msg.length !== 33) {
		data.value = Buffer.from(data.msg);
		return;
	}


	data.command = 'bro';
	data.value   = 'io-status';

	// Remove command byte
	data.msg = data.msg.slice(1);

	// Set raw IO status bitmask data
	update.status('lcm.io.0',  data.msg[0],  false);
	update.status('lcm.io.1',  data.msg[1],  false);
	update.status('lcm.io.2',  data.msg[2],  false);
	update.status('lcm.io.3',  data.msg[3],  false);
	update.status('lcm.io.4',  data.msg[4],  false);
	update.status('lcm.io.5',  data.msg[5],  false);
	update.status('lcm.io.6',  data.msg[6],  false);
	update.status('lcm.io.7',  data.msg[7],  false);
	update.status('lcm.io.8',  data.msg[8],  false);
	update.status('lcm.io.9',  data.msg[9],  false); // Voltage: Terminal 30
	update.status('lcm.io.10', data.msg[10], false);
	update.status('lcm.io.11', data.msg[11], false);
	update.status('lcm.io.12', data.msg[12], false);
	update.status('lcm.io.13', data.msg[13], false);
	update.status('lcm.io.14', data.msg[14], false);
	update.status('lcm.io.15', data.msg[15], false); // Voltage: Potentiometer, dimmer
	update.status('lcm.io.16', data.msg[16], false); // Voltage: Potentiometer, LWR
	update.status('lcm.io.17', data.msg[17], false);
	update.status('lcm.io.18', data.msg[18], false); // Changes while running (autolevel?)
	update.status('lcm.io.19', data.msg[19], false); // Changes while running (autolevel?), or Voltage, photo cell
	update.status('lcm.io.20', data.msg[20], false);
	update.status('lcm.io.21', data.msg[21], false); // Changes while running (autolevel?)
	update.status('lcm.io.22', data.msg[22], false);
	update.status('lcm.io.23', data.msg[23], false); // Voltage: LWR sensor, front
	update.status('lcm.io.24', data.msg[24], false); // Voltage: LWR sensor, rear
	update.status('lcm.io.25', data.msg[25], false);
	update.status('lcm.io.26', data.msg[26], false);
	update.status('lcm.io.27', data.msg[27], false);
	update.status('lcm.io.28', data.msg[28], false);
	update.status('lcm.io.29', data.msg[29], false); // Voltage: Flash to pass
	update.status('lcm.io.30', data.msg[30], false); // Voltage: Turn signal
	update.status('lcm.io.31', data.msg[31], false);

	// Decode values
	update.status('lcm.dimmer.value_2', data.msg[15], false);


	const voltages = {
		flash_to_pass      : parseFloat((data.msg[19] * 5) / 255),
		photo_cell         : parseFloat((data.msg[29] * 5) / 255),
		terminal_30        : parseFloat((data.msg[30] * 5) / 255),
		turn_signal_switch : parseFloat(((data.msg[9] * 18) / 255).toFixed(2)),

		pot : {
			dimmer : num.round2((data.msg[15] * 5) / 255),
			lwr    : num.round2((data.msg[16] * 5) / 255),
		},

		lwr : {
			front : num.round2((data.msg[23] * 5) / 255),
			rear  : num.round2((data.msg[24] * 5) / 255),
		},
	};

	update.status('lcm.voltage.flash_to_pass',      voltages.flash_to_pass,      false);
	update.status('lcm.voltage.photo_cell',         voltages.photo_cell,         false);
	update.status('lcm.voltage.terminal_30',        voltages.terminal_30,        false);
	update.status('lcm.voltage.turn_signal_switch', voltages.turn_signal_switch, false);

	update.status('lcm.voltage.lwr.front.current', voltages.lwr.front, false);
	update.status('lcm.voltage.lwr.rear.current',  voltages.lwr.rear,  false);

	update.status('lcm.voltage.pot.dimmer.current', voltages.pot.dimmer, false);
	update.status('lcm.voltage.pot.lwr.current',    voltages.pot.lwr,    false);

	// Set min/max values
	if (num.ok2minmax(voltages.lwr.front)) {
		if (voltages.lwr.front < status.lcm.voltage.lwr.front.minimum) update.status('lcm.voltage.lwr.front.minimum', voltages.lwr.front);
		if (voltages.lwr.front > status.lcm.voltage.lwr.front.maximum) update.status('lcm.voltage.lwr.front.maximum', voltages.lwr.front);
	}

	if (num.ok2minmax(voltages.lwr.rear)) {
		if (voltages.lwr.rear < status.lcm.voltage.lwr.rear.minimum) update.status('lcm.voltage.lwr.rear.minimum', voltages.lwr.rear);
		if (voltages.lwr.rear > status.lcm.voltage.lwr.rear.maximum) update.status('lcm.voltage.lwr.rear.maximum', voltages.lwr.rear);
	}

	if (num.ok2minmax(voltages.pot.dimmer)) {
		if (voltages.pot.dimmer < status.lcm.voltage.pot.dimmer.minimum) update.status('lcm.voltage.pot.dimmer.minimum', voltages.pot.dimmer);
		if (voltages.pot.dimmer > status.lcm.voltage.pot.dimmer.maximum) update.status('lcm.voltage.pot.dimmer.maximum', voltages.pot.dimmer);
	}

	if (num.ok2minmax(voltages.pot.lwr)) {
		if (voltages.pot.lwr < status.lcm.voltage.pot.lwr.minimum) update.status('lcm.voltage.pot.lwr.minimum', voltages.pot.lwr);
		if (voltages.pot.lwr > status.lcm.voltage.pot.lwr.maximum) update.status('lcm.voltage.pot.lwr.maximum', voltages.pot.lwr);
	}


	// Decode bitmasks
	const masks = {
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
	update.status('lcm.clamp.c_30a', masks.m0.b0, false);
	update.status('lcm.clamp.c_15',  masks.m3.b5, false);
	update.status('lcm.clamp.c_r',   masks.m0.b6, false);
	update.status('lcm.clamp.c_30b', masks.m0.b7, false);

	update.status('lcm.input.fire_extinguisher',         masks.m0.b1, false);
	update.status('lcm.input.preheating_fuel_injection', masks.m0.b2, false);
	update.status('lcm.input.carb',                      masks.m0.b4, false);

	update.status('lcm.input.key_in_ignition',   masks.m1.b0, false);
	update.status('lcm.input.seat_belts_lock',   masks.m1.b1, false);
	update.status('lcm.input.kfn',               masks.m1.b5, false);
	update.status('lcm.input.armoured_door',     masks.m1.b6, false);
	update.status('lcm.input.brake_fluid_level', masks.m1.b7, false);

	update.status('lcm.input.air_suspension',     masks.m3.b0, false);
	update.status('lcm.input.hold_up_alarm',      masks.m3.b1, false);
	update.status('lcm.input.washer_fluid_level', masks.m3.b2, false);
	update.status('lcm.input.engine_failsafe',    masks.m3.b6, false);
	update.status('lcm.input.tire_defect',        masks.m3.b7, false);

	update.status('lcm.input.vertical_aim', masks.m6.b1, false);

	update.status('lcm.mode.failsafe', masks.m8.b0, false);
	update.status('lcm.mode.sleep',    masks.m8.b6, false);

	update.status('lcm.output.license.rear_left',    masks.m4.b2, false);
	update.status('lcm.output.brake.rear_left',      masks.m4.b3, false);
	update.status('lcm.output.brake.rear_right',     masks.m4.b4, false);
	update.status('lcm.output.highbeam.front_right', masks.m4.b5, false);
	update.status('lcm.output.highbeam.front_left',  masks.m4.b6, false);

	update.status('lcm.output.fog.front_left',           masks.m5.b2, false);
	update.status('lcm.output.fog.front_right',          masks.m5.b6, false);
	update.status('lcm.output.fog.rear_right',           masks.m5.b7, false);
	update.status('lcm.output.fog.rear_trailer',         masks.m8.b4, false);
	update.status('lcm.output.lowbeam.front_left',       masks.m5.b4, false);
	update.status('lcm.output.lowbeam.front_right',      masks.m5.b5, false);
	update.status('lcm.output.reverse.rear_left',        masks.m5.b3, false);
	update.status('lcm.output.standing.front_left',      masks.m5.b0, false);
	update.status('lcm.output.standing.inner_rear_left', masks.m5.b1, false);

	update.status('lcm.output.brake.rear_middle',    masks.m6.b4, false);
	update.status('lcm.output.license.rear_right',   masks.m6.b2, false);
	update.status('lcm.output.standing.front_right', masks.m6.b5, false);
	update.status('lcm.output.standing.rear_left',   masks.m6.b3, false);
	update.status('lcm.output.turn.front_right',     masks.m6.b6, false);
	update.status('lcm.output.turn.rear_left',       masks.m6.b7, false);

	update.status('lcm.output.fog.rear_left',             masks.m7.b2, false);
	update.status('lcm.output.reverse.rear_right',        masks.m7.b7, false);
	update.status('lcm.output.standing.inner_rear_right', masks.m7.b3, false);
	update.status('lcm.output.standing.rear_right',       masks.m7.b4, false);
	update.status('lcm.output.turn.front_left',           masks.m7.b6, false);
	update.status('lcm.output.turn.rear_right',           masks.m7.b1, false);
	update.status('lcm.output.turn.side_left',            masks.m7.b5, false);

	update.status('lcm.output.led.switch_hazard',    masks.m8.b2, false);
	update.status('lcm.output.led.switch_light',     masks.m8.b3, false);
	update.status('lcm.output.reverse.rear_trailer', masks.m8.b5, false);

	update.status('lcm.switch.hazard',         masks.m1.b4, false);
	update.status('lcm.switch.highbeam_flash', masks.m1.b2, false);

	update.status('lcm.switch.brake',      masks.m2.b0, false);
	update.status('lcm.switch.highbeam',   masks.m2.b1, false);
	update.status('lcm.switch.fog_front',  masks.m2.b2, false);
	update.status('lcm.switch.fog_rear',   masks.m2.b4, false);
	update.status('lcm.switch.standing',   masks.m2.b5, false);
	update.status('lcm.switch.turn_right', masks.m2.b6, false);
	update.status('lcm.switch.turn_left',  masks.m2.b7, false);

	update.status('lcm.switch.lowbeam_1', masks.m3.b4, false);
	update.status('lcm.switch.lowbeam_2', masks.m3.b3, false);
} // parse_dia(data)

// Broadcast: light dimmer status
function parse_dimmer_value(data) {
	data.command = 'bro';
	data.value   = 'dimmer value 1';

	update.status('lcm.dimmer.value_1', data.msg[1], false);

	return data;
} // parse_dimmer_value(data)

// Broadcast: light status
function parse_light_status(data) {
	data.command = 'bro';
	data.value   = 'light status';

	// Send data to comfort turn function
	comfort_turn({ before : status.lcm.turn, after : data.msg[1] });

	// Decode bitmasks
	const masks = {
		m0 : bitmask.check(data.msg[1]).mask,
		m1 : bitmask.check(data.msg[2]).mask,
		m2 : bitmask.check(data.msg[3]).mask,
		m3 : bitmask.check(data.msg[4]).mask,
	};

	// On
	update.status('lcm.all_off', masks.m0.b8, false);

	update.status('lcm.standing.front',    masks.m0.b0, false);
	update.status('lcm.lowbeam',           masks.m0.b1, false);
	update.status('lcm.highbeam',          masks.m0.b2, false);
	update.status('lcm.fog.front',         masks.m0.b3, false);
	update.status('lcm.fog.rear',          masks.m0.b4, false);
	update.status('lcm.turn.left.active',  masks.m0.b5, false);
	update.status('lcm.turn.right.active', masks.m0.b6, false);
	update.status('lcm.turn.fast',         masks.m0.b7, false);

	update.status('lcm.brake',            masks.m2.b1, false);
	update.status('lcm.turn.sync',        masks.m2.b2, false);
	update.status('lcm.standing.rear',    masks.m2.b3, false);
	update.status('lcm.trailer.standing', masks.m2.b4, false);
	update.status('lcm.reverse',          masks.m2.b5, false);
	update.status('lcm.trailer.reverse',  masks.m2.b6, false);
	update.status('lcm.hazard',           masks.m2.b7, false);

	// Faulty
	update.status('lcm.faulty.all_ok', masks.m1.b8, false);

	update.status('lcm.faulty.standing.front', masks.m1.b0, false);
	update.status('lcm.faulty.lowbeam.both',   masks.m1.b1, false);
	update.status('lcm.faulty.highbeam',       masks.m1.b2, false);
	update.status('lcm.faulty.fog.front',      masks.m1.b3, false);
	update.status('lcm.faulty.fog.rear',       masks.m1.b4, false);
	update.status('lcm.faulty.turn.left',      masks.m1.b5, false);
	update.status('lcm.faulty.turn.right',     masks.m1.b6, false);
	update.status('lcm.faulty.license_plate',  masks.m1.b7, false);

	update.status('lcm.faulty.brake.right',         masks.m3.b0, false);
	update.status('lcm.faulty.brake.left',          masks.m3.b1, false);
	update.status('lcm.faulty.standing.rear.right', masks.m3.b2, false);
	update.status('lcm.faulty.standing.rear.left',  masks.m3.b3, false);
	update.status('lcm.faulty.lowbeam.right',       masks.m3.b4, false);
	update.status('lcm.faulty.lowbeam.left',        masks.m3.b5, false);

	return data;
} // parse_light_status(data)

// Broadcast: vehicle data
function parse_vehicle_data(data) {
	data.command = 'bro';
	data.value   = 'vehicle data';

	const parse = {
		vin      : hex.h2a(hex.i2s(data.msg[1], false)) + hex.h2a(hex.i2s(data.msg[2], false)) + hex.i2s(data.msg[3], false) + hex.i2s(data.msg[4], false) + hex.i2s(data.msg[5], false)[0],
		odometer : ((data.msg[6] << 8) | (data.msg[7])) * 100,

		since_service : {
			days   : ((data.msg[10] << 8) | (data.msg[11])),
			liters : (((data.msg[8] << 8) | data.msg[9]) & 0x7FF) * 10,
		},
	};

	update.status('vehicle.vin', parse.vin, false);

	update.status('vehicle.coding.since_service.days',   parse.since_service.days,   false);
	update.status('vehicle.coding.since_service.liters', parse.since_service.liters, false);

	return data;
} // parse_vehicle_data(data)


// Parse data sent from LCM module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x54 : return parse_vehicle_data(data);
		case 0x5B : return parse_light_status(data);
		case 0x5C : return parse_dimmer_value(data);
		case 0xA0 : return parse_dia(data);
	}

	return data;
} // parse_out(data)


// Welcome lights on unlocking/locking
function welcome(action, override = false) {
	// Disable welcome lights if ignition is not fully off
	if (status.vehicle.ignition_level !== 0) action = false;

	// Bounce if welcome lights status is equal to request
	if (status.lcm.welcome === action && override === false) return;

	log.module('Welcome lights: ' + action);

	switch (action) {
		case false : {
			// Clear any remaining timeout(s)
			clearTimeout(LCM.timeout.welcome);
			LCM.timeout.welcome = null;

			// Reset welcome lights counter
			LCM.counts.welcome = 0;

			// Set status var back to false
			update.status('lcm.welcome', action, false);

			// Send empty object to turn off all LCM outputs (if vehicle is off)
			if (status.vehicle.ignition_level === 0) io_encode({});

			break;
		}

		case true : {
			// Set status var to true
			update.status('lcm.welcome', action, false);

			// Send configured welcome lights
			io_encode(config.lcm.welcome);

			// Increment welcome lights counter
			LCM.counts.welcome++;

			// Clear welcome lights status after configured timeout
			LCM.timeout.welcome = setTimeout(() => {
				// If we're not over the configured welcome lights limit yet
				LCM.welcome((LCM.counts.welcome <= config.lcm.welcome_sec), true);
			}, 1000);

			break;
		}
	}
}


// Check if the current police lights count is in the provided array
function police_check(data) {
	return data.includes(status.lcm.police.counts.main);
}

// Police lights!
function pl() {
	if (status.lcm.police.counts.loop >= config.lcm.police.limit || status.lcm.police.ok !== true) {
		update.status('lcm.police.ok', false, false);

		clearTimeout(LCM.timeout.police);
		LCM.timeout.police = null;

		io_encode({});

		if (update.status('lcm.police.on', false, false)) {
			setTimeout(IKE.text_urgent_off, 1000);
		}
		return;
	}

	if (update.status('lcm.police.on', true, false)) {
		IKE.text_warning('   Police lights!   ', 0);
	}

	const object = {
		front : {
			left : {
				fog      : false,
				// highbeam : police_check([ 0, 2, 8, 16, 18, 24 ]),
				highbeam : police_check([ 0, 2, 8, 16, 18, 24 ]),
				lowbeam  : false,
				standing : police_check([ 0, 2, 8, 16, 18, 24 ]),
				turn     : police_check([ 4, 6, 10, 20, 22, 26 ]),
				// standing : police_check([ 2, 3, 6, 7, 10, 11, 14, 15, 18, 19, 22, 23, 26, 27, 30, 31 ]),
				// turn     : police_check([ 4, 5, 6, 7, 12, 13, 14, 15, 20, 21, 22, 23, 28, 29, 30, 31 ]),
			},
			right : {
				fog      : false,
				// highbeam : police_check([ 4, 6, 10, 20, 22, 26 ]),
				highbeam : police_check([ 4, 6, 10, 20, 22, 26 ]),
				lowbeam  : false,
				standing : police_check([ 4, 6, 10, 20, 22, 26 ]),
				turn     : police_check([ 0, 2, 8, 16, 18, 24 ]),
				// standing : police_check([ 0, 1, 4, 5, 8, 9, 12, 13, 16, 17, 20, 21, 24, 25, 28, 29 ]),
				// turn     : police_check([ 0, 1, 2, 3, 8, 9, 10, 11, 16, 17, 18, 19, 24, 25, 26, 27 ]),
			},
		},

		side : {
			left : {
				turn : police_check([ 0, 2, 8, 16, 18, 24 ]),
			},
			right : {
				turn : police_check([ 4, 6, 10, 20, 22, 26 ]),
			},
		},

		rear : {
			left : {
				brake    : police_check([ 0, 1, 6, 7, 8, 9, 14, 15, 16, 17, 22, 23, 24, 25, 30, 31 ]),
				reverse  : police_check([ 4, 6, 10, 20, 22, 26 ]),
				standing : police_check([ 2, 3, 4, 5, 10, 11, 12, 13, 18, 19, 20, 21, 26, 27, 28, 29 ]),
				turn     : police_check([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ]),
			},
			right : {
				brake    : police_check([ 2, 3, 4, 5, 10, 11, 12, 13, 18, 19, 20, 21, 26, 27, 28, 29 ]),
				reverse  : police_check([ 0, 2, 8, 16, 18, 24 ]),
				standing : police_check([ 0, 1, 6, 7, 8, 9, 14, 15, 16, 17, 22, 23, 24, 25, 30, 31 ]),
				turn     : police_check([ 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31 ]),
			},
			middle : {
				brake : police_check([ 4, 5, 6, 7, 12, 13, 14, 15, 20, 21, 22, 23, 28, 29, 30, 31 ]),
			},
		},
	};

	// Clean this up later
	const io_object = {
		output_standing_front_left  : object.front.left.standing,
		output_standing_front_right : object.front.right.standing,

		output_standing_inner_rear_left  : object.rear.left.standing,
		output_standing_inner_rear_right : object.rear.right.standing,

		output_standing_rear_left  : object.rear.right.standing,
		output_standing_rear_right : object.rear.left.standing,

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

	update.status('lcm.police.counts.main', (status.lcm.police.counts.main + 1));

	if (status.lcm.police.counts.main === 32) {
		update.status('lcm.police.counts.main', 0);
		update.status('lcm.police.counts.loop', (status.lcm.police.counts.loop + 1), false);
	}

	LCM.timeout.police = setTimeout(pl, config.lcm.police.delay);
}

function police(action = false) {
	update.status('lcm.police.ok', action, false);

	if (status.lcm.police.on === action) return;

	switch (action) {
		case true : {
			if (status.lcm.police.on !== true) {
				update.status('lcm.police.counts.loop', 0);
				update.status('lcm.police.counts.main', 0);
			}
		}
	}

	pl();
}

// Configure event listeners
function init_listeners() {
	if (config.intf.ibus.enabled !== true) return;

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
		if (keyfob.button !== 'none') welcome((keyfob.button === 'unlock'));
	});

	// Activate autolights if we got 'em
	update.on('status.vehicle.ignition', auto_process);

	// Update autolights status on wiper speed change
	update.on('status.gm.wipers.speed', () => {
		// Call auto_process() after 1.5s, else just tapping mist/spray turns on the lights
		setTimeout(auto_process, 1500);
	});

	log.module('Initialized listeners');
}


export default {
	// Interval/loop/timeout variables
	counts : {
		welcome : 0,
	},

	// Timeout variables
	timeout : {
		auto    : null,
		police  : null,
		welcome : null,
	},

	// Functions
	auto,
	auto_process,
	police,
	welcome,

	comfort_turn_flash,
	init_listeners,
	io_encode,
	parse_out,
	request,
	set_backlight,
};
