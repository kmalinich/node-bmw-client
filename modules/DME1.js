const module_name = __filename.slice(__dirname.length + 1, -3);

const convert = require('node-unit-conversion');

function logmod(string) {
	log.msg({
		src : module_name,
		msg : string,
	});
};

function parse_316(data) {
	let parse = {
		arbid : '0x316',
		msg : data.msg_f,
		rpm : parseFloat((parseInt('0x'+data.msg[3].toString(16)+data.msg[2].toString(16))/6.4).toFixed(0)),
		ac_clutch : bitmask.test(data.msg[0], 0x40),
		key : {
			acc   : bitmask.test(data.msg[0], 0x01),
			run   : bitmask.test(data.msg[0], 0x04),
			start : bitmask.test(data.msg[0], 0x10),
		},
		throttle : {
			current : (data.msg[1]/2.54).toFixed(2),
			target  : (data.msg[4]/2.54).toFixed(2),
		},
	};

	// let upd1 = update.status('engine.speed',            parse.rpm);
	let upd2 = update.status('engine.ac_clutch',        parse.ac_clutch);
	let upd3 = update.status('engine.throttle.current', parse.throttle.current);
	let upd4 = update.status('engine.throttle.target',  parse.throttle.target);
}

function lcd_update() {
	socket.lcd_text_tx({
		upper : 'THR|CLT|CHC|XXXXX',
		lower : Math.round(status.engine.throttle)+'%|'+Math.round(status.dme.coolant)+'C|'+status.vehicle.clutch,
	});
}

function parse_329(data) {
	let parse = {
		msg      : '0x329',
		clutch   : bitmask.test(data.msg[3], 0x01),
		throttle_pedal : parseFloat((data.msg[5]/2.54).toFixed(2)),
		coolant  : {
			c : parseFloat(((data.msg[1]*.75)-48.373).toFixed(2)),
		},
	};

	parse.coolant.f = parseFloat(convert(parse.coolant.c).from('celsius').to('fahrenheit'));

	let upd1 = update.status('vehicle.clutch', parse.clutch);
	let upd2 = update.status('engine.throttle.pedal', parse.throttle_pedal);
	let upd3 = update.status('temperature.coolant.c', parse.coolant.c);
	let upd4 = update.status('temperature.coolant.f', parse.coolant.f);

	if (upd3) lcd_update();
}


// Parse data sent from module
function parse_out(data) {
	data.command = 'bro';

	switch (data.src.id) {
		case 0x316:
			data.value = 'RPM';
			parse_316(data);
			break;

		case 0x329:
			data.value = 'Temp/Brake pedal depressed/Throttle position';
			parse_329(data);
			break;

		case 0x545:
			data.value = 'CEL/Fuel cons/Overheat/Oil temp/Charging/Brake light switch/Cruise control';
			break;

		case 0x610:
			data.value = 'VIN/info';
			break;

		case 0x613:
			data.value = 'Odometer/Running clock/Fuel level [0x615 ACK]';
			break;

		case 0x615:
			data.value = 'A/C request/Outside air temp/Intake air temp/Parking brake/door contacts';
			break;

		default:
			data.value = data.src.id.toString(16);
	}

	// log.bus(data);
}

module.exports = {
	parse_out : (data) => { parse_out(data); },
};
