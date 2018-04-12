const convert = require('node-unit-conversion');


// This is dangerous and awesome if you can see what it does
function encode_316(rpm = 10000) {
	// Bounce if can0 is not enabled
	if (config.bus.can0.enabled !== true) return;

	let rpm_encoded = Math.floor(rpm * 6.4).toString(16).padStart(4, '0');

	let rpm_0 = parseInt('0x' + rpm_encoded.substring(2, 4)) || 0; // LSB
	let rpm_1 = parseInt('0x' + rpm_encoded.substring(0, 2)) || 0; // MSB

	let msg = [ 0x05, 0x16, rpm_0, rpm_1, 0x16, 0x18, 0x00, 0x16 ];

	let count = 1000;

	// Send packets
	for (let i = 0; i < count; i++) {
		setTimeout(() => {
			bus.data.send({
				bus  : 'can0',
				id   : 0x316,
				data : Buffer.from(msg),
			});
		}, (i / 100));
	}

	log.module('Sent ' + count + 'x encoded CANBUS packets, ARBID 0x316, with RPM : ' + rpm);
}

function parse_316(data) {
	let mask_0 = bitmask.check(data.msg[0]).mask;

	let parse = {
		ac_clutch : mask_0.b7,

		rpm : parseFloat((parseInt('0x' + data.msg[3].toString(16).padStart(2, '0') + data.msg[2].toString(16).padStart(2, '0')) / 6.4).toFixed(0)),

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

	update.status('engine.speed', parse.rpm, false);

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

	let parse = {
		engine : {
			throttle : {
				cruise : parseFloat((data.msg[4] / 2.54).toFixed(1)),
				pedal  : parseFloat((data.msg[5] / 2.54).toFixed(1)),
			},

			atmospheric_pressure : {
				mbar : (data.msg[2] * 2) + 597,
				mmhg : null,
				psi  : null,
			},
		},

		temperature : {
			coolant : {
				c : parseFloat(((data.msg[1] * 0.75) - 48.373).toFixed(2)),
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
	parse.temperature.coolant.f = parseFloat(convert(parse.temperature.coolant.c).from('celsius').to('fahrenheit'));

	// Round temperature values
	parse.temperature.coolant.c = Math.round(parse.temperature.coolant.c);
	parse.temperature.coolant.f = Math.round(parse.temperature.coolant.f);

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

	update.status('engine.throttle.cruise', parse.engine.throttle.cruise);
	update.status('engine.throttle.pedal',  parse.engine.throttle.pedal);

	update.status('temperature.coolant.f', parse.temperature.coolant.f, false);

	update.status('vehicle.sport.active', parse.vehicle.sport.active);

	// Trigger a HUD refresh if coolant temp is updated
	if (update.status('temperature.coolant.c', parse.temperature.coolant.c)) IKE.hud_refresh();

	update.status('vehicle.brake',  parse.vehicle.brake);
	update.status('vehicle.clutch', parse.vehicle.clutch);
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
	let consumption_current = parseFloat((parseInt('0x' + data.msg[2].toString(16).padStart(2, '0') + data.msg[1].toString(16).padStart(2, '0'))).toFixed(0));

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
				c : parseFloat((data.msg[4] - 48.373).toFixed(2)),
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
				km : parseFloat((parseInt('0x' + data.msg[1].toString(16).padStart(2, '0') + data.msg[0].toString(16)) * 10).toFixed(0)),
				mi : null,
			},

			running_clock : parseFloat((parseInt('0x' + data.msg[4].toString(16).padStart(2, '0') + data.msg[3].toString(16))).toFixed(0)),
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
			aux_fan_speed : data.msg[0] - 0x80,
		},

		temperature : {
			exterior : {
				c : (data.msg[3] >= 0x80) && data.msg[3] - 0x80 || data.msg[3],
				f : null,
			},

			// This isn't right
			intake : {
				c : (data.msg[6] >= 0x80) && data.msg[6] - 0x80 || data.msg[6],
				f : null,
			},
		},

		vehicle : {
			handbrake : bitmask.test(data.msg[4], 0x02),
		},
	};

	// Calculate fahrenheit temperature values
	parse.temperature.exterior.f = parseFloat(convert(parse.temperature.exterior.c).from('celsius').to('fahrenheit'));
	parse.temperature.intake.f   = parseFloat(convert(parse.temperature.intake.c).from('celsius').to('fahrenheit'));

	// Round temperature values
	parse.temperature.exterior.c = Math.round(parse.temperature.exterior.c);
	parse.temperature.exterior.f = Math.round(parse.temperature.exterior.f);
	parse.temperature.intake.c   = Math.round(parse.temperature.intake.c);
	parse.temperature.intake.f   = Math.round(parse.temperature.intake.f);

	// Update status object
	update.status('engine.ac_request',    parse.engine.ac_request);
	update.status('engine.aux_fan_speed', parse.engine.aux_fan_speed);

	update.status('temperature.exterior.c', parse.temperature.exterior.c);
	update.status('temperature.exterior.f', parse.temperature.exterior.f, false);

	update.status('vehicle.handbrake', parse.vehicle.handbrake);

	update.status('temperature.intake.c', parse.temperature.intake.c);
	update.status('temperature.intake.f', parse.temperature.intake.f, false);
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
			data.value = 'A/C request/Outside air temp/Intake air temp/Parking brake/door contacts';
			parse_615(data);
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
