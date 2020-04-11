function parse_eq_encode(data) {
	data.command = 'con';
	data.value   = 'TODO: DSP EQ';

	return data;
}


// Parse data sent to DSPC module
function parse_in(data) {
	switch (data.msg[0]) {
		case 0x35 : { // Broadcast: DSP Car memory
			return data; // TODO: This is handled inside of DSP
		}
	}

	return data;
}

// Parse data sent from DSPC module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x34 : return parse_eq_encode(data);
	}

	return data;
}


module.exports = {
	parse_in,
	parse_out,
};
