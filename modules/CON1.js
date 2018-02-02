/* eslint key-spacing : 0 */

const module_name = __filename.slice(__dirname.length + 1, -3);

const time_now = require('performance-now');

// The rotational knob is connected to a 16 bit counter
// whose value is sent via CANBUS


// Message examples:

// CIC1 status
// 273 -> 1D E1 00 F0 FF 7F DE 04

// Ignition status
// 4F8 -> 00 42 FE 01 FF FF FF FF

// Counter/heartbeat
// Byte 4 changes from one state to the other every 5 sec
// 2BA -> 00 00 00 00 10
// 2BA -> 00 00 00 00 20


// iDrive knob rotation
// ARBID 0x264: <Buffer e1 fd b5 fb 7f 1e>
function decode_con_rotation(data) {
	// data.msg[2] : Counts up          between 0x00-0xFE : once every notch, regardless of the direction of turn
	// data.msg[3] : Counts up and down between 0x00-0xFE : depending on the direction of rotation

	// so do the math .. i've had several beers

	// Spin it hard enough and you can get it to jump up to 24 notches!
	// This is set up to handle up to 127 notches in either direction, we should be ok

	// If you're clever, you can actually
	// use the math vs. the missed packets
	// to determine how hard the wheel was flicked

	// Update the data in global status object
	update.status('con1.rotation.absolute', data.msg[2]);
	update.status('con1.rotation.relative', data.msg[3]);

	let direction;

	let change = data.msg[3] - status.con1.rotation.relative;

	// If it hasn't rotated any notches
	if (change === 0) return;

	let change_calc = 256 - Math.abs(change);

	// If change_calc is less than 128,
	// the relative counter has either rolled from 128-255 to 0-127 or 0-127 to 128-255
	let rollover = (change_calc < 128);
	if (rollover) {
		switch (change > 0) {
			case true  : change = (change - 256); break;
			case false : change = (change + 256);
		}
	}

	// The absolute number of notches travelled
	let change_abs = Math.abs(change);

	switch (change > 0) {
		case true  : direction = 'right'; break;
		case false : direction = 'left';
	}

	log.module({ msg : 'Rotation: ' + direction + ' ' + change_abs + ' notches' });

	update.status('con1.rotation.direction', direction);

	// Update data in global status object
	update.status('con1.rotation.absolute', data.msg[2]);
	update.status('con1.rotation.relative', data.msg[3]);

	// Not gonna finish this now - but later,
	// I want to do a dynamic timeout for the 'horizontal' and 'volume' rotation modes -
	// where instead of a fixed timeout, you have to leave the knob alone for XYZ milliseconds
	update.status('con1.rotation.last_msg', time_now(), false);

	log.module({ msg : 'Rotation: ' + status.con1.rotation.direction });

	let mask_mode = bitmask.create({
		b0 : status.con1.rotation.horizontal,
		b1 : status.con1.rotation.volume,
	});

	switch (mask_mode) {
		case 0x01: { // Rotation mode: horizontal
			kodi.input(status.con1.rotation.direction);
			break;
		}

		case 0x02: { // Rotation mode: volume
			switch (status.con1.rotation.direction) {
				case 'left'  : kodi.volume('down'); break;
				case 'right' : kodi.volume('up');   break;
			}
			break;
		}

		case 0x03: { // Horizontal AND volume mode - error
			log.module({ msg : 'Error: Horizontal and volume rotation modes simultaneously active, resetting' });

			update.status('con1.rotation.horizontal', false);
			update.status('con1.rotation.volume',     false);
			break;
		}

		default: { // Rotation mode: normal
			switch (status.con1.rotation.direction) {
				case 'left'  : kodi.input('up');   break;
				case 'right' : kodi.input('down'); break;
			}
		}
	}

	return data;
}


// CON1 button press, length 6
function decode_con_button(data) {
	data.command = 'con';
	data.value   = 'button press';

	// Action bitmask data.msg[3]:
	// bit0 : Press
	// bit1 : Hold
	// bit2 : ??
	// bit3 : ??
	// bit4 : Joystick up
	// bit5 : Joystick right
	// bit6 : Joystick down
	// bit7 : Joystick left
	// bit8 : Release


	// Mode bitmask data.msg[4]:
	// 0xC0 : Button
	// 0xDD : Joystick
	// 0xDE : Push

	// MODE : BUTTON
	// bit0 : false
	// bit1 : false
	// bit2 : false
	// bit3 : false
	// bit4 : false
	// bit5 : false
	// bit6 : true
	// bit7 : true
	// bit8 : false

	// MODE : PUSH
	// bit0 : false
	// bit1 : true
	// bit2 : true
	// bit3 : true
	// bit4 : true
	// bit5 : false
	// bit6 : true
	// bit7 : true
	// bit8 : false

	// MODE : JOYSTICK
	// bit0 : true
	// bit1 : false
	// bit2 : true
	// bit3 : true
	// bit4 : true
	// bit5 : false
	// bit6 : true
	// bit7 : true
	// bit8 : false


	// Button bitmask data.msg[5]:
	// bit0 : Menu
	// bit1 : Back
	// bit2 : Option
	// bit3 : Radio
	// bit4 : CD
	// bit5 : Nav
	// bit6 : Tel
	// bit7 : Center?


	// button  : menu
	// press   : 01 C0 01
	// release : 00 C0 01

	// button  : in
	// press   : 01 DE 01
	// release : 00 DE 01


	// Decode bitmasks
	let m = {
		a : bitmask.check(data.msg[3]).mask, // Actions bitmask
		b : bitmask.check(data.msg[5]).mask, // Buttons bitmask
		m : bitmask.check(data.msg[4]).mask, // Modes bitmask
	};

	let unmask = {
		actions : {
			hold    : false,
			press   : false,
			release : false,
		},
		buttons : {
			back   : false,
			cd     : false,
			down   : false,
			in     : false,
			left   : false,
			menu   : false,
			nav    : false,
			none   : false,
			option : false,
			radio  : false,
			right  : false,
			tel    : false,
			up     : false,
		},
		modes : {
			button   : false,
			joystick : false,
			push     : false,
		},
	};

	// Detect 'mode' first, it determines what the button is
	unmask.modes = {
		button   : !m.m.b0 && !m.m.b1 && !m.m.b2 && !m.m.b3 && !m.m.b4 && !m.m.b5 &&  m.m.b6 &&  m.m.b7 && !m.m.b8, // b6+b7    are true,  all others false
		push     : !m.m.b0 &&  m.m.b1 &&  m.m.b2 &&  m.m.b3 &&  m.m.b4 && !m.m.b5 &&  m.m.b6 &&  m.m.b7 && !m.m.b8, // b0+b5+b8 are false, all others true
		joystick :  m.m.b0 && !m.m.b1 &&  m.m.b2 &&  m.m.b3 &&  m.m.b4 && !m.m.b5 &&  m.m.b6 &&  m.m.b7 && !m.m.b8, // b1+b5+b8 are false, all others true
	};

	// Loop unmask object to determine action+button combination
	for (let mode in unmask.modes) {
		if (unmask.modes[mode] === true) {
			unmask.mode = mode;
			break;
		}
	}

	unmask.actions = {
		press   :  m.a.b0 && !m.a.b1 && !m.a.b8,
		hold    : !m.a.b0 &&  m.a.b1 && !m.a.b8,
		release : !m.a.b0 && !m.a.b1 &&  m.a.b8,
	};

	// Note how the joystick messages have their direction defined in b3, not b5
	unmask.buttons = {
		up    : unmask.modes.joystick &&  m.a.b4 && !m.a.b5 && !m.a.b6 && !m.a.b7 && !m.a.b8,
		right : unmask.modes.joystick && !m.a.b4 &&  m.a.b5 && !m.a.b6 && !m.a.b7 && !m.a.b8,
		down  : unmask.modes.joystick && !m.a.b4 && !m.a.b5 &&  m.a.b6 && !m.a.b7 && !m.a.b8,
		left  : unmask.modes.joystick && !m.a.b4 && !m.a.b5 && !m.a.b6 &&  m.a.b7 && !m.a.b8,
		none  : unmask.modes.joystick && !m.a.b4 && !m.a.b5 && !m.a.b6 && !m.a.b7 && !m.a.b8, // All here are false

		in : unmask.modes.push && m.b.b0 && !m.b.b1 && !m.b.b2 && !m.b.b3 && !m.b.b4 && !m.b.b5 && !m.b.b6,

		menu   : unmask.modes.button &&  m.b.b0 && !m.b.b1 && !m.b.b2 && !m.b.b3 && !m.b.b4 && !m.b.b5 && !m.b.b6,
		back   : unmask.modes.button && !m.b.b0 &&  m.b.b1 && !m.b.b2 && !m.b.b3 && !m.b.b4 && !m.b.b5 && !m.b.b6,
		option : unmask.modes.button && !m.b.b0 && !m.b.b1 &&  m.b.b2 && !m.b.b3 && !m.b.b4 && !m.b.b5 && !m.b.b6,
		radio  : unmask.modes.button && !m.b.b0 && !m.b.b1 && !m.b.b2 &&  m.b.b3 && !m.b.b4 && !m.b.b5 && !m.b.b6,
		cd     : unmask.modes.button && !m.b.b0 && !m.b.b1 && !m.b.b2 && !m.b.b3 &&  m.b.b4 && !m.b.b5 && !m.b.b6,
		nav    : unmask.modes.button && !m.b.b0 && !m.b.b1 && !m.b.b2 && !m.b.b3 && !m.b.b4 &&  m.b.b5 && !m.b.b6,
		tel    : unmask.modes.button && !m.b.b0 && !m.b.b1 && !m.b.b2 && !m.b.b3 && !m.b.b4 && !m.b.b5 &&  m.b.b6,
	};

	// Loop unmask object to determine action+button combination
	for (let action in unmask.actions) {
		if (unmask.actions[action] === true) {
			unmask.action = action;
			break;
		}
	}

	for (let button in unmask.buttons) {
		if (unmask.buttons[button] === true) {
			unmask.button = button;
			break;
		}
	}

	button_check({
		action : unmask.action,
		button : unmask.button,
		mode   : unmask.mode,
	});

	return data;
}

function button_check(button) {
	// Workaround for the last of a proper 'release' message when in 'joystick mode'
	let joystick_release = (button.mode === 'joystick' && button.action === 'release' && button.button === 'none');
	if (joystick_release === true) button.button = status.con1.last.button.button;

	// Detect if there is a change from the last button message, bounce if not
	// CON1 sends a lot of repeat messages (it's CANBUS)
	let change = (status.con1.last.button.action !== button.action || status.con1.last.button.button !== button.button || status.con1.last.button.mode !== button.mode);
	if (change === false) return;

	// Store buttonpress data in 'last' object
	update.status('con1.last.button', button);

	log.module({ msg : 'Button: ' + button.action + ' ' + button.button });

	switch (button.action) {
		case 'press' : {
			switch (button.button) {
				case 'tel' : {
					// To use the TEL button as a toggle for rotation = Kodi volume control
					if (update.status('con1.rotation.volume', !status.con1.rotation.volume)) {
						kodi.notify('CON1 volume: ' + status.con1.rotation.volume, 'Updated via button');

						// In 8000ms, set it back
						setTimeout(() => {
							if (update.status('con1.rotation.volume', false)) {
								kodi.notify('CON1 volume: ' + status.con1.rotation.volume, 'Updated via timeout');
							}
						}, 8000);
					}

					break;
				}

				case 'nav' : {
					// To use the NAV button as a toggle for left<->right or up<->down rotation
					if (update.status('con1.rotation.horizontal', !status.con1.rotation.horizontal)) {
						kodi.notify('CON1 horizontal: ' + status.con1.rotation.horizontal, 'Updated via button');

						// In 8000ms, set it back
						setTimeout(() => {
							if (update.status('con1.rotation.horizontal', false)) {
								kodi.notify('CON1 horizontal: ' + status.con1.rotation.horizontal, 'Updated via timeout');
							}
						}, 8000);
					}

					break;
				}

				default : {
					kodi.input(button.button);
				}
			}

			break;
		}

		case 'hold' : {
			switch (button.button) {
				case 'in' : {
					// To use holding the knob button in to toggle RPi display on/off
					hdmi_rpi.command('powertoggle');
					break;
				}
			}

			break;
		}
	}
}

// Backlight message
function decode_con_backlight(data) {
	data.command = 'bro';
	data.value   = 'Dimmer status';

	// data.msg[0]: Backlight intensity
	// 0xFF      : 50%
	// 0xFE      :  0%
	// 0x00-0xFD :  1%-100%

	// console.log('RECV : '+module_name+' backlight \'%s\'', data.msg[0]);
	update.status('con1.backlight', data.msg[0]);

	return data;
}

// 0x4E7
// data.command = 'sta';
// data.value   = module_name+' status';
// 0x5E7
// data.command = 'sta';
// data.value   = module_name+' counter';
function decode_status_con(data) {
	if (data.msg[4] === 0x06) { // CON1 needs init
		log.module({ msg : 'Init triggered' });

		send_status_cic();
	}

	return data;
}

function decode_ignition_new(data) {
	data.command = 'bro';
	data.value   = 'Ignition status';

	log.module({ msg : 'Ignition message ' + data.msg[0] });

	return data;
}

// Used for iDrive knob rotational initialization
function decode_status_cic(data) {
	data.command = 'con';
	data.value   = 'CIC1 init iDrive knob';

	log.module({ msg : 'CIC1 status message ' + data.msg[0] });

	return data;
}

// function send_heartbeat() {
// 	// 2BA -> 00 00 00 00 10
// 	// 2BA -> 00 00 00 00 20
//
// 	switch (status.con1.last.heartbeat) {
// 		case 0x10 : update.status('con1.last.heartbeat', 0x20); break;
// 		default   : update.status('con1.last.heartbeat', 0x10);
// 	}
//
// 	return data;
// }


function send_backlight(value) {
	// Bounce if not enabled
	if (config.media.con1 !== true) return;

	// data.msg[0]: Backlight intensity
	// 0xFE      :  0%
	// 0x00-0xFD :  1%-100%
	// 0xFF      : 50%

	// Can't be > 0xFF || < 0x00
	if (value > 0xFF) value = 0xFF;
	if (value < 0x00) value = 0xFF;

	// Set status value
	update.status('con1.backlight', value);

	// Workarounds
	switch (value) {
		case 0x00 : value = 0xFE; break; // 0% workaround
		case 0x7F : value = 0xFF; break; // 50% workaround
		case 0xFE : value = 0xFD; break; // Almost-100% workaround
		default   : value--;             // Decrement value by one (see above)
	}

	bus.data.send({
		bus  : 'can1',
		id   : 0x202,
		data : Buffer.from([ value, 0x00 ]),
	});

	log.module({ msg : 'Set backlight value to: ' + status.con1.backlight });
}

// E90 CIC1 status
function send_status_cic() {
	// Bounce if not enabled
	if (config.media.con1 !== true) return;

	log.module({ msg : 'Sending CIC1 status' });

	let msg = [ 0x1D, 0xE1, 0x00, 0xF0, 0xFF, 0x7F, 0xDE, 0x04 ];
	bus.data.send({
		bus  : 'can1',
		id   : 0x273,
		data : Buffer.from(msg),
	});

	update.status('con1.rotation.relative', -1);
}

// E90 Ignition status
function send_status_ignition_new() {
	// Bounce if not enabled
	if (config.media.con1 !== true) return;

	log.module({ msg : 'Sending ignition status' });

	bus.data.send({
		bus  : 'can1',
		id   : 0x4F8,
		data : Buffer.from([ 0x00, 0x42, 0xFE, 0x01, 0xFF, 0xFF, 0xFF, 0xFF ]),
	});

	if (status.vehicle.ignition_level === 0) {
		if (CON1.timeouts.status_ignition_new !== null) {
			clearTimeout(CON1.timeouts.status_ignition_new);
			CON1.timeouts.status_ignition_new = null;

			log.module({ msg : 'Unset ignition status timeout' });

			return;
		}
	}

	if (CON1.timeouts.status_ignition_new === null) {
		log.module({ msg : 'Set ignition status timeout' });
	}

	CON1.timeouts.status_ignition_new = setTimeout(send_status_ignition_new, 1000);
}

// Parse data sent from module
function parse_out(data) {
	// Bounce if not enabled
	if (config.media.con1 !== true) return;

	switch (data.src.id) {
		case 0x202 : data = decode_con_backlight(data); break;
		case 0x264 : data = decode_con_rotation(data);  break;
		case 0x267 : data = decode_con_button(data);    break;
		case 0x273 : data = decode_status_cic(data);    break;

		case 0x277: // CON1 ACK to rotational initialization message
			data.command = 'rep';
			data.value   = module_name + ' ACK to CIC1 init';
			break;

		case 0x4F8 : data = decode_ignition_new(data); break;
		case 0x4E7 : data = decode_status_con(data);   break;
		case 0x5E7 : data = decode_status_con(data);   break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
	}

	// log.bus(data);
}

function init_listeners() {
	// Enable/disable keepalive on IKE ignition event
	IKE.on('ignition-powerup',  () => { send_status_ignition_new(); });
	IKE.on('ignition-poweroff', () => { send_status_ignition_new(); });
}


module.exports = {
	timeouts : {
		status_cic          : null,
		status_ignition_new : null,
	},

	// Functions
	init_listeners           : init_listeners,
	parse_out                : parse_out,
	send_backlight           : send_backlight,
	send_status_ignition_new : send_status_ignition_new,
};
