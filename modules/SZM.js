function decode_button(data) {
	data.command = 'bro';
	data.value   = 'Button operation';

	let button;
	let state;

	// Detect depress/release
	switch (data.msg[0]) {
		case 0xFC : state = 'release'; break;
		case 0xFD : state = 'depress'; break;
		default   : state = 'unknown';
	}

	switch (data.src.id) {
		case 0x1EB : button = 'active.seat.driver';        break;
		case 0x1EC : button = 'active.seat.passenger';     break;
		case 0x1ED : button = 'active.backrest.driver';    break;
		case 0x1EF : button = 'active.backrest.passenger'; break;
		case 0x317 : button = 'pdc';                       break;
		case 0x319 : button = 'rdc';                       break;

		default : button = 'unknown';
	}

	// Update status object
	update.status('szm.button.' + button + '.state', state, false);

	// Translate SZM messages for active backrest to active seat equivalent
	// TODO Add config option for translation operations
	switch (button) {
		case 'active.backrest.driver'    : encode_button('active.seat.driver',    state); break;
		case 'active.backrest.passenger' : encode_button('active.seat.passenger', state); break;
	}

	switch (state) {
		case 'release' : {
			switch (button) {
				case 'pdc' : {
					// Toggle NBT video source to display reverse camera
					NBT.video_source('toggle');
					break;
				}
			}

			break;
		}
	}

	return data;
}

// Generate a SZM button press CANBUS message
function encode_button(button, state) {
	let cmd_data = {
		id  : null,
		msg : [ 0x00, 0xFF ],
	};

	// Determine ARBID value
	switch (button) {
		case 'active.seat.driver'        : cmd_data.id = 0x1EB; break;
		case 'active.seat.passenger'     : cmd_data.id = 0x1EC; break;
		case 'active.backrest.driver'    : cmd_data.id = 0x1ED; break;
		case 'active.backrest.passenger' : cmd_data.id = 0x1EF; break;
		case 'pdc'                       : cmd_data.id = 0x317; break;
		case 'rdc'                       : cmd_data.id = 0x319; break;
	}

	// Determine state byte value
	switch (state) {
		case 'depress' : cmd_data.msg[0] = 0xFD; break;
		case 'release' : cmd_data.msg[0] = 0xFC; break;
	}

	log.module('Sending ' + button + ' button ' + state + ' state message');

	// Send message
	bus.data.send({
		bus  : config.szm.can_intf,
		id   : cmd_data.id,
		data : Buffer.from(cmd_data.msg),
	});
}


// Parse data sent from module
function parse_out(data) {
	switch (data.src.id) {
		case 0x1EB :
		case 0x1EC :
		case 0x1ED :
		case 0x1EF :
		case 0x317 :
		case 0x319 : return decode_button(data);

		default : data.value = data.src.id.toString(16);
	}

	return data;
}


module.exports = {
	encode_button : encode_button,
	parse_out     : parse_out,
};
