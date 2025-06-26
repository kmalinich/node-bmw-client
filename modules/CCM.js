import hex from '../share/hex.js';

// Broadcast: check control message
function parse_cc_message(data) {
	data.command = 'bro';

	const checkControlMessage = hex.h2s(data.msg);

	data.value = `TODO: check control message - values: ${hex.i2s(data.msg[1])} ${hex.i2s(data.msg[2])} - message: ${checkControlMessage}`;
	console.dir({ msg : data.msg, checkControlMessage });

	return data;
}

// Broadcast: check control sensors
function parse_cc_sensors(data) {
	data.command = 'bro';
	data.value   = 'check control sensors - ';

	const mask = bitmask.check(data.msg[1]).mask;

	const checkControlMessages = {
		none : (data.msg[1] === 0x00),

		keyInIgnition       : mask.b2,
		seatbeltNotFastened : mask.b3,

		bit4 : mask.bit4,
		bit5 : mask.bit5,
		bit6 : mask.bit6,
		bit7 : mask.bit7,
	};

	let checkControlString = '';

	for (const checkControlMessage in checkControlMessages) {
		if (checkControlMessages[checkControlMessage] !== true) continue;
		checkControlString += checkControlMessage + ' ';
	}

	data.value = checkControlString.trim();

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


export default {
	parse_out,
};
