function parse_1b4(data) {
	update.status('vehicle.speed.mph', vehicle_speed_mph);

	if (update.status('vehicle.speed.kmh', vehicle_speed_kmh)) {
		if (config.translate.kombi.speed === true) {
			// Re-encode this message as CANBUS ARBID 0x1A1
			DSC.encode_1a1(vehicle_speed_kmh);
		}
	}
}


// Parse data sent from module
function parse_out(data) {
	data.command = 'bro';

	switch (data.src.id) {
		case 0x1B4 : parse_1b4(data); data.value = 'Seat status, front left'; break;
		case 0x1EB : 
		case 0x1EC
		case 0x1ED
		case 0x1EF
		case 0x317

		default : data.value = data.src.id.toString(16);
	}
}


module.exports = {
	parse_out : parse_out,
};


