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
			id   : 0x56,
			name : module_name,
		};
	}

	if (data.msg == null || typeof data.msg == 'undefined') {
		data.msg = [ 0xFF ];
	}

	log.bus(data);
}

module.exports = {
	parse_out : (data) => { parse_out(data); },
};
