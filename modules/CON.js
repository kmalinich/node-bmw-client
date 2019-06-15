/* eslint key-spacing : 0 */

const time_now = require('performance-now');


function button_check(button) {
	// Workaround for the last of a proper 'release' message when in 'joystick mode'
	let joystick_release = (button.mode === 'joystick' && button.action === 'release' && button.button === 'none');
	if (joystick_release === true) button.button = status.con.last.button.button;

	// Detect if there is a change from the last button message, bounce if not
	// CON sends a lot of repeat messages (it's CANBUS)
	let change = (status.con.last.button.action !== button.action || status.con.last.button.button !== button.button || status.con.last.button.mode !== button.mode);
	if (change === false) return;

	log.module('Button: ' + button.action + ' ' + button.button);

	// Dynamic timeout for the 'horizontal' and 'volume' rotation modes -
	// Instead of a fixed timeout, you have to leave the knob alone for <configured> milliseconds
	let rotation_gap = time_now() - status.con.rotation.last_msg;

	if (rotation_gap >= config.con.timeout.rotation_mode) {
		update.status('con.rotation.horizontal', false, false);
		update.status('con.rotation.volume',     false, false);
	}

	update.status('con.last.event', 'button', false);

	switch (button.action) {
		case 'hold' : {
			switch (button.button) {
				case 'in' : {
					// To use holding the knob button in to toggle RPi display on/off
					update.status('hdmi.rpi.power_override', true, false);
					hdmi_rpi.command('toggle');
					break;
				}

				case 'up'    : kodi.command('toggle'); break;
				case 'down'  : break;
				case 'left'  : kodi.command('previous'); break;
				case 'right' : kodi.command('next');
			}

			break;
		}

		case 'release' : {
			switch (status.con.last.button.action) {
				case 'depress' : {
					switch (status.con.last.button.button) {
						case 'tel' : {
							// To use the TEL button as Kodi play/pause
							kodi.command('toggle');
							break;
						}

						case 'nav' : {
							// To use the NAV button as a toggle for police lights
							LCM.police((status.lcm.police_lights.on === false));
							break;
						}

						default : {
							kodi.input(status.con.last.button.button);
						}
					}
				}
			}

			break;
		}
	}

	// Store buttonpress data in 'last' object
	update.status('con.last.button.action', button.action, false);
	update.status('con.last.button.button', button.button, false);
}

// CON ACK to rotational initialization message
function decode_ack(data) {
	data.command = 'rep';
	data.value   = 'CON ACK to NBT init';

	return data;
}

// CON button depress, length 6
function decode_button(data) {
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

// The rotational knob is connected to a 16 bit counter whose value is sent via CANBUS
// iDrive knob rotation
// 264 -> E1 FD B5 FB 7F 1E
function decode_rotation(data) {
	data.command = 'con';
	data.value   = 'Knob rotation';

	// data.msg[2] : Counts up          between 0x00-0xFE : once every notch, regardless of the direction of turn
	// data.msg[3] : Counts up and down between 0x00-0xFE : depending on the direction of rotation

	// so do the math .. i've had several beers

	// Spin it hard enough and you can get it to jump up to 24 notches!
	// This is set up to handle up to 127 notches in either direction, we should be ok

	// If you're clever, you can actually
	// use the math vs. the missed packets
	// to determine how hard the wheel was flicked

	let direction;

	let change = data.msg[3] - status.con.rotation.relative;

	// If it hasn't rotated any notches
	if (change === 0) return data;

	let change_calc = 256 - Math.abs(change);

	// If change_calc is less than 128,
	// the relative counter has either rolled from 128-255 to 0-127 or 0-127 to 128-255
	let rollover = (change_calc < 128);
	if (rollover) {
		switch (change > 0) {
			case false : change = (change + 256); break;
			case true  : change = (change - 256);
		}
	}

	// The absolute number of notches travelled
	let change_abs = Math.abs(change);

	switch (change > 0) {
		case false : direction = 'left'; break;
		case true  : direction = 'right';
	}

	log.module('Rotation: ' + direction + ' ' + change_abs + ' notches');

	update.status('con.rotation.direction', direction, false);

	// Update data in global status object
	update.status('con.rotation.absolute', data.msg[2]);
	update.status('con.rotation.relative', data.msg[3]);

	// Dynamic timeout for the 'horizontal' and 'volume' rotation modes -
	// Instead of a fixed timeout, you have to leave the knob alone for 3000 milliseconds
	let rotation_gap = time_now() - status.con.rotation.last_msg;

	if (rotation_gap >= config.con.timeout.rotation_mode) {
		update.status('con.rotation.horizontal', false, false);
		update.status('con.rotation.volume',     false, false);
	}

	// Create quick bitmask to ease switch statement processing
	let mask_mode = bitmask.create({
		// b0 : status.con.rotation.horizontal,
		// b1 : status.con.rotation.volume,
		b0 : (status.con.touch.count === 1), // If 1 finger  on touchpad, do horizontal scroll
		b1 : (status.con.touch.count === 2), // If 2 fingers on touchpad, do volume control
	});

	switch (mask_mode) {
		case 0x01 : { // Rotation mode: horizontal
			update.status('con.last.event', 'rotation', false);

			for (let i = 0; i < change_abs; i++) kodi.input(status.con.rotation.direction);
			break;
		}

		case 0x02 : { // Rotation mode: volume
			update.status('con.last.event', 'rotation', false);

			switch (status.con.rotation.direction) {
				case 'left'  : for (let i = 0; i < change_abs; i++) kodi.volume('down'); break;
				case 'right' : for (let i = 0; i < change_abs; i++) kodi.volume('up');
			}
			break;
		}

		case 0x03 : { // Horizontal AND volume mode - error
			log.module('Error: Horizontal and volume rotation modes simultaneously active, resetting');

			update.status('con.rotation.horizontal', false, false);
			update.status('con.rotation.volume',     false, false);
			break;
		}

		default : { // Rotation mode: normal
			switch (status.con.rotation.direction) {
				case 'left'  : for (let i = 0; i < change_abs; i++) kodi.input('up'); break;
				case 'right' : for (let i = 0; i < change_abs; i++) kodi.input('down');
			}
		}
	}

	update.status('con.rotation.last_msg', time_now());

	return data;
}

function decode_status(data) {
	data.command = 'sta';

	switch (data.src.id) {
		case 0x4E7 : data.value = 'status'; break;
		case 0x5E7 : data.value = 'Counter: ' + data.msg;
	}

	switch (data.msg[4]) {
		case 0x06 : { // CON needs init
			switch (config.nbt.mode.toLowerCase()) {
				case 'cic' : {
					log.module('Init triggered');
					NBT.status();
				}
			}
		}
	}

	return data;
}

// How many appendages are touching the CON touchpad
function decode_touch_count(value) {
	switch (value) {
		case 0x00 : return 2;
		// case 0x0F : return 4; // This happens sometimes if you touch the pad and the ring
		case 0x10 : return 1;
		case 0x11 : return 0;
		// case 0x1F : return 3; // It can usually detect this but it's wonky
		default   : return status.con.touch.count;
	}
}

// Touch iDrive controller data
// This is, for now, a dirty hack
function decode_touchpad(data) {
	data.command = 'con';
	data.value   = 'Touchpad contact';

	let x = data.msg[1];
	let y = data.msg[3];

	let touch_count = decode_touch_count(data.msg[4]);

	// Update status object
	if (update.status('con.touch.count', touch_count, false)) {
		update.status('con.last.event', 'touch', false);
	}

	// Bounce if more than 1 digit on the touchpad
	if (touch_count !== 1) return data;

	if (y === 0) return data;

	data.value += ' X: ' + x + ' Y: ' + y;

	// Update status object
	// update.status('con.touch.x', x);
	// update.status('con.touch.y', y);

	// y-axis value maxes out at 30 - so we'll do a bit of multiplication
	// let volume_level = Math.floor(y * (3 + (1 / 3)));
	// kodi.volume(volume_level);

	return data;
}


function init_listeners() {
	// Stamp last message time as now
	update.status('con.rotation.last_msg', time_now());

	// Bounce if not enabled
	if (config.emulate.nbt !== true) return;

	// Perform commands on power lib active event
	power.on('active', init_rotation);

	log.msg('Initialized listeners');
}

// Initialize CON rotation counter
// TODO: This should be in modules/NBT.js (it's emulating a real NBT module)
function init_rotation(action = false) {
	// Bounce if not enabled
	if (config.emulate.nbt !== true) return;

	// Handle setting/unsetting timeout
	switch (action) {
		case false : {
			if (CON.timeout.init_rotation !== null) {
				clearTimeout(CON.timeout.init_rotation);
				CON.timeout.init_rotation = null;

				log.module('Unset CON rotation init timeout');
			}

			// Return here since we're not re-sending again
			return;
		}

		case true : {
			CON.timeout.init_rotation = setTimeout(() => {
				init_rotation(true);
			}, 10000);

			if (CON.timeout.init_rotation === null) {
				log.module('Set CON rotation init timeout');
			}
		}
	}

	// When CON receives this message, it resets it's relative rotation counter to -1
	update.status('con.rotation.relative', -1);

	// log.module('Sending CON rotation init');

	// Send message
	bus.data.send({
		bus  : config.con.can_intf,
		id   : 0x273,
		data : Buffer.from([ 0x1D, 0xE1, 0x00, 0xF0, 0xFF, 0x7F, 0xDE, 0x00 ]),
	});
}


// Parse data sent from module
function parse_out(data) {
	// Bounce if not enabled
	if (config.retrofit.con !== true) return;

	switch (data.src.id) {
		case 0x0BF : return decode_touchpad(data);
		case 0x264 : return decode_rotation(data);
		case 0x267 : return decode_button(data);
		case 0x277 : return decode_ack(data);

		case 0x4E7 :
		case 0x5E7 : return decode_status(data);
	}

	return data;
}


module.exports = {
	timeout : {
		init_rotation : null,
	},

	// Functions
	init_listeners : init_listeners,

	parse_out : parse_out,
};
