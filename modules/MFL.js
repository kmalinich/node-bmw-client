/* eslint key-spacing : 0 */


// Decode R/T button message (just a status request if you don't have the module)
// function decode_button_com(data) {
// 	data.command = 'con';
// 	data.value   = 'r/t button - ';
//
// 	switch (data.msg[0]) {
// 		case 0x01 : data.value += 'depress'; break;
// 		default   : data.value += 'unknown';
// 	}
//
// 	return data;
// }

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

	// Translate button presses to CANBUS messages
	translate_button_media(unmask);

	switch (unmask.action) {
		case 'hold' : {
			switch (config.mfl.media) {
				case 'bluetooth' : // Bluetooth version
					switch (unmask.button) {
						case 'left'  : break;
						case 'right' : break;
						case 'voice' : break;
					}
					break;

				case 'kodi' : // Kodi version
					switch (unmask.button) {
						case 'left'  : kodi.command('seek-rewind');  break;
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
						case 'depressleft'  : bluetooth.command('previous'); break;
						case 'depressright' : bluetooth.command('next');     break;
						case 'depressvoice' : bluetooth.command('toggle');   break;

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

	// Update status object
	update.status('mfl.last.action', unmask.action, false);
	update.status('mfl.last.button', unmask.button, false);

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


// Translate button presses to CANBUS messages
function translate_button_media(unmask) {
	// Return here if disabled
	if (config.translate.mfl !== true) return;

	let src = 0x1D6;

	// Depress
	// Voice    : 0x1D6 > 0xC0, 0x01
	// Phone    : 0x1D6 > 0xC1, 0x00
	// Vol down : 0x1D6 > 0xC4, 0x00
	// Vol up   : 0x1D6 > 0xC8, 0x00
	// Right    : 0x1D6 > 0xD0, 0x00
	// Left     : 0x1D6 > 0xE0, 0x00
	//
	// Release : 0x1D6 > 0xC0, 0x00

	switch (unmask.action) {
		case 'depress' : {
			switch (unmask.button) {
				case 'left' : {
					bus.data.send({
						bus  : config.mfl.can_intf,
						id   : src,
						data : [ 0xE0, 0x00 ],
					});

					break;
				}

				case 'right' : {
					bus.data.send({
						bus  : config.mfl.can_intf,
						id   : src,
						data : [ 0xD0, 0x00 ],
					});

					break;
				}

				case 'volumedown' :
				case 'volume -'   : {
					bus.data.send({
						bus  : config.mfl.can_intf,
						id   : src,
						data : [ 0xC4, 0x00 ],
					});

					break;
				}

				case 'volumeup' :
				case 'volume +' : {
					bus.data.send({
						bus  : config.mfl.can_intf,
						id   : src,
						data : [ 0xC8, 0x00 ],
					});

					break;
				}

				case 'voice' : {
					bus.data.send({
						bus  : config.mfl.can_intf,
						id   : src,
						data : [ 0xC0, 0x0D ],
					});
				}
			}

			break;
		}

		case 'hold' : {
			switch (unmask.button) {
				case 'left'  : break;
				case 'right' : break;
				case 'voice' : break;
			}

			break;
		}

		case 'release' : {
			bus.data.send({
				bus  : config.mfl.can_intf,
				id   : src,
				data : [ 0xC0, 0x00 ],
			});
		}
	}
}


// Parse data sent from MFL module
function parse_out(data) {
	// 50 B0 01,MFL --> SES: Device status request
	// 50 C8 01,MFL --> TEL: Device status request

	switch (data.msg[0]) {
		// case 0x01 : return decode_button_com(data);    // Button: R/T
		case 0x3A : return decode_button_recirc(data); // Button: Recirculation
		case 0x3B : return decode_button_media(data);  // Button: Media
	}

	return data;
}


module.exports = {
	// decode_button_com    : decode_button_com,
	decode_button_media  : decode_button_media,
	decode_button_recirc : decode_button_recirc,

	parse_out : parse_out,

	translate_button_media : translate_button_media,
};
