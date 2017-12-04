/* eslint key-spacing : 0 */

// Decode media button action message
function decode_button_media(data) {
	data.command = 'con';
	data.value   = 'media button - ';

	// Bitmask:
	// 0x00 : Nothing
	// 0x01 : button : right
	// 0x02 : ??
	// 0x04 : ??
	// 0x08 : button : left
	// 0x10 : action : hold
	// 0x20 : action : release
	// 0x40 : ??
	// 0x80 : button : voice command (sneezing man)

	let mask   = bitmask.check(data.msg[1]).mask;
	let unmask = {
		actions : {
			depress : !mask.bit4 && !mask.bit5 && !mask.bit8,
			hold    : mask.bit4  && !mask.bit5 && !mask.bit8,
			release : !mask.bit4 &&  mask.bit5 && !mask.bit8,
		},
		buttons : {
			right : mask.bit0  && !mask.bit3 && !mask.bit7 && !mask.bit8,
			left  : !mask.bit0 &&  mask.bit3 && !mask.bit7 && !mask.bit8,
			voice : !mask.bit0 && !mask.bit3 &&  mask.bit7 && !mask.bit8,
			none  : !mask.bit0 && !mask.bit3 && !mask.bit7 &&  mask.bit8,
		},
	};

	// Loop action object to populate log string
	for (let action in unmask.actions) {
		if (unmask.actions[action] === true) {
			unmask.action = action;
			break;
		}
	}

	// Loop button object to populate log string
	for (let button in unmask.buttons) {
		if (unmask.buttons[button] === true) {
			unmask.button = button;
			break;
		}
	}

	// Assemble log string and output message
	data.value += unmask.action + ' ' + unmask.button;

	// If media control is disabled, return here
	if (config.mfl.media === false) return data;

	switch (unmask.action) {
		case 'hold' : {
			switch (config.mfl.media) {
				case 'bluetooth' : // Bluetooth version
					switch (unmask.button) {
						case 'left'  : break;
						case 'right' : break;
						case 'voice' : BT.command('play'); break; // Think about it
					}
					break;

				case 'kodi' : // Kodi version
					switch (unmask.button) {
						case 'left'  : kodi.command('seek-rewind'); break;
						case 'right' : kodi.command('seek-forward'); break;
						case 'voice' : break;
					}
			}
			break;
		}

		case 'release' : {
			switch (config.mfl.media) {
				case 'bluetooth' : // Bluetooth version
					switch (status.mfl.last.action + status.mfl.last.button) {
						case 'depressleft'  : BT.command('previous'); break;
						case 'depressright' : BT.command('next');     break;
						case 'depressvoice' : BT.command('pause');    break; // Think about it

						case 'holdleft'  : break;
						case 'holdright' : break;
						case 'holdvoice' : break;
					}
					break;

				case 'kodi' : // Kodi version
					switch (status.mfl.last.action + status.mfl.last.button) {
						case 'depressleft'  : kodi.command('previous'); break;
						case 'depressright' : kodi.command('next');     break;
						case 'depressvoice' : kodi.command('toggle');   break;

						case 'holdleft'  : kodi.command('toggle'); break;
						case 'holdright' : kodi.command('toggle'); break;
						case 'holdvoice' : break;
					}
			}
			break;
		}
	}

	// case 'depress' :

	// Update status object with the new data
	update.status('mfl.last.action', unmask.action);
	update.status('mfl.last.button', unmask.button);

	return data;
}

// Decode recirculation button action message
function decode_button_recirc(data) {
	data.command = 'con';
	data.value   = 'recirculation button - ';

	switch (data.msg[1]) {
		case 0x00 : data.value += 'release'; break;
		case 0x08 : data.value += 'depress';
	}

	return data;
}

// Parse data sent from MFL module
function parse_out(data) {
	// 50 B0 01,MFL --> SES: Device status request
	// 50 C8 01,MFL --> TEL: Device status request

	switch (data.msg[0]) {
		case 0x3A: // Button: Recirculation
			data = decode_button_recirc(data);
			break;

		case 0x3B: // Button: Media
			data = decode_button_media(data);
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
	}

	log.bus(data);
}

module.exports = {
	parse_out : parse_out,
};
