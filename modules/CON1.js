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

	log.module('Rotation: ' + direction + ' ' + change_abs + ' notches');

	update.status('con1.rotation.direction', direction);

	// Update data in global status object
	update.status('con1.rotation.absolute', data.msg[2]);
	update.status('con1.rotation.relative', data.msg[3]);

	// Dynamic timeout for the 'horizontal' and 'volume' rotation modes -
	// Instead of a fixed timeout, you have to leave the knob alone for 3000 milliseconds
	let rotation_gap = time_now() - status.con1.rotation.last_msg;

	if (rotation_gap >= config.con1.timeout.rotation_mode) {
		update.status('con1.rotation.horizontal', false);
		update.status('con1.rotation.volume',     false);
	}

	// Create quick bitmask to ease switch statement processing
	let mask_mode = bitmask.create({
		b0 : status.con1.rotation.horizontal,
		b1 : status.con1.rotation.volume,
	});

	switch (mask_mode) {
		case 0x01 : { // Rotation mode: horizontal
			for (let i = 0; i < change_abs; i++) kodi.input(status.con1.rotation.direction);
			break;
		}

		case 0x02 : { // Rotation mode: volume
			switch (status.con1.rotation.direction) {
				case 'left'  : for (let i = 0; i < change_abs; i++) kodi.volume('down'); break;
				case 'right' : for (let i = 0; i < change_abs; i++) kodi.volume('up');
			}
			break;
		}

		case 0x03 : { // Horizontal AND volume mode - error
			log.module('Error: Horizontal and volume rotation modes simultaneously active, resetting');

			update.status('con1.rotation.horizontal', false);
			update.status('con1.rotation.volume',     false);
			break;
		}

		default : { // Rotation mode: normal
			switch (status.con1.rotation.direction) {
				case 'left'  : for (let i = 0; i < change_abs; i++) kodi.input('up'); break;
				case 'right' : for (let i = 0; i < change_abs; i++) kodi.input('down');
			}
		}
	}

	update.status('con1.rotation.last_msg', time_now(), false);

	return data;
}


// CON1 button depress, length 6
function decode_con_button(data) {
	data.command = 'con';
	data.value   = 'button depress';

	// Action bitmask data.msg[3]:
	// bit0 : Depress
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
	// depress : 01 C0 01
	// release : 00 C0 01

	// button  : in
	// depress : 01 DE 01
	// release : 00 DE 01


	// Decode bitmasks
	let m = {
		a : bitmask.check(data.msg[3]).mask, // Actions bitmask
		b : bitmask.check(data.msg[5]).mask, // Buttons bitmask
		m : bitmask.check(data.msg[4]).mask, // Modes bitmask
	};

	let unmask = {
		actions : {
			depress : false,
			hold    : false,
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
		depress :  m.a.b0 && !m.a.b1 && !m.a.b8,
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

	log.module('Button: ' + button.action + ' ' + button.button);

	switch (button.action) {
		case 'hold' : {
			switch (button.button) {
				case 'in' : {
					// To use holding the knob button in to toggle RPi display on/off
					update.status('hdmi.rpi.power_override', true);
					hdmi_rpi.command('powertoggle');
					break;
				}

				case 'up' : {
					kodi.command('toggle');
					break;
				}

				case 'down' : {
					break;
				}

				case 'left' : {
					kodi.command('previous');
					break;
				}

				case 'right' : {
					kodi.command('next');
					break;
				}
			}

			break;
		}

		case 'release' : {
			switch (status.con1.last.button.action) {
				case 'depress' : {
					switch (status.con1.last.button.button) {
						case 'tel' : {
							// To use the TEL button as a toggle for rotation = Kodi volume control
							if (update.status('con1.rotation.volume', true)) {
								kodi.notify('CON1', 'Rotation mode: volume');
								update.status('con1.rotation.last_msg', time_now(), false);
							}

							break;
						}

						case 'nav' : {
							// To use the NAV button as a toggle for left<->right or up<->down rotation
							if (update.status('con1.rotation.horizontal', true)) {
								kodi.notify('CON1', 'Rotation mode: horizontal');
								update.status('con1.rotation.last_msg', time_now(), false);
							}

							break;
						}

						default : {
							kodi.input(status.con1.last.button.button);
						}
					}
				}
			}

			break;
		}
	}

	// Store buttonpress data in 'last' object
	update.status('con1.last.button.action', button.action);
	update.status('con1.last.button.button', button.button);
}

// Backlight message
function decode_con_backlight(data) {
	data.command = 'bro';
	data.value   = 'Dimmer status';

	// data.msg[0]: Backlight intensity
	// 0xFF      : 50%
	// 0xFE      :  0%
	// 0x00-0xFD :  1%-100%

	// console.log('RECV : ' + module_name + ' backlight \'%s\'', data.msg[0]);
	update.status('con1.backlight', data.msg[0]);

	return data;
}

// 0x4E7
// data.command = 'sta';
// data.value   = module_name + ' status';
// 0x5E7
// data.command = 'sta';
// data.value   = module_name + ' counter';
function decode_status_con(data) {
	if (data.msg[4] === 0x06) { // CON1 needs init
		log.module('Init triggered');

		status_cic();
	}

	return data;
}

function decode_ignition(data) {
	data.command = 'bro';
	data.value   = 'Ignition status';

	log.module('Ignition message ' + data.msg[0]);

	return data;
}

// Used for iDrive knob rotational initialization
function decode_status_cic(data) {
	data.command = 'con';
	data.value   = 'CIC1 init iDrive knob';

	log.module('CIC1 status message ' + data.msg[0]);

	return data;
}

// function heartbeat() {
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


function backlight(value) {
	// Bounce if not enabled
	if (config.media.con1 !== true) return;

	// data.msg[0]: Backlight intensity
	// 0xFE      : 0%
	// 0x00-0xFD : 1%-100%
	// 0xFF      : 0%

	// Can't be > 0xFF || < 0x00
	if (value > 0xFF) value = 0xFF;
	if (value < 0x00) value = 0xFF;

	// Set status value
	update.status('con1.backlight.value', value);

	// Workarounds
	switch (value) {
		case 0x00 : value = 0xFE; break; // 0% workaround
			// case 0x7F : value = 0xFF; break; // 50% workaround
		case 0xFE : value = 0xFD; break; // Almost-100% workaround
		case 0xFF : value = 0xFD; break; // Almost-100% workaround
		default   : value--;             // Decrement value by one (see above)
	}

	update.status('con1.backlight.real', value);

	bus.data.send({
		bus  : 'can1',
		id   : 0x202,
		data : Buffer.from([ value, 0x00 ]),
	});
}

// E90 CIC1 status
function status_cic() {
	// Bounce if not enabled
	if (config.media.con1 !== true) return;

	log.module('Sending CIC1 status');

	let msg = [ 0x1D, 0xE1, 0x00, 0xF0, 0xFF, 0x7F, 0xDE, 0x04 ];
	bus.data.send({
		bus  : 'can1',
		id   : 0x273,
		data : Buffer.from(msg),
	});

	update.status('con1.rotation.relative', -1);
}

// E90 Ignition status
function status_ignition() {
	// Bounce if not enabled
	if (config.media.con1 !== true) return;

	// This is pretty noisy
	// log.module('Sending ignition status');

	bus.data.send({
		bus  : 'can1',
		id   : 0x4F8,
		data : Buffer.from([ 0x00, 0x42, 0xFE, 0x01, 0xFF, 0xFF, 0xFF, 0xFF ]),
	});

	if (status.vehicle.ignition_level === 0) {
		if (CON1.waiting.open.doors.sealed.false === false && CON1.waiting.open.doors.sealed.true === false) {
			if (CON1.timeout.status_ignition !== null) {
				clearTimeout(CON1.timeout.status_ignition);
				CON1.timeout.status_ignition = null;

				log.module('Unset ignition status timeout');

				return;
			}
		}
	}

	if (CON1.timeout.status_ignition === null) {
		log.module('Set ignition status timeout');
	}

	CON1.timeout.status_ignition = setTimeout(status_ignition, 1000);
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

		case 0x277 : { // CON1 ACK to rotational initialization message
			data.command = 'rep';
			data.value   = module_name + ' ACK to CIC1 init';
			break;
		}

		case 0x4F8 : data = decode_ignition(data);   break;
		case 0x4E7 : data = decode_status_con(data); break;
		case 0x5E7 : data = decode_status_con(data); break;

		default : {
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
		}
	}

	// log.bus(data);
}

function init_listeners() {
	// Stamp last message time as now
	update.status('con1.rotation.last_msg', time_now(), false);

	// Wait for open event from GM to assist poweroff sequence
	GM.on('open', (data) => {
		// Bounce if we're still waiting for the poweroff message
		if (CON1.waiting.ignition === true) return;

		switch (data.doors.sealed) {
			case false : {
				if (CON1.waiting.open.doors.sealed.false === true) {
					log.module('No longer waiting for GM.open.doors.sealed.false event');
					CON1.waiting.open.doors.sealed.false = false;
				}
				break;
			}

			case true : {
				// Waiting here for at least one door to be previously opened
				if (CON1.waiting.open.doors.sealed.true === true) {
					log.module('No longer waiting for GM.open.doors.sealed.true event');
					CON1.waiting.open.doors.sealed.true = false;
				}
			}
		}

		// We've successfully waited for all three events
		if (CON1.waiting.open.doors.sealed.false === false && CON1.waiting.open.doors.sealed.true === false) {
			log.module('Ignition off, doors sealed then unsealed, no longer sending ignition status message');
			status_ignition();
		}
	});

	// Enable/disable keepalive on IKE ignition event
	IKE.on('ignition-powerup', () => {
		CON1.waiting.ignition = true;
		log.module('Waiting for IKE.ignition-poweroff event');

		status_ignition();
	});

	IKE.on('ignition-poweroff', () => {
		log.module('No longer waiting for IKE.ignition-poweroff event');
		CON1.waiting.ignition = false;

		// Wait for doors to be unsealed, unless they already are
		switch (status.doors.sealed) {
			case false : {
				log.module('Door(s) already open - NOT waiting for GM.open.doors.sealed.false event');
				CON1.waiting.open.doors.sealed.false = false;
				break;
			}

			case true  : {
				log.module('Waiting for GM.open.doors.sealed.false event');
				CON1.waiting.open.doors.sealed.false = true;
			}
		}

		log.module('Waiting for GM.open.doors.sealed.true event');
		CON1.waiting.open.doors.sealed.true = true;

		// Override timeout
		setTimeout(() => {
			CON1.waiting.ignition = false;

			CON1.waiting.open.doors.sealed = {
				true  : false,
				false : false,
			};

			status_ignition();
		}, config.media.poweroff_delay);
	});

	log.module('Initialized listeners');
}


module.exports = {
	timeout : {
		status_ignition : null,
	},

	waiting : {
		ignition : true,

		open : {
			doors : {
				sealed : {
					false : true,
					true  : true,
				},
			},
		},
	},

	// Functions
	init_listeners : init_listeners,

	backlight : backlight,
	parse_out : parse_out,

	status_ignition : status_ignition,
};
