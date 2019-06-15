const convert = require('node-unit-conversion');


// Parse vehicle speed LSB and MSB into KPH value
function parse_speed(byte0, byte1) {
	return (((byte0 & 0xFF) | ((byte1 & 0x0F) << 8)) / 16);
}


function parse_1b4(data) {
	data.value = 'Vehicle speed';

	let vehicle_speed_kmh = parse_speed(data.msg[0], data.msg[1]);

	// Calculate vehicle speed value in MPH
	let vehicle_speed_mph = Math.floor(convert(vehicle_speed_kmh).from('kilometre').to('us mile'));

	update.status('vehicle.speed.mph', vehicle_speed_mph);

	if (update.status('vehicle.speed.kmh', vehicle_speed_kmh)) {
		if (config.translate.kombi.speed === true) {
			// Re-encode this message as CANBUS ARBID 0x1A1
			DSC.encode_1a1(vehicle_speed_kmh);
		}
	}

	return data;
}


// Parse data sent from module
function parse_out(data) {
	data.command = 'bro';

	switch (data.src.id) {
		case 0x1B4 : return parse_1b4(data);

		default : data.value = data.src.id.toString(16);
	}

	return data;
}


module.exports = {
	parse_out : parse_out,
};
