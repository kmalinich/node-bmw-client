const module_name = __filename.slice(__dirname.length + 1, -3);

// Parse data sent from module
function parse_out(data) {
	switch (data.msg[0]) {
		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
	}

	if (data.dst == null || typeof data.dst == 'undefined') {
		data.dst = {
			id   : 0x12,
			name : module_name,
		};
	}

	if (data.msg[0] == null || typeof data.msg[0] == 'undefined') {
		data.msg = [ 0xFF ];
	}

	log.bus(data);
}

// Request various things from DME
function request(value) {
	// Init variables
	let src;
	let cmd;

	switch (value) {
		case 'motor-values':
			src = 'DIA';
			cmd = [ 0xB8, 0x12, 0xF1, 0x03, 0x22, 0x40, 0x00 ];
			break;
	}

	bus.data.send({
		src : src,
		dst : module_name,
		msg : cmd,
	});
}

module.exports = {
	request   : (data) => { request(data);   },
	parse_out : parse_out,
};
