const module_name = __filename.slice(__dirname.length + 1, -3);

function logmod(string) {
	log.msg({
		src : module_name,
		msg : string,
	});
};

// Parse data sent from module
function parse_out(data) {
	data.command = 'bro';

	switch (data.src.id) {
		case 0x153:
			data.value = 'Speed/DSC light';
			break;

		case 0x1F0:
			data.value = 'Wheel speeds';
			break;

		case 0x1F3:
			data.value = 'Transverse acceleration';
			break;

		case 0x1F5:
			data.value = 'Steering angle';
			break;

		case 0x1F8:
			data.value = 'Brake pressure';
			break;

		default:
			data.value = data.src.id.toString(16);
	}

	// log.bus(data);
}

module.exports = {
	parse_out : (data) => { parse_out(data); },
};
