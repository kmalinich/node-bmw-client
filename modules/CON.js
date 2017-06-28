var module_name = __filename.slice(__dirname.length + 1, -3);

// Parse data sent from module
function parse_out(data) {
	switch (data.msg[0]) {
		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
	}

	log.bus(data);
}

module.exports = {
	parse_out : (data) => { parse_out(data); },
};


var palette = (0, trucolor.chalkish)((0, trucolor.palette)({}, {
	blk: 'rgb:48,48,48',
	blu: 'rgb:51,152,219',
	cyn: 'rgb:0,200,200',
	grn: 'rgb:47,223,100',
	gry: 'rgb:144,144,144',
	orn: 'rgb:255,153,50',
	pnk: 'rgb:178,0,140',
	prp: 'rgb:114,83,178',
	red: 'rgb:231,76,60',
	wht: 'rgb:224,224,224',
	ylw: 'rgb:255,204,50',

	boldblk: 'bold rgb:48,48,48',
	boldblu: 'bold rgb:51,152,219',
	boldcyn: 'bold rgb:0,200,200',
	boldgrn: 'bold rgb:47,223,100',
	boldgry: 'bold rgb:144,144,144',
	boldorn: 'bold rgb:255,153,50',
	boldpnk: 'bold rgb:178,0,140',
	boldprp: 'bold rgb:114,83,178',
	boldred: 'bold rgb:231,76,60',
	boldwht: 'bold rgb:224,224,224',
	boldylw: 'bold rgb:255,204,50',

	italicblk: 'italic rgb:48,48,48',
	italicblu: 'italic rgb:51,152,219',
	italiccyn: 'italic rgb:0,200,200',
	italicgrn: 'italic rgb:47,223,100',
	italicgry: 'italic rgb:144,144,144',
	italicorn: 'italic rgb:255,153,50',
	italicpnk: 'italic rgb:178,0,140',
	italicprp: 'italic rgb:114,83,178',
	italicred: 'italic rgb:231,76,60',
	italicwht: 'italic rgb:224,224,224',
	italicylw: 'italic rgb:255,204,50'
}));


var channel = can.createRawChannel('can0', true);


// Allegedly required messages:
// Message asking the data from the unit
// message preventing the sleep mode
// message initializing the rotational knob
// message controlling intensity of the backlight


// iDrive controller button states:
// Press
// Release
// Hold


// The rotational knob is connected to a 16 bit counter
// whose value is sent out through the CAN bus


// Message examples:

// CIC status
// 273 -> 1D E1 00 F0 FF 7F DE 04

// Ignition status
// 4F8 -> 00 42 FE 01 FF FF FF FF

// Counter/heartbeat
// Byte 4 changes from one state to the other every 5 sec
// 2BA -> 00 00 00 00 10
// 2BA -> 00 00 00 00 20


function out(src, data) {
	console.log('[%s]', src.toUpperCase(), data);
}

function json_out(data) {
	var json = JSON.stringify(data, null, 2);
	console.log(json);
}

function button_out(data) {
	let strings = {
		b3 : data.data[3].toString(16).toUpperCase(),
		b4 : data.data[4].toString(16).toUpperCase(),
		b5 : data.data[5].toString(16).toUpperCase(),
		string : null,
	};

	strings.string = strings.b3+' '+strings.b4+' '+strings.b5;

	if (status.con.last.string != strings.string) {
		status.con.last.string = strings.string;
		console.log('%s %s %s', strings.b3, strings.b4, strings.b5);
	}
}


// iDrive knob rotation
// ARBID 0x264: <Buffer e1 fd b5 fb 7f 1e>
function decode_con_rotation(data) {
	// data.data[2] : Counts up          between 0x00-0xFE : once every notch, regardless of the direction of turn.
	// data.data[3] : Counts up and down between 0x00-0xFE : depending on the direction of rotation

	// so do the math .. i've had several beers

	if (data.data[3] < status.con.rotation.relative) {
		status.con.rotation.direction = 'up';
	}

	// In the ghettoooooo
	if (data.data[3] > status.con.rotation.relative) {
		status.con.rotation.direction = 'down';
	}

	var subtract = data.data[3]-status.con.rotation.relative;

	// Spin it hard enough and you can get it to jump up to 24 notches!

	// If we over-run and go backwards to go forwards
	// .... yeah, good luck, homie!

	// If you're clever, you can actually
	// use the math vs. the missed packets
	// to determine how hard the wheel was flicked
	if (subtract == 0) return;

	if (subtract == 255) {
		status.con.rotation.direction = 'up';
	}
	else {
		if (subtract < -240) {
			status.con.rotation.direction = 'down';
		}
		else {

			if (subtract > 0 && subtract < 25) {
				status.con.rotation.direction = 'down';
			}
			else {
				status.con.rotation.direction = 'up';
			}
		}
	}

	// Replace the data to the status object
	status.con.rotation.absolute = data.data[2];
	status.con.rotation.relative = data.data[3];

	switch (status.con.rotation.direction) {
		case 'up'   : var direction_fmt = palette.boldgrn('up');  break;
		case 'down' : var direction_fmt = palette.boldred('down'); break;
		default     : var direction_fmt = palette.boldylw(status.con.rotation.relative.toString());
	}

	console.log('[%s] %s', palette.boldprp('ROTATE'), direction_fmt);

	socket.con_rotate(status.con);
}


// CON button press, length 6
function decode_con_button(data) {
	// Action bitmask data.data[3]:
	// bit0 : Press
	// bit1 : Hold
	// bit2 : ??
	// bit3 : ??
	// bit4 : Joystick up
	// bit5 : Joystick right
	// bit6 : Joystick down
	// bit7 : Joystick left
	// bit8 : Release


	// Mode bitmask data.data[4]:
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


	// Button bitmask data.data[5]:
	// bit0 : Menu
	// bit1 : Back
	// bit2 : Option
	// bit3 : Radio
	// bit4 : CD
	// bit5 : Nav
	// bit6 : Tel
	// bit7 : Center?


	// button  : menu
	// press   : 01 c0 01
	// release : 00 c0 01

	// button  : in
	// press   : 01 de 01
	// release : 00 de 01


	// Decode bitmasks
	let m = {
		a : bitmask.check(data.data[3]).mask, // mask actions
		m : bitmask.check(data.data[4]).mask, // mask buttons
		b : bitmask.check(data.data[5]).mask, // mask modes
	};

	let unmask = {
		actions : {},
		buttons : {},
		modes   : {},
	};

	// Detect 'mode' first, it determines what the button is
	unmask.modes = {
		button   : !m.m.bit0 && !m.m.bit1 && !m.m.bit2 && !m.m.bit3 && !m.m.bit4 && !m.m.bit5 &&  m.m.bit6 &&  m.m.bit7 && !m.m.bit8, // bit6+bit7 are true, all others false
		push     : !m.m.bit0 &&  m.m.bit1 &&  m.m.bit2 &&  m.m.bit3 &&  m.m.bit4 && !m.m.bit5 &&  m.m.bit6 &&  m.m.bit7 && !m.m.bit8, // bit0+bit5+bit8 are false, all others true
		joystick :  m.m.bit0 && !m.m.bit1 &&  m.m.bit2 &&  m.m.bit3 &&  m.m.bit4 && !m.m.bit5 &&  m.m.bit6 &&  m.m.bit7 && !m.m.bit8, // bit1+bit5+bit8 are false, all others true
	};

	// Loop unmask object to determine action+button combination
	for (let mode in unmask.modes) {
		if (unmask.modes[mode] === true) {
			unmask.mode = mode;
			break;
		}
	}

	unmask.actions = {
		press   :  m.a.bit0 && !m.a.bit1 && !m.a.bit8,
		hold    : !m.a.bit0 &&  m.a.bit1 && !m.a.bit8,
		release : !m.a.bit0 && !m.a.bit1 &&  m.a.bit8,
	};

	// Note how the joystick messages have their direction defined in bit3, not bit5
	unmask.buttons = {
		up    : unmask.modes.joystick &&  m.a.bit4 && !m.a.bit5 && !m.a.bit6 && !m.a.bit7,
		right : unmask.modes.joystick && !m.a.bit4 &&  m.a.bit5 && !m.a.bit6 && !m.a.bit7,
		down  : unmask.modes.joystick && !m.a.bit4 && !m.a.bit5 &&  m.a.bit6 && !m.a.bit7,
		left  : unmask.modes.joystick && !m.a.bit4 && !m.a.bit5 && !m.a.bit6 &&  m.a.bit7,
		none  : unmask.modes.joystick && !m.a.bit4 && !m.a.bit5 && !m.a.bit6 && !m.a.bit7, // All here are false

		in     : unmask.modes.push   &&  m.b.bit0 && !m.b.bit1 && !m.b.bit2 && !m.b.bit3 && !m.b.bit4 && !m.b.bit5 && !m.b.bit6,
		menu   : unmask.modes.button &&  m.b.bit0 && !m.b.bit1 && !m.b.bit2 && !m.b.bit3 && !m.b.bit4 && !m.b.bit5 && !m.b.bit6,
		back   : unmask.modes.button && !m.b.bit0 &&  m.b.bit1 && !m.b.bit2 && !m.b.bit3 && !m.b.bit4 && !m.b.bit5 && !m.b.bit6,
		option : unmask.modes.button && !m.b.bit0 && !m.b.bit1 &&  m.b.bit2 && !m.b.bit3 && !m.b.bit4 && !m.b.bit5 && !m.b.bit6,
		radio  : unmask.modes.button && !m.b.bit0 && !m.b.bit1 && !m.b.bit2 &&  m.b.bit3 && !m.b.bit4 && !m.b.bit5 && !m.b.bit6,
		cd     : unmask.modes.button && !m.b.bit0 && !m.b.bit1 && !m.b.bit2 && !m.b.bit3 &&  m.b.bit4 && !m.b.bit5 && !m.b.bit6,
		nav    : unmask.modes.button && !m.b.bit0 && !m.b.bit1 && !m.b.bit2 && !m.b.bit3 && !m.b.bit4 &&  m.b.bit5 && !m.b.bit6,
		tel    : unmask.modes.button && !m.b.bit0 && !m.b.bit1 && !m.b.bit2 && !m.b.bit3 && !m.b.bit4 && !m.b.bit5 &&  m.b.bit6,
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
}

function button_check(button) {
	// Workaround for the last of a proper 'release' message when in 'joystick mode'
	let joystick_release = button.mode == 'joystick' && button.action == 'release' && button.button == 'none';
	if (joystick_release === true) button.button = status.con.last.button.button;

	// Detect if there is a change from the last button message, bounce if not
	// CON sends a lot of repeat messages
	let change = status.con.last.button.action != button.action || status.con.last.button.button != button.button || status.con.last.button.mode != button.mode;
	if (change === false) return;

	// Store buttonpress data in 'last' object
	status.con.last.button = button;

	let output = {
		action : null,
		mode   : null,
	};

	// Pretty colors...
	switch (button.action) {
		case 'hold'    : output.action = palette.italicorn('  HOLD '); break;
		case 'press'   : output.action = palette.boldgrn  (' PRESS '); break;
		case 'release' : output.action = palette.italicgry('release'); break;
	}

	switch (button.mode) {
		case 'button'   : output.mode = palette.ylw('BUTN'); break;
		case 'joystick' : output.mode = palette.cyn('KNOB'); break;
		case 'push'     : output.mode = palette.cyn('KNOB'); break;
	}

	// if (button.action == 'press' && button.button == 'up') {
	//   status.con.backlight++;
	//   send_backlight_con(status.con.backlight);
	// }

	// if (button.action == 'press' && button.button == 'down') {
	//   status.con.backlight--;
	//   send_backlight_con(status.con.backlight);
	// }

	console.log('[%s] [%s] [%s] %s',
		palette.blu('BUTTON'),
		output.mode,
		output.action,
		button.button
	);

	socket.con_button(button);
}


function decode_backlight_con(data) {
	// data.data[0]: Backlight intensity
	// 0xFF      : 50%
	// 0xFE      :  0%
	// 0x00-0xFD :  1%-100%

	console.log('RECV : CON backlight \'%s\'', data.data[0]);
}

function decode_status_con(data) {
	if (data.data[4] == 0x06) { // CON needs init
		console.log('[%s] CON init', palette.boldprp('TRIGGR'));
		send_status_cic();
	}
}

function decode_ignition_new(data) {
	// console.log('Ignition message');
}

function decode_status_cic(data) {
	// console.log('CIC status message');
}


function send_backlight_con(value) {
	// data.data[0]: Backlight intensity
	// 0xFF      : 50%
	// 0xFE      :  0%
	// 0x00-0xFD :  1%-100%

	return;

	// Can't be > 100 || < 0
	if (value > 100) value = 100;
	if (value <   0) value = 0;

	status.con.backlight = value;

	// Parse 0-100 into 0-253
	let backlight_value = Math.round(value*2.53);

	// Klaus made 0 be 1%, but 254 be 0%
	// ... and the M62 motor mount has an oil passage ...
	if (value === 0) backlight_value = 0xFE;

	console.log('[ %s ] %s %s', palette.pnk('SEND'), 'CON backlight :', palette.boldylw(backlight_value.toString()));

	channel.send({
		id   : 0x202,
		data : Buffer.from([backlight_value, 0x00]),
	});
}

function send_heartbeat() {
	// 2BA -> 00 00 00 00 10
	// 2BA -> 00 00 00 00 20

	switch (status.con.last.heartbeat) {
		case 0x10 : status.con.last.heartbeat = 0x20; break;
		default   : status.con.last.heartbeat = 0x10;
	}
}

// E90 CIC status
function send_status_cic() {
	console.log('[ %s ] %s', palette.pnk('SEND'), 'CIC status');

	let msg = [0x1D, 0xE1, 0x00, 0xF0, 0xFF, 0x7F, 0xDE, 0x04];
	channel.send({
		id   : 0x273,
		data : Buffer.from(msg),
	});

	status.con.rotation.relative = -1;
}

// E90 Ignition status
function send_status_ignition_new() {
	// console.log('[ %s ] %s', palette.pnk('SEND'), 'ignition status');

	channel.send({
		id   : 0x4F8,
		data : Buffer.from([0x00, 0x42, 0xFE, 0x01, 0xFF, 0xFF, 0xFF, 0xFF]),
	});

	timeouts.status_ignition_new = setTimeout(send_status_ignition_new, 1000);
}


timeouts = {
	status_cic          : null,
	status_ignition_new : null,
};

status = {
	cic : {
		request_sent : false, // Must be reset after key-off event
	},
	con : {
		rotation : {
			absolute  : null,
			relative  : 0xFF,
			direction : null,
		},
		vals : {
			val1 : 127,
			val2 : 127,
			val3 : 127,
			val4 : 127,
		},
		backlight : 10,
	}
};

last = {
	heartbeat : null,
	button : {
		action : null,
		button : null,
		mode   : null,
	},
	string : null,
}

function fireup(fireup_callback) {
	// Respond to incoming CAN messages
	channel.addListener('onMessage', (data) => {
		switch (data.id) {
			case 0x202: decode_backlight_con(data); break; // Backlight message

			case 0x264: decode_con_rotation(data); break;
			case 0x267: decode_con_button(data);   break;

			case 0x273: decode_status_cic(data); break; // Used for iDrive knob rotational initialization
			case 0x277: break; // CON ACK to rotational initialization message

			case 0x4F8: decode_ignition_new(data); break;

			case 0x4E7: decode_status_con(data); break;
			case 0x5E7: decode_status_con(data); break;
				// case 0x4E7: console.log('[%s]', palette.boldorn('CONSTA'), data.data); break;
				// case 0x5E7: console.log('[%s]', palette.boldred('CONINC'), data.data); break;

				// default: console.log('[%s]', palette.red(data.id.toString(16)), data.data);
		}
	});

	channel.start();
	send_status_ignition_new();
	send_backlight_con(status.con.backlight);

	if (typeof fireup_callback === 'function') { fireup_callback(); }
	fireup_callback = undefined;
}

module.exports = {
	fireup : (fireup_callback) => { fireup(fireup_callback); },
};
