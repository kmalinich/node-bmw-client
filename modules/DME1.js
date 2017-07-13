const module_name = __filename.slice(__dirname.length + 1, -3);

// Parse data sent from module
function parse_out(data) {
	data.command = 'bro';

	switch (data.src.id) {
		case 0x316:
			data.value = 'RPM';
			break;

		case 0x329:
			data.value = 'Temp/Brake pedal depressed/Throttle position';
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

	log.bus(data);
}

module.exports = {
	parse_out : (data) => { parse_out(data); },
};
