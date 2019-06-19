// Broadcast: check control message
function parse_cc_message(data) {
	data.command = 'bro';
	data.value   = 'check control message TODO ' + hex.h2a(data.msg);

	return data;
}

// Broadcast: check control sensors
function parse_cc_sensors(data) {
	data.command = 'bro';
	data.value   = 'check control sensors - ';

	// TODO Le sigh.. this is a bitmask, not done properly
	switch (data.msg[1]) {
		case 0x00 : data.value += 'none';                  break;
		case 0x04 : data.value += 'key in ignition';       break;
		case 0x12 : data.value += 'seatbelt not fastened'; break;
		default   : data.value += data.msg[1];
	}

	return data;
}


// Parse data sent from CCM module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x1A : return parse_cc_message(data);
		case 0x51 : return parse_cc_sensors(data);
	}

	return data;
}


module.exports = {
	parse_out : parse_out,
};
