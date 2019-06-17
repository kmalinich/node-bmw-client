const convert = require('node-unit-conversion');


// Parse vehicle speed LSB and MSB into KPH value
function parse_speed(byte0, byte1) {
	return (((byte0 & 0xFF) | ((byte1 & 0x0F) << 8)) / 16);
}

function gauge_sweep() {
	// Skip if chassis model is not e60 or KOMBI gauge sweep is not enabled
	if (config.kombi.sweep   !== true)  return;
	if (config.chassis.model !== 'e60') return;

	log.module('Executing KOMBI gauge sweep');

	// Speedo
	bus.data.send({
		bus  : config.kombi.can_intf,
		id   : 0x6F1,
		data : Buffer.from([ 0x60, 0x05, 0x30, 0x20, 0x06, 0x12, 0x3B, 0xFF ]),
	});

	// Tach
	setTimeout(() => {
		bus.data.send({
			bus  : config.kombi.can_intf,
			id   : 0x6F1,
			data : Buffer.from([ 0x60, 0x05, 0x30, 0x21, 0x06, 0x12, 0x0E, 0xFF ]),
		});

		setTimeout(() => {
			log.module('Executing KOMBI gauge reset');

			// Reset speedo
			bus.data.send({
				bus  : config.kombi.can_intf,
				id   : 0x6F1,
				data : Buffer.from([ 0x60, 0x03, 0x30, 0x20, 0x00, 0xFF, 0xFF, 0xFF ]),
			});

			// Reset tach
			setTimeout(() => {
				bus.data.send({
					bus  : config.kombi.can_intf,
					id   : 0x6F1,
					data : Buffer.from([ 0x60, 0x03, 0x30, 0x21, 0x00, 0xFF, 0xFF, 0xFF ]),
				});
			}, 50);
		}, 1500);
	}, 50);
}


function parse_1b4(data) {
	data.command = 'bro';
	data.value   = 'Vehicle speed';

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
	switch (data.src.id) {
		case 0x1B4 : return parse_1b4(data);

		default : data.value = data.src.id.toString(16);
	}

	return data;
}


module.exports = {
	gauge_sweep : gauge_sweep,

	parse_out : parse_out,
};
