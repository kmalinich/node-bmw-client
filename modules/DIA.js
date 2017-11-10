// Parse data sent from module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x00:
			data.command = 'req';
			data.value   = 'identity';
			break;

		case 0x08:
			data.command = 'req';
			data.value   = 'coding-data';
			break;

		case 0x09:
			data.command = 'con';
			data.value   = 'coding-data';
			break;

		case 0x0B:
			data.command = 'req';
			data.value   = 'io-status';
			break;

		case 0x0C:
			data.command = 'con';
			data.value   = 'io-status';
			break;

		case 0xB8:
			data.command = 'req';
			data.value   = 'motor-values';
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
	}

	log.bus(data);
}

module.exports = {
	parse_out : parse_out,
};
