// Broadcast: check control message
function parse_cc_message(data) {
	data.command = 'bro';

	const checkControlMessage = hex.h2s(data.msg.slice(3, 20));

	data.value = `TODO: check control message - values: ${hex.i2s(data.msg[1])} ${hex.i2s(data.msg[2])} - message: ${checkControlMessage}`;
	console.dir({ msg : data.msg });

	return data;
}

// Broadcast: check control sensors
function parse_cc_sensors(data) {
	data.command = 'bro';
	data.value   = 'check control sensors - ';

	// TODO: Le sigh.. this is a bitmask, not done properly
	switch (data.msg[1]) {
		case 0x00 : data.value += 'none';                  break;
		case 0x04 : data.value += 'key in ignition';       break;
		case 0x12 : data.value += 'seatbelt not fastened'; break;
		default   : data.value += hex.i2s(data.msg[1]);
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
	parse_out,
};
