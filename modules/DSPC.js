// Parse data sent to DSPC module
function parse_in(data) {
	switch (data.msg[0]) {
		case 0x35 : { // Broadcast: car memory
			return; // This is handled inside of DSP
		}

		default : {
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
		}
	}
}

// Parse data sent from DSPC module
function parse_out(data) {
	switch (data.msg[0]) {
		default : {
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
		}
	}

	return data;
}


module.exports = {
	parse_in  : parse_in,
	parse_out : parse_out,
};
