const convert = require('node-unit-conversion');

// This is dangerous and awesome if you can see what it does
function encode_316(rpm) {
	let rpm_encoded;

	rpm_encoded = Math.round(rpm * 6.4).toString(16);

	if (rpm_encoded.length !== 4) rpm_encoded = '0' + rpm_encoded;

	let msg = [ 0x05, 0x16, parseInt('0x' + rpm_encoded.substring(2, 4)), parseInt('0x' + rpm_encoded.substring(0, 2)), 0x16, 0x18, 0x00, 0x16 ];

	// Send packet 100x
	for (let i = 0; i < 100; i++) {
		bus.data.send({
			bus  : 'can0',
			id   : 0x316,
			data : Buffer.from(msg),
		});
	}

	log.msg('Sent 100x encoded CANBUS packets, ARBID 0x316, with RPM : ' + rpm);
}

function parse_316(data) {
	let parse = {
		arbid     : '0x316',
		msg       : data.msg_f,
		rpm       : parseFloat((parseInt('0x' + data.msg[3].toString(16) + data.msg[2].toString(16)) / 6.4).toFixed(0)),
		ac_clutch : bitmask.test(data.msg[0], 0x40),
		key       : {
			acc   : bitmask.test(data.msg[0], 0x04), // This appears backwards,
			run   : bitmask.test(data.msg[0], 0x01), // but is actually correct
			start : bitmask.test(data.msg[0], 0x10),
		},
		torque : {
			after_interventions  : parseFloat((data.msg[1] / 2.54).toFixed(1)),
			before_interventions : parseFloat((data.msg[4] / 2.54).toFixed(1)),
			loss                 : parseFloat((data.msg[5] / 2.54).toFixed(1)),
			output               : parseFloat((data.msg[7] / 2.54).toFixed(1)),
		},
	};

	// horsepower = (torque * RPM)/5252

	// Occasionally the RPM is parses as something less than 50.. no idea why
	if (status.engine.speed - parse.rpm < 500 || parse.rpm === 0) update.status('engine.speed', parse.rpm, false);

	update.status('engine.ac_clutch', parse.ac_clutch);

	update.status('engine.torque.after_interventions',  parse.torque.after_interventions,  false);
	update.status('engine.torque.before_interventions', parse.torque.before_interventions, false);
	update.status('engine.torque.loss',                 parse.torque.loss,                 false);
	update.status('engine.torque.output',               parse.torque.output,               false);
}

function parse_329(data) {
	// Byte 3
	// bit 0 - Clutch switch (0 = engaged, 1 = disengage/neutral);
	// bit 2 - Hardcoded to 1 (on MSS54, could be used on other DMEs)
	// bit 4 - Possibly motor status (0 = on, 1 = off)
	// bits 5, 6, 7 - Tank evap duty cycle

	let parse = {
		msg    : '0x329',
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
			kickdown : bitmask.test(data.msg[6], 0x08),
			cruise   : {
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
	update.status('engine.atmospheric_pressure.mbar', parse.engine.atmospheric_pressure.mbar);
	update.status('engine.atmospheric_pressure.mmhg', parse.engine.atmospheric_pressure.mmhg);
	update.status('engine.atmospheric_pressure.psi',  parse.engine.atmospheric_pressure.psi);

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

	update.status('temperature.coolant.f', parse.temperature.coolant.f);

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

function parse_545(data) {
	// Byte 3
	// bit 0 - Oil level error, if motortype = S62
	// bit 1 - Oil level warning
	// bit 2 - Oil level error
	// bit 3 - Overheat Light
	// bit 4, 5, 6 - M3/M5 RPM warning field (refer to tables below)
	// Byte 4 - Oil temperature (ºC = X - 48)
	// Byte 5 - Charge light (0 = off, 1 = on; only used on some DMEs)
	// Byte 6 - CSL oil level (format unclear)
	// Byte 7 - Possibly MSS54 TPM trigger

	let consumption_current = parseFloat((parseInt('0x' + data.msg[2].toString(16) + data.msg[1].toString(16))).toFixed(0));

	// Need at least one value first
	if (DME1.consumption_last === 0) {
		DME1.consumption_last = consumption_current;
		return;
	}

	// if (consumption_current === DME1.consumption_last) return;

	let parse = {
		msg : '0x545',

		// Byte0, Bit1 : Check engine
		// Byte0, Bit3 : Cruise
		// Byte0, Bit4 : EML
		// Byte0, Bit7 : Check gas cap
		status : {
			check_engine  : bitmask.test(data.msg[0], bitmask.b[1]),
			check_gas_cap : bitmask.test(data.msg[0], bitmask.b[7]),
			cruise        : bitmask.test(data.msg[0], bitmask.b[3]),
			eml           : bitmask.test(data.msg[0], bitmask.b[4]),
		},
		fuel : {
			consumption : consumption_current - DME1.consumption_last,
		},
		temperature : {
			oil : {
				c : parseFloat(((data.msg[4] * 0.75) - 48.373).toFixed(2)),
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

	update.status('temperature.oil.f', parse.temperature.oil.f);

	// Trigger a HUD refresh if oil temp is updated
	if (update.status('temperature.oil.c', parse.temperature.oil.c)) IKE.hud_refresh();
}


function parse_613(data) {
	// B0 : Odometer LSB
	// B1 : Odometer MSB [Convert from hex to decimal. multiply by 10 and that is odometer in km]
	// B2 : Fuel level : Full is hex 39, fuel light comes on at hex 8. Then values jump to hex 87 (or so) and then go down to hex 80 being empty
	// B3 : Running Clock LSB
	// B4 : Running Clock MSB minutes since last time battery power was lost

	let parse = {
		msg  : '0x613',
		fuel : {
			level  : null,
			liters : (data.msg[2] >= 0x80) && data.msg[2] - 0x80 || data.msg[2],
		},
	};

	parse.fuel.level = Math.round((parse.fuel.liters / config.fuel.liters_max) * 100);
	if (parse.fuel.level < 0)   parse.fuel.level = 0;
	if (parse.fuel.level > 100) parse.fuel.level = 100;

	update.status('fuel.level',  parse.fuel.level);
	update.status('fuel.liters', parse.fuel.liters);
}

function parse_615(data) {
	// ARBID: 0x615 sent from the instrument cluster
	// -B0 AC signal. Hex 80 when on (10000000) Other bits say something else (Load, Aux fan speed request? system pressure?)
	// -B1 4 when headlights/parking lights on
	// -B2
	// -B3 Outside Air Temperature: x being temperature in Deg C, (x>=0 deg C,DEC2HEX(x),DEC2HEX(-x)+128) x range min -40 C max 50 C
	// -B4 1 = Driver door open; 2 = handbrake up
	// -B5 2 = Left turn signal, 4 = Right turn signal, 6 = hazards

	let parse = {
		msg    : '0x615',
		engine : {
			ac_request    : data.msg[0],
			aux_fan_speed : data.msg[1],
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
	update.status('temperature.exterior.f', parse.temperature.exterior.f);

	update.status('vehicle.handbrake', parse.vehicle.handbrake);

	// update.status('temperature.intake.c', parse.temperature.intake.c);
	// update.status('temperature.intake.f', parse.temperature.intake.f);
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

module.exports = {
	// Variables
	consumption_last : 0,

	// Functions
	parse_out : parse_out,

	encode_316 : encode_316,
};
