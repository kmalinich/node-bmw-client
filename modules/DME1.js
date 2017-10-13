const convert = require('node-unit-conversion');

function parse_316(data) {
	let parse = {
		arbid     : '0x316',
		msg       : data.msg_f,
		rpm       : parseFloat((parseInt('0x' + data.msg[3].toString(16) + data.msg[2].toString(16)) / 6.4).toFixed(0)),
		ac_clutch : bitmask.test(data.msg[0], 0x40),
		key       : {
			acc   : bitmask.test(data.msg[0], 0x01),
			run   : bitmask.test(data.msg[0], 0x04),
			start : bitmask.test(data.msg[0], 0x10),
		},
		torque : {
			after_interventions  : parseFloat((data.msg[1] / 2.54).toFixed(1)),
			before_interventions : parseFloat((data.msg[4] / 2.54).toFixed(1)),
			loss                 : parseFloat((data.msg[5] / 2.54).toFixed(1)),
			output               : parseFloat((data.msg[7] / 2.54).toFixed(1)),
		},
	};

	update.status('engine.speed',     parse.rpm, false);
	update.status('engine.ac_clutch', parse.ac_clutch);

	update.status('engine.torque.after_interventions',  parse.torque.after_interventions,  false);
	update.status('engine.torque.before_interventions', parse.torque.before_interventions, false);
	update.status('engine.torque.loss',                 parse.torque.loss,                 false);
	update.status('engine.torque.output',               parse.torque.output,               false);
}

function parse_329(data) {
	let parse = {
		msg    : '0x329',
		engine : {
			throttle : {
				cruise : parseFloat((data.msg[4] / 2.54).toFixed(2)),
				pedal  : parseFloat((data.msg[5] / 2.54).toFixed(2)),
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

function parse_545(data) {
	let consumption_current = parseFloat((parseInt('0x' + data.msg[2].toString(16) + data.msg[1].toString(16))).toFixed(0));

	if (consumption_current === DME1.consumption_last) return;

	let parse = {
		msg  : '0x545',
		fuel : {
			consumption : consumption_current - DME1.consumption_last,
		},
	};

	DME1.consumption_last = consumption_current;

	// update.status('fuel.consumption', parse.fuel.consumption);
}


function parse_613(data) {
	let parse = {
		msg  : '0x613',
		fuel : {
			level  : null,
			liters : (data.msg[2] >= 0x80) && data.msg[2] - 0x80 || data.msg[2],
		},
	};

	parse.fuel.level = parseFloat((parse.fuel.liters / config.fuel.liters_max).toFixed(2));

	update.status('fuel.level',  parse.fuel.level);
	update.status('fuel.liters', parse.fuel.liters);
}

function parse_615(data) {
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

		case 0x545:
			parse_545(data);
			data.value = 'CEL/Fuel cons/Overheat/Oil temp/Charging/Brake light switch/Cruise control';
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
	consumption_last : 0,

	parse_out : (data) => { parse_out(data); },
};
