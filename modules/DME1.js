const convert = require('node-unit-conversion');


// This is dangerous and awesome if you can see what it does
function encode_316(rpm = 10000) {
	// Bounce if can0 is not enabled
	if (config.bus[config.dme1.can_intf].enabled !== true) return;

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
				bus  : config.dme1.can_intf,
				id   : 0x316,
				data : msg,
			});
		}, (i / 75));
	}

	log.module('Sent ' + count + 'x encoded CANBUS packets, ARBID 0x316, with RPM : ' + rpm_orig);
}

// For 0x316 byte 0
//
// Bit 0 - Something is pushed here, but I'm having a hard time tracing what it is. Appears it would always be set to 1 if everything is running normally
// Bit 1 - Unused (in this DME)
// Bit 2 - Set to 0 if ASC/DSC error, 1 otherwise
// Bit 3 - Set to 0 if manual, Set to 1 if SMG (on this DME, I guess MS45 is different)
// Bit 4 - Set to bit 0 of md_st_eingriff (torque intervention status)
// Bit 5 - Set to bit 1 of md_st_eingriff
// Bit 6 - Set to 1 AC engaged
// Bit 7 - Set to 1 if MAF error
function parse_316(data) {
	let mask_0 = bitmask.check(data.msg[0]).mask;

	let parse = {
		ac_clutch : mask_0.b7,

		rpm : ((data.msg[3] << 8) + data.msg[2]) / 6.4,

		key : {
			off       : mask_0.b8,
			accessory : !mask_0.b0 && !mask_0.b1 && mask_0.b2 && !mask_0.b3 && !mask_0.b4,
			run       : mask_0.b0 && !mask_0.b1 && mask_0.b2 && !mask_0.b3 && !mask_0.b4,
			start     : mask_0.b0 && !mask_0.b1 && mask_0.b2 && !mask_0.b3 && mask_0.b4,
		},

		torque : {
			after_interventions  : parseFloat((data.msg[1] / 2.54).toFixed(1)),
			before_interventions : parseFloat((data.msg[4] / 2.54).toFixed(1)),
			loss                 : parseFloat((data.msg[5] / 2.54).toFixed(1)),
			output               : parseFloat((data.msg[7] / 2.54).toFixed(1)),
		},
	};

	update.status('engine.ac_clutch', parse.ac_clutch);


	update.status('vehicle.key.off',       parse.key.off);
	update.status('vehicle.key.accessory', parse.key.accessory);
	update.status('vehicle.key.run',       parse.key.run);
	update.status('vehicle.key.start',     parse.key.start);

	// horsepower = (torque * RPM)/5252
	update.status('engine.torque.after_interventions',  parse.torque.after_interventions,  false);
	update.status('engine.torque.before_interventions', parse.torque.before_interventions, false);
	update.status('engine.torque.loss',                 parse.torque.loss,                 false);
	update.status('engine.torque.output',               parse.torque.output,               false);
}

function parse_329(data) {
	// byte2
	// 0 = Sport on (request by SMG transmission)
	// 1 = Sport off
	// 2 = Sport on
	// 3 = Sport error

	// byte3
	// bit 0 - Clutch switch (0 = engaged, 1 = disengage/neutral);
	// bit 2 - Hardcoded to 1 (on MSS54, could be used on other DMEs)
	// bit 4 - Possibly motor status (0 = on, 1 = off)
	// bits 5, 6, 7 - MSS52 sport mode, tank evap duty cycle.. pfft
	//
	//
	// ARBID: 0x329 (DME2)
	// -B0
	// -B1 is Temp [Temp in C = .75 * hex2dec(byte01) - 48.373]
	// -B2 is atmospheric pressure -- not sure of conversion yet
	// -B3 Clutch switch bit 0 (0 = engaged, 1 = disengage/neutral); Possibly Motor Status bit 4 (0 = on, 1 = off), Tank Evap duty cycle (possibly mislabeled, looks more like some sort of status byte) bits 5, 6, 7
	// -B4 Driver desired torque, relative (00 - FE)
	// -B5 Throttle position (00-FE).
	// -B6 kickdown switch depressed is 4 (bit 2 = 1), Brake light switch error is 2 (bit 1 = 1), Brake pedal depressed is value 1 (bit 0 = 1)
	// -B7

	let parse = {
		engine : {
			// throttle : {
			// 	cruise : parseFloat((data.msg[4] / 2.54).toFixed(1)),
			// 	pedal  : parseFloat((data.msg[5] / 2.54).toFixed(1)),
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
					resume : bitmask.test(data.msg[3], 0x40) && bitmask.test(data.msg[3], 0x20),
					minus  : bitmask.test(data.msg[3], 0x40) && !bitmask.test(data.msg[3], 0x20),
					onoff  : bitmask.test(data.msg[3], 0x80),
					plus   : bitmask.test(data.msg[3], 0x20) && !bitmask.test(data.msg[3], 0x40),
					unk1   : bitmask.test(data.msg[3], 0x01),
				},

				status : {
					activating : bitmask.test(data.msg[6], 0x20),
					active     : bitmask.test(data.msg[6], 0x08),
					resume     : bitmask.test(data.msg[6], 0x10),
					unk1       : bitmask.test(data.msg[6], 0x01),
				},
			},

			//                                 XX
			// can0  329   [8]  40 51 C4 04 00 03 00 00
			sport : {
				active : bitmask.test(data.msg[5], 0x02),
			},
		},
	};

	// Calculate mmhg and psi atmospheric pressure values
	parse.engine.atmospheric_pressure.mmhg = parseFloat((parse.engine.atmospheric_pressure.mbar * 0.75006157818041).toFixed(2));
	parse.engine.atmospheric_pressure.psi  = parseFloat((parse.engine.atmospheric_pressure.mbar * 0.01450377380072).toFixed(2));

	// Calculate fahrenheit temperature values
	parse.temperature.coolant.f = Math.floor(convert(parse.temperature.coolant.c).from('celsius').to('fahrenheit'));

	// Update status object
	update.status('engine.atmospheric_pressure.mbar', parse.engine.atmospheric_pressure.mbar, false);
	update.status('engine.atmospheric_pressure.mmhg', parse.engine.atmospheric_pressure.mmhg, false);
	update.status('engine.atmospheric_pressure.psi',  parse.engine.atmospheric_pressure.psi,  false);

	update.status('vehicle.cruise.button.minus', parse.vehicle.cruise.button.minus);
	update.status('vehicle.cruise.button.onoff', parse.vehicle.cruise.button.onoff);
	update.status('vehicle.cruise.button.plus',  parse.vehicle.cruise.button.plus);
	update.status('vehicle.cruise.button.unk1',  parse.vehicle.cruise.button.unk1);

	update.status('vehicle.cruise.status.activating', parse.vehicle.cruise.status.activating);
	update.status('vehicle.cruise.status.active',     parse.vehicle.cruise.status.active);
	update.status('vehicle.cruise.status.resume',     parse.vehicle.cruise.status.resume);
	update.status('vehicle.cruise.status.unk1',       parse.vehicle.cruise.status.unk1);

	// update.status('engine.throttle.cruise', parse.engine.throttle.cruise);
	// update.status('engine.throttle.pedal',  parse.engine.throttle.pedal);

	update.status('vehicle.sport.active', parse.vehicle.sport.active);

	// Trigger a HUD refresh if coolant temp is updated
	if (update.status('temperature.coolant.c', parse.temperature.coolant.c)) IKE.hud_refresh();

	update.status('temperature.coolant.f', parse.temperature.coolant.f, false);

	update.status('vehicle.brake',  parse.vehicle.brake);

	if (update.status('vehicle.clutch', parse.vehicle.clutch)) {
		if (parse.vehicle.clutch === false && status.engine.running === true) {
			update.status('vehicle.clutch_count', parseFloat((status.vehicle.clutch_count + 1)));
			IKE.hud_refresh();
		}
	}
}

function parse_338(data) {
	// B2
	// 0 = Sport on (request by SMG transmission)
	// 1 = Sport off
	// 2 = Sport on
	// 3 = Sport error

	let parse = {
		msg     : '0x338',
		vehicle : {
			sport : {
				active : ((data.msg[2] === 0x00 || data.msg[2] === 0x02) && (data.msg[2] !== 0x01 && data.msg[2] !== 0x03)),
				error  : data.msg[2] === 0x03,
			},
		},
	};

	update.status('vehicle.sport.active', parse.vehicle.sport.active);
	update.status('vehicle.sport.error',  parse.vehicle.sport.error);

	return data;
}

// byte0, bit1 : Check engine
// byte0, bit3 : Cruise
// byte0, bit4 : EML
// byte0, bit7 : Check gas cap
//
// byte3, bit0 : Oil level error, if motortype = S62
// byte3, bit1 : Oil level warning
// byte3, bit2 : Oil level error
// byte3, bit3 : Overheat Light
// byte3, bit4 : M3/M5 tachometer light
// byte3, bit5 : M3/M5 tachometer light
// byte3, bit6 : M3/M5 tachometer light
//
// byte4 : Oil temperature (ºC = X - 48)
// byte5 : Charge light (0 = off, 1 = on; only used on some DMEs)
// byte6 : CSL oil level (format unclear)
// byte7 : Possibly MSS54 TPM trigger
function parse_545(data) {
	let consumption_current = ((data.msg[2] << 8) + data.msg[1]);

	// Need at least one value first
	if (DME1.consumption_last === 0) {
		DME1.consumption_last = consumption_current;
		return;
	}

	// The amount of fuel being consumed isn't a flat number
	// It's the difference between two numbers factoring in the time between the time both numbers were received

	let parse = {
		fuel : {
			consumption : consumption_current - DME1.consumption_last,
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

	DME1.consumption_last = consumption_current;

	// Calculate fahrenheit temperature values
	parse.temperature.oil.f = parseFloat(convert(parse.temperature.oil.c).from('celsius').to('fahrenheit'));

	// Update status object
	update.status('dme1.status.check_engine',  parse.status.check_engine);
	update.status('dme1.status.check_gas_cap', parse.status.check_gas_cap);
	update.status('dme1.status.cruise',        parse.status.cruise);
	update.status('dme1.status.eml',           parse.status.eml);

	update.status('fuel.consumption', parse.fuel.consumption, false);

	update.status('temperature.oil.f', parse.temperature.oil.f, false);

	// Trigger a HUD refresh if oil temp is updated
	if (update.status('temperature.oil.c', parse.temperature.oil.c)) IKE.hud_refresh();
}


// byte0 : Odometer LSB
// byte1 : Odometer MSB
// byte2 : Fuel level
// byte3 : Running clock LSB
// byte4 : Running clock MSB
//
// Running clock = minutes since last time battery power was lost
//
// This is actually sent by IKE1
function parse_613(data) {
	let parse = {
		vehicle : {
			odometer : {
				km : ((data.msg[1] << 8) + data.msg[0]) * 10,
				mi : null,
			},

			running_clock : ((data.msg[4] << 8) + data.msg[3]),
		},

		fuel : {
			level  : null,
			liters : (data.msg[2] >= 0x80) && data.msg[2] - 0x80 || data.msg[2],
		},
	};

	parse.fuel.level = Math.round((parse.fuel.liters / config.fuel.liters_max) * 100);
	if (parse.fuel.level < 0)   parse.fuel.level = 0;
	if (parse.fuel.level > 100) parse.fuel.level = 100;

	update.status('fuel.level',  parse.fuel.level);
	update.status('fuel.liters', parse.fuel.liters, false);

	parse.vehicle.odometer.mi = Math.round(convert(parse.vehicle.odometer.km).from('kilometre').to('us mile'));

	update.status('vehicle.odometer.km', parse.vehicle.odometer.km, false);
	update.status('vehicle.odometer.mi', parse.vehicle.odometer.mi);

	update.status('vehicle.running_clock', parse.vehicle.running_clock);
}

// ARBID: 0x615 sent from the instrument cluster
function parse_615(data) {
	// byte0 : AC signal, 0x80 when on, other bits say something else (load, aux fan speed request? system pressure?)
	// byte1 : 0x04 = headlights/parking lights on
	// byte2 : ??
	// byte3 : Outside air temperature
	// byte4 : 0x01 = Driver door open, 0x02 = handbrake up
	// byte5 : 0x02 = Left turn signal, 0x04 = Right turn signal, 0x06 = hazards

	let parse = {
		engine : {
			ac_request    : data.msg[0],
			aux_fan_speed : (data.msg[0] >= 0x80) && data.msg[0] - 0x80 || data.msg[0],
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
	parse.temperature.exterior.c = Math.round(parse.temperature.exterior.c);
	parse.temperature.exterior.f = Math.round(parse.temperature.exterior.f);

	// Update status object
	update.status('engine.ac_request',    parse.engine.ac_request);
	update.status('engine.aux_fan_speed', parse.engine.aux_fan_speed);

	update.status('temperature.exterior.c', parse.temperature.exterior.c);
	update.status('temperature.exterior.f', parse.temperature.exterior.f, false);

	update.status('vehicle.handbrake', parse.vehicle.handbrake);
}

// ARBID: 0x720 sent from MSS5x on secondary CANBUS - connector X60002 at pins 21 (low) and 22 (high)
// B0 = Coolant temp
// B1 = Intake temp
// B2 = Exhaust gas temp
// B3 = Oil temp
// B4 = Voltage * 10
// B5,B6 = Speed
// B7 = Fuel pump duty cycle
//
// Example : [ 0x40, 0x4A, 0x03, 0x3E, 0x7C, 0x00, 0x00, 0x00 ]
function parse_720(data) {
	let parse = {
		dme1 : {
			voltage : data.msg[4] / 10,
		},

		fuel : {
			pump : {
				duty    : data.msg[7],
				percent : parseFloat((data.msg[7] / 255).toFixed(4)) * 100,
			},
		},

		temperature : {
			coolant : {
				c : data.msg[0] - 48,
				f : null,
			},

			exhaust : {
				c : data.msg[2] << 2,
				f : null,
			},

			oil : {
				c : data.msg[3] - 48,
				f : null,
			},

			intake : {
				c : data.msg[1] - 48,
				f : null,
			},
		},
	};

	// Calculate fahrenheit temperature values
	parse.temperature.coolant.f = parseFloat(convert(parse.temperature.coolant.c).from('celsius').to('fahrenheit'));
	parse.temperature.exhaust.f = parseFloat(convert(parse.temperature.exhaust.c).from('celsius').to('fahrenheit'));
	parse.temperature.intake.f  = parseFloat(convert(parse.temperature.intake.c).from('celsius').to('fahrenheit'));
	parse.temperature.oil.f     = parseFloat(convert(parse.temperature.oil.c).from('celsius').to('fahrenheit'));

	update.status('fuel.pump.duty',    parse.fuel.pump.duty);
	update.status('fuel.pump.percent', parse.fuel.pump.percent);

	// Update status object
	// update.status('temperature.coolant.c', parse.temperature.coolant.c);
	// update.status('temperature.coolant.f', parse.temperature.coolant.f, false);
	update.status('temperature.exhaust.c', parse.temperature.exhaust.c);
	update.status('temperature.exhaust.f', parse.temperature.exhaust.f, false);
	update.status('temperature.intake.c',  parse.temperature.intake.c);
	update.status('temperature.intake.f',  parse.temperature.intake.f, false);
	// update.status('temperature.oil.c',     parse.temperature.oil.c);
	// update.status('temperature.oil.f',     parse.temperature.oil.f, false);

	update.status('dme1.voltage', parse.dme1.voltage, false);
}


// Parse data sent from module
function parse_out(data) {
	data.command = 'bro';

	switch (data.src.id) {
		case 0x316:
			data.value = 'AC clutch/Throttle/RPM';
			parse_316(data);
			break;

		case 0x329:
			data.value = 'Temp/Brake pedal depressed/Throttle position';
			parse_329(data);
			break;

		case 0x338:
			data.value = 'Sport mode status';
			parse_338(data);
			break;

		case 0x545:
			data.value = 'CEL/Fuel cons/Overheat/Oil temp/Charging/Brake light switch/Cruise control';
			parse_545(data);
			break;

		case 0x610:
			data.value = 'VIN/info';
			break;

		case 0x613:
			data.value = 'Odometer/Running clock/Fuel level [0x615 ACK]';
			parse_613(data);
			break;

		case 0x615:
			data.value = 'A/C request/Outside air temp/Parking brake/door contacts';
			parse_615(data);
			break;

		case 0x720:
			data.value = 'Coolant temp/Intake air temp/Exhaust gas temp/Oil temp/Voltage/Speed/Fuel pump duty';
			parse_720(data);
			break;

		default:
			data.value = data.src.id.toString(16);
	}

	// log.bus(data);
}


function init_listeners() {
	// If configured, send RPM 10000 on 0x316 on ignition in run
	update.on('status.vehicle.ignition', (data) => {
		if (data.new !== 'run') return;
		if (config.ike.sweep !== true) return;

		encode_316(10000);
	});

	log.msg('Initialized listeners');
}


module.exports = {
	// Variables
	consumption_last : 0,

	// Functions
	parse_out : parse_out,

	encode_316 : encode_316,

	init_listeners : init_listeners,
};
