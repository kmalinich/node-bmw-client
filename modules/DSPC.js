// Parse data sent to DSPC module
function parse_in(data) {
	switch (data.msg[0]) {
		case 0x35 : { // Broadcast: DSP Car memory
			return data; // This is handled inside of DSP
		}
	}

	return data;
}

// Parse data sent from DSPC module
function parse_out(data) {
	return data;
}


module.exports = {
	parse_in  : parse_in,
	parse_out : parse_out,
};
