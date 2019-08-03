/* eslint key-spacing : 0 */

const convert = require('node-unit-conversion');


// I should look into extending object classes and using Prototype for crap like this
//
// Horsepower = (torque * RPM)/5252
function tq2hp(torque, rpm) {
	return Math.round((torque * rpm) / 5252);
}


// This is dangerous and awesome if you can see what it does
function encode_316(rpm = 10000) {
	// Bounce if can0 is not enabled
	if (config.intf[config.dme.can_intf].enabled !== true) return;

	let rpm_orig = rpm;

	rpm = Math.floor(rpm * 6.4);

	let lsb = rpm        & 0xFF || 0; // LSB
	let msb = (rpm >> 8) & 0xFF || 0; // MSB

	let msg = Buffer.from([ 0x05, 0x16, lsb, msb, 0x16, 0x18, 0x00, 0x16 ]);

	let count = 500;

	// Send packets
	for (let i = 0; i < count; i++) {
		setTimeout(() => {
			bus.data.send({
				bus  : config.dme.can_intf,
				id   : 0x316,
				data : msg,
			});
		}, (i / 75));
	}

	log.module('Sent ' + count + 'x encoded CANBUS packets, ARBID 0x316, with RPM : ' + rpm_orig);
}


// CAN ARBID 0x316 (DME1)
//
// byte 0, bit 0 : Something is pushed here, but I'm having a hard time tracing what it is. Appears it would always be 1 if everything is running normally
// byte 0, bit 1 : Unused (in this DME)
// byte 0, bit 2 : 0 if DSC error, 1 otherwise
// byte 0, bit 3 : 0 if manual, 1 if SMG (on this DME, I guess MS45 is different)
// byte 0, bit 4 : bit 0 of md_st_eingriff (torque intervention status)
// byte 0, bit 5 : bit 1 of md_st_eingriff
// byte 0, bit 6 : AC engaged
// byte 0, bit 7 : MAF error
//
// byte 1 : md_ind_ne_ist -- current engine torque after interventions (in %)
// byte 4 : md_ind_ist    -- current engine torque before interventions (in %)
// byte 5 : md_reib       -- torque loss of consumers (alternator, ac, oil pump, etc) (in %)
// byte 7 : md_ind_lm_ist -- theoretical engine torque from air mass, excluding ignition angle (in %)
function parse_316(data) {
	data.value = 'AC clutch/Throttle/RPM';

	// Bounce if ignition is not in run
	if (status.vehicle.ignition !== 'run') return data;

	let mask_0 = bitmask.check(data.msg[0]).mask;

	// Key message examples seen:
	//                      [ 0 1 2 3 4 5 6 7 ]
	// data.msg[0] = 0x04 : [ - - T - - - - - ]
	// data.msg[0] = 0x05 : [ T - T - - - - - ]
	// data.msg[0] = 0x15 : [ T - T - T - - - ]

	let parse = {
		dsc_error           : !mask_0.b0,
		maf_error           : mask_0.b7,
		status_ok           : mask_0.b0,
		torque_intervention : mask_0.b4,

		rpm : Math.round(((data.msg[3] << 8) + data.msg[2]) / 6.4),


		ac : {
			clutch : mask_0.b6,
		},

		// This is not actually factual
		key : {
			off       :  mask_0.b8,
			accessory : !mask_0.b0 && mask_0.b2 && !mask_0.b4,
			run       :  mask_0.b0 && mask_0.b2 && !mask_0.b4,
			start     :  mask_0.b0 && mask_0.b2 &&  mask_0.b4,
		},

		horsepower : {
			after_interventions  : 0,
			before_interventions : 0,
			loss                 : 0,
			output               : 0,
		},

		torque : {
			after_interventions  : num.round2(data.msg[1] / 2.55),
			before_interventions : num.round2(data.msg[4] / 2.55),
			loss                 : num.round2(data.msg[5] / 2.55),
			output               : num.round2(data.msg[7] / 2.55),
		},

		torque_value : {
			after_interventions  : Math.round(config.engine.torque_max * (data.msg[1] / 255)),
			before_interventions : Math.round(config.engine.torque_max * (data.msg[4] / 255)),
			loss                 : Math.round(config.engine.torque_max * (data.msg[5] / 255)),
			output               : Math.round(config.engine.torque_max * (data.msg[7] / 255)),
		},
	};

	// Horsepower = (torque * RPM)/5252
	parse.horsepower = {
		after_interventions  : tq2hp(parse.torque_value.after_interventions,  parse.rpm),
		before_interventions : tq2hp(parse.torque_value.before_interventions, parse.rpm),

		loss   : tq2hp(parse.torque_value.loss,   parse.rpm),
		output : tq2hp(parse.torque_value.output, parse.rpm),
	};


	// This is not actually factual
	// update.status('vehicle.key.off',       parse.key.off,       false);
	// update.status('vehicle.key.accessory', parse.key.accessory, false);
	// update.status('vehicle.key.run',       parse.key.run,       false);
	// update.status('vehicle.key.start',     parse.key.start,     false);


	update.status('engine.rpm', parse.rpm);

	update.status('engine.ac.clutch',           parse.ac.clutch,           false);
	update.status('engine.dsc_error',           parse.dsc_error,           false);
	update.status('engine.maf_error',           parse.maf_error,           false);
	update.status('engine.status_ok',           parse.status_ok,           false);
	update.status('engine.torque_intervention', parse.torque_intervention, false);

	// If the engine is newly running
	let engine_running = (parse.rpm > 0);
	if (update.status('engine.running', engine_running, false) && engine_running === true) {
		update.status('engine.start_time_last', Date.now(), false);
	}

	update.status('engine.torque.after_interventions',  parse.torque.after_interventions);
	update.status('engine.torque.before_interventions', parse.torque.before_interventions);
	update.status('engine.torque.loss',                 parse.torque.loss);
	update.status('engine.torque.output',               parse.torque.output);

	update.status('engine.torque_value.after_interventions',  parse.torque_value.after_interventions);
	update.status('engine.torque_value.before_interventions', parse.torque_value.before_interventions);
	update.status('engine.torque_value.loss',                 parse.torque_value.loss);
	update.status('engine.torque_value.output',               parse.torque_value.output);

	update.status('engine.horsepower.after_interventions',  parse.horsepower.after_interventions);
	update.status('engine.horsepower.before_interventions', parse.horsepower.before_interventions);
	update.status('engine.horsepower.loss',                 parse.horsepower.loss);
	update.status('engine.horsepower.output',               parse.horsepower.output);

	return data;
}

// CAN ARBID 0x329 (DME2)
function parse_329(data) {
	data.value = 'Temp/Brake pedal depressed/Throttle position';

	// byte 0 : ??
	// byte 1 : coolant temp
	// byte 2 : atmospheric pressure
	//
	// byte 3, bit 0      : clutch switch (0 = engaged, 1 = disengage/neutral)
	// byte 3, bit 2      : Hardcoded to 1 (on MSS54, could be used on other DMEs)
	// byte 3, bit 4      : possibly motor status (0 = on, 1 = off)
	// byte 3, bits 5+6+7 : tank evap duty cycle?
	//
	// byte 4 : driver desired torque, relative (0x00 - 0xFE)
	// byte 5 : throttle position               (0x00 - 0xFE)
	//
	// byte 6, bit 2 : kickdown switch depressed
	// byte 6, bit 1 : brake light switch error
	// byte 6, bit 0 : brake pedal depressed
	//
	// byte 7 : ??

	let parse = {
		engine : {
			// throttle : {
			// 	cruise : num.round2(data.msg[4] / 2.54),
			// 	pedal  : num.round2(data.msg[5] / 2.54),
			// },

			atmospheric_pressure : {
				mbar : (data.msg[2] * 2) + 597,
				mmhg : null,
				psi  : null,
			},
		},

		temperature : {
			coolant : {
				c : Math.floor((data.msg[1] * 0.75) - 48),
				f : null,
			},
		},

		vehicle : {
			brake    : bitmask.test(data.msg[6], 0x01),
			clutch   : bitmask.test(data.msg[3], 0x01),
			kickdown : bitmask.test(data.msg[6], 0x04),

			cruise : {
				button : {
					resume :  bitmask.test(data.msg[3], 0x20) &&  bitmask.test(data.msg[3], 0x40),
					minus  : !bitmask.test(data.msg[3], 0x20) &&  bitmask.test(data.msg[3], 0x40),
					plus   :  bitmask.test(data.msg[3], 0x20) && !bitmask.test(data.msg[3], 0x40),
					onoff  :  bitmask.test(data.msg[3], 0x80),
					unk1   :  bitmask.test(data.msg[3], 0x01),
				},

				status : {
					activating : bitmask.test(data.msg[6], 0x20),
					active     : bitmask.test(data.msg[6], 0x08),
					resume     : bitmask.test(data.msg[6], 0x10),
					unk1       : bitmask.test(data.msg[6], 0x01),
				},
			},

			sport : {
				active : bitmask.test(data.msg[5], 0x02),
			},
		},
	};

	// Calculate mmhg and psi atmospheric pressure values
	parse.engine.atmospheric_pressure.mmhg = num.round2(parse.engine.atmospheric_pressure.mbar * 0.75006157818041);
	parse.engine.atmospheric_pressure.psi  = num.round2(parse.engine.atmospheric_pressure.mbar * 0.01450377380072);

	// Calculate fahrenheit temperature values
	parse.temperature.coolant.f = Math.floor(convert(parse.temperature.coolant.c).from('celsius').to('fahrenheit'));


	// Update status object
	update.status('engine.atmospheric_pressure.mbar', parse.engine.atmospheric_pressure.mbar);
	update.status('engine.atmospheric_pressure.mmhg', parse.engine.atmospheric_pressure.mmhg);
	update.status('engine.atmospheric_pressure.psi',  parse.engine.atmospheric_pressure.psi, false);

	update.status('vehicle.cruise.button.minus',  parse.vehicle.cruise.button.minus,  false);
	update.status('vehicle.cruise.button.onoff',  parse.vehicle.cruise.button.onoff,  false);
	update.status('vehicle.cruise.button.plus',   parse.vehicle.cruise.button.plus,   false);
	update.status('vehicle.cruise.button.resume', parse.vehicle.cruise.button.resume, false);
	update.status('vehicle.cruise.button.unk1',   parse.vehicle.cruise.button.unk1,   false);

	update.status('vehicle.cruise.status.activating', parse.vehicle.cruise.status.activating, false);
	update.status('vehicle.cruise.status.active',     parse.vehicle.cruise.status.active,     false);
	update.status('vehicle.cruise.status.resume',     parse.vehicle.cruise.status.resume,     false);
	update.status('vehicle.cruise.status.unk1',       parse.vehicle.cruise.status.unk1,       false);

	// update.status('engine.throttle.cruise', parse.engine.throttle.cruise);
	// update.status('engine.throttle.pedal',  parse.engine.throttle.pedal);

	// update.status('vehicle.sport.active', parse.vehicle.sport.active, false);

	update.status('temperature.coolant.c', parse.temperature.coolant.c, false);
	update.status('temperature.coolant.f', parse.temperature.coolant.f);

	update.status('vehicle.brake',  parse.vehicle.brake, false);

	if (update.status('vehicle.clutch', parse.vehicle.clutch, false)) {
		if (parse.vehicle.clutch === false && status.engine.running === true) {
			update.status('vehicle.clutch_count', parseFloat((status.vehicle.clutch_count + 1)), false);
		}
	}

	return data;
}

// MS45/MSD80/MSV80 only
function parse_338(data) {
	data.value = 'Sport mode status';

	// byte2, bit 0 = Sport on (request by SMG transmission)
	// byte2, bit 1 = Sport off
	// byte2, bit 2 = Sport on
	// byte2, bit 3 = Sport error

	// let parse = {
	// 	msg     : '0x338',
	// 	vehicle : {
	// 		sport : {
	// 			active : ((data.msg[2] === 0x00 || data.msg[2] === 0x02) && (data.msg[2] !== 0x01 && data.msg[2] !== 0x03)),
	// 			error  : data.msg[2] === 0x03,
	// 		},
	// 	},
	// };

	// update.status('vehicle.sport.active', parse.vehicle.sport.active, false);
	// update.status('vehicle.sport.error',  parse.vehicle.sport.error,  false);

	return data;
}

// CAN ARBID 0x545 (DME4)
//
// byte 0, bit 1 : Check engine
// byte 0, bit 3 : Cruise
// byte 0, bit 4 : EML
// byte 0, bit 7 : Check gas cap
//
// byte 1 : Fuel consumption LSB
// byte 2 : Fuel consumption LSB
//
// byte 3, bit 0 : Oil level error, if motortype = S62
// byte 3, bit 1 : Oil level warning (yellow)
// byte 3, bit 2 : Oil level error   (red)
// byte 3, bit 3 : Coolant overtemperature light
// byte 3, bit 4 : M3/M5 tachometer light
// byte 3, bit 5 : M3/M5 tachometer light
// byte 3, bit 6 : M3/M5 tachometer light
//
// byte 4 : Oil temperature (ºC = X - 48)
//
// byte 5, bit 0 : Oil pressure light off
// byte 5, bit 1 :
// byte 5, bit 2 :
// byte 5, bit 3 : A/C switch
// byte 5, bit 4 : Alternator/battery light off
// byte 5, bit 5 :
// byte 5, bit 6 :
// byte 5, bit 7 :
//
// byte 6 : CSL oil level (format unclear)
//
// byte 7 : Possibly MSS54 TPM trigger
function parse_545(data) {
	data.value = 'CEL/Fuel cons/Overheat/Oil temp/Charging/Brake light switch/Cruise control';

	let process_consumption = true;

	let consumption_current = ((data.msg[2] << 8) + data.msg[1]);

	// Need at least one value first
	if (DME.consumption_last === 0) {
		DME.consumption_last = consumption_current;
		process_consumption = false;
	}

	// The amount of fuel being consumed isn't a flat number
	// It's the difference between two numbers factoring in the time between the time both numbers were received

	let parse = {
		fuel : {
			consumption : consumption_current - DME.consumption_last,
		},

		status : {
			check_engine  : bitmask.test(data.msg[0], bitmask.b[1]),
			check_gas_cap : bitmask.test(data.msg[0], bitmask.b[7]),
			cruise        : bitmask.test(data.msg[0], bitmask.b[3]),
			eml           : bitmask.test(data.msg[0], bitmask.b[4]),
		},

		temperature : {
			oil : {
				c : data.msg[4] - 48,
				f : null,
			},
		},
	};

	if (process_consumption === true) {
		DME.consumption_last = consumption_current;
		update.status('fuel.consumption', parse.fuel.consumption);
	}

	// Calculate fahrenheit temperature values
	parse.temperature.oil.f = parseFloat(convert(parse.temperature.oil.c).from('celsius').to('fahrenheit'));

	// Update status object
	update.status('dme.status.check_engine',  parse.status.check_engine,  false);
	update.status('dme.status.check_gas_cap', parse.status.check_gas_cap, false);
	update.status('dme.status.cruise',        parse.status.cruise,        false);
	update.status('dme.status.eml',           parse.status.eml,           false);

	update.status('temperature.oil.f', parse.temperature.oil.f);
	update.status('temperature.oil.c', parse.temperature.oil.c, false);

	return data;
}

function parse_610(data) {
	data.value = 'VIN/info';

	return data;
}


// byte0 : Odometer LSB
// byte1 : Odometer MSB
// byte2 : Fuel level
// byte3 : Running clock LSB
// byte4 : Running clock MSB
//
// Running clock = minutes since last time battery power was lost
//
// This is actually sent by IKE
function parse_613(data) {
	data.value = 'Odometer/Running clock/Fuel level [0x615 ACK]';

	let parse = {
		vehicle : {
			odometer : {
				km : ((data.msg[1] << 8) + data.msg[0]) * 10,
				mi : null,
			},

			running_clock : ((data.msg[4] << 8) + data.msg[3]),
		},

		// Looks bad, I should feel bad
		fuel : {
			level  : null,
			liters : (data.msg[2] >= 0x80) && data.msg[2] - 0x80 || data.msg[2],
		},
	};

	parse.fuel.level = Math.floor((parse.fuel.liters / config.fuel.liters_max) * 100);
	if (parse.fuel.level < 0)   parse.fuel.level = 0;
	if (parse.fuel.level > 100) parse.fuel.level = 100;

	update.status('fuel.level',  parse.fuel.level, false);
	update.status('fuel.liters', parse.fuel.liters);

	parse.vehicle.odometer.mi = Math.floor(convert(parse.vehicle.odometer.km).from('kilometre').to('us mile'));

	update.status('vehicle.odometer.km', parse.vehicle.odometer.km);
	update.status('vehicle.odometer.mi', parse.vehicle.odometer.mi, false);

	update.status('vehicle.running_clock', parse.vehicle.running_clock, false);

	return data;
}

// ARBID: 0x615 sent from the instrument cluster
function parse_615(data) {
	data.value = 'A/C request/Outside air temp/Parking brake/door contacts';

	// byte 0 : AC signal, 0x80 when on, AC torque in bits 0-4 (value can be between 0x00 and 0x1F; unit is Nm). Bits 5 and 6 are unknown
	//
	// byte 1, bit 0 : ??
	// byte 1, bit 1 : ??
	// byte 1, bit 2 : headlights/parking lights on
	// byte 1, bit 3 : ??
	// byte 1, bit 4 : AC Fan-speed request
	// byte 1, bit 5 : AC Fan-speed request
	// byte 1, bit 6 : AC Fan-speed request
	// byte 1, bit 7 : AC Fan-speed request
	//
	// byte 3 : Outside air temperature
	//
	// byte 4, bit 0 : Driver door opened
	// byte 4, bit 1 : Handbrake engaged
	// byte 4, bit 2 : ??
	// byte 4, bit 3 : ??
	// byte 4, bit 4 : ??
	// byte 4, bit 5 : ??
	// byte 4, bit 6 : ??
	// byte 4, bit 7 : ??
	//
	// byte 5, bit 0 : ??
	// byte 5, bit 1 : Left turn signal
	// byte 5, bit 2 : Right turn signal
	// byte 5, bit 3 : CAN_EKP_CRASH
	// byte 5, bit 4 : CAN_EKP_CRASH
	// byte 5, bit 5 : ??
	// byte 5, bit 6 : ??
	// byte 5, bit 7 : ??
	//
	// byte 6, bit 0 : ??
	// byte 6, bit 1 : ??
	// byte 6, bit 2 : ??
	// byte 6, bit 3 : ??
	// byte 6, bit 4 : ??
	// byte 6, bit 5 : ??
	// byte 6, bit 6 : ??
	// byte 6, bit 7 : ??
	//
	// byte 7, bit 0 : ??
	// byte 7, bit 1 : Key information available
	// byte 7, bit 2 : Key number (00 = Key 1, 01 = Key 2, 10 = Key 3, 11 = Key 4)
	// byte 7, bit 3 : Key number (00 = Key 1, 01 = Key 2, 10 = Key 3, 11 = Key 4)
	// byte 7, bit 4 : ??
	// byte 7, bit 5 : ??
	// byte 7, bit 6 : ??
	// byte 7, bit 7 : ??

	let parse = {
		ac : {
			request : data.msg[0],
			torque  : (data.msg[0] >= 0x80) && data.msg[0] - 0x80 || data.msg[0],
		},

		temperature : {
			exterior : {
				c : (data.msg[3] >= 0x80) && data.msg[3] - 0x80 || data.msg[3],
				f : null,
			},
		},

		vehicle : {
			handbrake : bitmask.test(data.msg[4], 0x02),
		},
	};

	// Calculate fahrenheit temperature values
	parse.temperature.exterior.f = parseFloat(convert(parse.temperature.exterior.c).from('celsius').to('fahrenheit'));

	// Round temperature values
	parse.temperature.exterior.c = Math.floor(parse.temperature.exterior.c);
	parse.temperature.exterior.f = Math.floor(parse.temperature.exterior.f);

	// Update status object
	update.status('engine.ac.request', parse.ac.request, false);
	update.status('engine.ac.torque',  parse.ac.torque,  false);

	update.status('temperature.exterior.c', parse.temperature.exterior.c, false);
	update.status('temperature.exterior.f', parse.temperature.exterior.f);

	update.status('vehicle.handbrake', parse.vehicle.handbrake, false);

	return data;
}

// ARBID: 0x720 sent from MSS5x on secondary CANBUS - connector X60002 at pins 21 (low) and 22 (high)
// B0    = Coolant temp
// B1    = Intake temp
// B2    = Exhaust gas temp
// B3    = Oil temp
// B4    = Voltage*10
// B5,B6 = Speed
// B7    = Fuel pump duty cycle
//
// Example : [ 0x40, 0x4A, 0x03, 0x3E, 0x7C, 0x00, 0x00, 0x00 ]
function parse_720(data) {
	data.value = 'Coolant temp/Intake air temp/Exhaust gas temp/Oil temp/Voltage/Speed/Fuel pump duty';

	let parse = {
		dme : {
			voltage : data.msg[4] / 10,
		},

		fuel : {
			pump : {
				duty    : data.msg[7],
				percent : num.floor2(data.msg[7] / 2.55),
			},
		},

		temperature : {
			// coolant : {
			// 	c : data.msg[0] - 48,
			// 	f : null,
			// },

			exhaust : {
				c : data.msg[2] << 2,
				f : null,
			},

			// oil : {
			// 	c : data.msg[3] - 48,
			// 	f : null,
			// },

			intake : {
				c : data.msg[1] - 48,
				f : null,
			},
		},
	};

	// Update status object

	// update.status('temperature.coolant.c', parse.temperature.coolant.c);
	// update.status('temperature.oil.c',     parse.temperature.oil.c);
	update.status('temperature.exhaust.c', parse.temperature.exhaust.c, false);
	update.status('temperature.intake.c',  parse.temperature.intake.c,  false);

	update.status('dme.voltage',       parse.dme.voltage);
	update.status('fuel.pump.duty',    parse.fuel.pump.duty);
	update.status('fuel.pump.percent', parse.fuel.pump.percent);

	// Calculate fahrenheit temperature values
	// parse.temperature.coolant.f = parseFloat(convert(parse.temperature.coolant.c).from('celsius').to('fahrenheit'));
	parse.temperature.exhaust.f = parseFloat(convert(parse.temperature.exhaust.c).from('celsius').to('fahrenheit'));
	parse.temperature.intake.f  = parseFloat(convert(parse.temperature.intake.c).from('celsius').to('fahrenheit'));
	// parse.temperature.oil.f     = parseFloat(convert(parse.temperature.oil.c).from('celsius').to('fahrenheit'));

	// update.status('temperature.coolant.f', parse.temperature.coolant.f);
	// update.status('temperature.oil.f',     parse.temperature.oil.f);
	update.status('temperature.exhaust.f', parse.temperature.exhaust.f);
	update.status('temperature.intake.f',  parse.temperature.intake.f);

	return data;
}


function parse_out_low(data) {
	if (data.dst === null || typeof data.dst === 'undefined') {
		data.dst = {
			id   : 0x12,
			name : 'DME',
		};
	}

	if (data.msg[0] === null || typeof data.msg[0] === 'undefined') {
		data.msg = [ 0xFF ];
	}

	return data;
}


// Parse data sent from module
function parse_out(data) {
	data.command = 'bro';

	// DBUS/IBUS/KBUS data - not CAN
	switch (data.bus) {
		case 'ibus' :
		case 'dbus' :
		case 'kbus' : return parse_out_low(data);
	}

	// CAN data
	switch (data.src.id) {
		case 0x316 : return parse_316(data);
		case 0x329 : return parse_329(data);
		case 0x338 : return parse_338(data);
		case 0x545 : return parse_545(data);
		case 0x610 : return parse_610(data);
		case 0x613 : return parse_613(data);
		case 0x615 : return parse_615(data);
		case 0x720 : return parse_720(data);

		default : data.value = data.src.id.toString(16);
	}

	return data;
}

// Request various things from DME
function request(value) {
	// Init variables
	let src;
	let cmd;

	switch (value) {
		case 'motor-values' : {
			src = 'DIA';
			cmd = [ 0xB8, 0x12, 0xF1, 0x03, 0x22, 0x40, 0x00 ];
			break;
		}

		default : return;
	}

	bus.data.send({
		src : src,
		dst : 'DME',
		msg : cmd,
	});
}


function init_listeners() {
	update.on('status.engine.running', (data) => {
		switch (data.new) {
			case true : {
				// If configured, send RPM 10000 on 0x316 on ignition in run
				if (config.ike.sweep === true) encode_316(10000);
			}
		}
	});

	// Reset torque output values when ignition not in run
	update.on('status.vehicle.ignition', (data) => {
		if (data.new === 'run') return;

		update.status('engine.torque.after_interventions',  0);
		update.status('engine.torque.before_interventions', 0);
		update.status('engine.torque.loss',                 0);
		update.status('engine.torque.output',               0);

		update.status('engine.torque_value.after_interventions',  0);
		update.status('engine.torque_value.before_interventions', 0);
		update.status('engine.torque_value.loss',                 0);
		update.status('engine.torque_value.output',               0);

		update.status('engine.horsepower.after_interventions',  0);
		update.status('engine.horsepower.before_interventions', 0);
		update.status('engine.horsepower.loss',                 0);
		update.status('engine.horsepower.output',               0);
	});

	log.msg('Initialized listeners');
}


module.exports = {
	// Variables
	consumption_last : 0,

	// Functions
	encode_316 : encode_316,

	init_listeners : init_listeners,
	parse_out      : parse_out,
	request        : request,
};
