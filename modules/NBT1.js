// Parse data sent to module
function parse_in(data) {
	switch (data.msg[0]) {
		default : {
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
		}
	}

	log.bus(data);
}

// Parse data sent from module
function parse_out(data) {
	switch (data.msg[0]) {
		default : {
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
		}
	}

	log.bus(data);
}

module.exports = {
	parse_in  : parse_in,
	parse_out : parse_out,
};
