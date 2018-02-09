function decode_gong_status(data) {
	data.command = 'bro';
	data.value   = 'TODO gong status ' + data.msg;

	return data;
}

// Parse data sent from module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x07 : { // Gong status
			data = decode_gong_status(data);
			break;
		}

		default : {
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
		}
	}

	log.bus(data);
}

module.exports = {
	parse_out : parse_out,
};
