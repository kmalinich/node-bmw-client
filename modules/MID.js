const pad = require('pad');


// Top screen - First 11 characters
// 68 C0 23 00 20 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F CK
// Top screen - Right half (20 char)
// 80 C0 23 00 20 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F CK
// Menu - First 3 boxes
// 68 C0 21 00 15 20 2F 2F 2F 2F 05 2F 2F 2F 2F 05 2F 2F 2F 2F 05 2F 2F 2F 2F 05 2F 2F 2F 2F 05 2F 2F 2F 2F CK
// Menu - Last 3 boxes
// 68 C0 21 00 15 06 2F 2F 2F 2F 05 2F 2F 2F 2F 05 2F 2F 2F 2F 05 2F 2F 2F 2F 05 2F 2F 2F 2F 05 2F 2F 2F 2F CK

function refresh_text() {
	if (config.chassis.model !== 'e39') return;

	if (status.vehicle.ignition_level < 1 || config.media.mid !== true) return;

	log.module('Updating MID text');

	let message_hex;

	// Upper left - 11 char radio display
	message_hex = [ 0x23, 0x40, 0x20 ];
	message_hex = message_hex.concat(hex.a2h(pad(status.mid.text_left, 11).substring(0, 11)));

	bus.data.send({
		src : 'RAD',
		msg : message_hex,
	});

	// Upper right - 20 char OBC display
	message_hex = [ 0x23, 0x40, 0x20 ];
	message_hex = message_hex.concat(hex.a2h(pad(20, status.mid.text_right.substring(0, 20))));

	bus.data.send({
		src : 'IKE',
		msg : message_hex,
	});

	// Left side menu
	message_hex = [ 0x21, 0x00, 0x15, 0x20 ];
	message_hex = message_hex.concat(hex.a2h(pad(status.mid.menu.button_1, 4).substring(0, 4)));
	message_hex = message_hex.concat(0x05);
	message_hex = message_hex.concat(hex.a2h(pad(status.mid.menu.button_2, 4).substring(0, 4)));
	message_hex = message_hex.concat(0x05);
	message_hex = message_hex.concat(hex.a2h(pad(status.mid.menu.button_3, 4).substring(0, 4)));
	message_hex = message_hex.concat(0x05);
	message_hex = message_hex.concat(hex.a2h(pad(status.mid.menu.button_4, 4).substring(0, 4)));
	message_hex = message_hex.concat(0x05);
	message_hex = message_hex.concat(hex.a2h(pad(status.mid.menu.button_5, 4).substring(0, 4)));
	message_hex = message_hex.concat(0x05);
	message_hex = message_hex.concat(hex.a2h(pad(status.mid.menu.button_6, 4).substring(0, 4)));

	bus.data.send({
		src : 'RAD',
		msg : message_hex,
	});

	// Right side menu
	message_hex = [ 0x21, 0x00, 0x15, 0x06 ];
	message_hex = message_hex.concat(hex.a2h(pad(status.mid.menu.button_7, 4).substring(0, 4)));
	message_hex = message_hex.concat(0x05);
	message_hex = message_hex.concat(hex.a2h(pad(status.mid.menu.button_8, 4).substring(0, 4)));
	message_hex = message_hex.concat(0x05);
	message_hex = message_hex.concat(hex.a2h(pad(status.mid.menu.button_9, 4).substring(0, 4)));
	message_hex = message_hex.concat(0x05);
	message_hex = message_hex.concat(hex.a2h(pad(status.mid.menu.button_10, 4).substring(0, 4)));
	message_hex = message_hex.concat(0x05);
	message_hex = message_hex.concat(hex.a2h(pad(status.mid.menu.button_11, 4).substring(0, 4)));
	message_hex = message_hex.concat(0x05);
	message_hex = message_hex.concat(hex.a2h(pad(status.mid.menu.button_12, 4).substring(0, 4)));

	bus.data.send({
		src : 'RAD',
		msg : message_hex,
	});
}

// Set or unset the text interval
function text_loop(action) {
	if (config.media.mid              !==   true) return;
	if (status.vehicle.ignition_level  <       1) action = false;
	if (MID.status.text_loop          === action) return;

	log.module('Text loop ' + action);

	switch (action) {
		case false : {
			clearInterval(MID.interval.text_loop);

			// Set text variables
			MID.status.text_loop = false;
			break;
		}

		case true : {
			// Set text variable
			MID.status.text_loop = true;

			// Send a couple through to prime the pumps
			refresh_text();

			MID.interval.text_loop = setInterval(() => {
				refresh_text();
			}, 5000);
		}
	}
}

// Set or unset the status interval
function status_loop(action) {
	if (config.emulate.mid            !==   true) return;
	if (status.vehicle.ignition_level  <       1) action = false;
	if (MID.status.status_loop        === action) return;

	log.module('Status loop ' + action);

	switch (action) {
		case false : {
			clearInterval(MID.interval.status_loop);

			// Set status variables
			MID.status.status_loop = false;

			update.status('rad.source_name', 'off');

			update.status('dsp.reset',  true);
			update.status('dsp.ready',  false);
			update.status('dspc.reset', true);
			update.status('dspc.ready', false);
			update.status('rad.reset',  true);
			update.status('rad.ready',  false);

			break;
		}

		case true : {
			// Set status variable
			MID.status.status_loop = true;

			// Send a couple through to prime the pumps
			refresh_status();

			MID.interval.status_loop = setInterval(() => {
				refresh_status();
			}, 20000);
			break;
		}
	}
}

// Send MID status, and request status from RAD
function refresh_status() {
	if (status.vehicle.ignition_level > 0) {
		bus.cmds.request_device_status('MID', 'RAD');
		bus.cmds.request_device_status('RAD', 'DSP');
		return;
	}

	status_loop(false);
}

// Send the power on button command if needed/ready
function toggle_power_if_ready() {
	if (status.vehicle.ignition_level === 0 || config.emulate.mid !== true) return;

	// Debug logging
	// log.module('dsp.ready         : \'' + status.dsp.ready + '\'');
	// log.module('rad.source_name : \'' + status.rad.source_name + '\'');

	if (status.rad.source_name === 'off') {
		IKE.text_override('MID power, from MID');
		log.module('Sending power!');

		button('power');
		DSP.request('memory'); // Get the DSP memory
	}
}

// Parse data sent to MID module
function parse_in(data) {
	switch (data.msg[0]) {
		default : {
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
			break;
		}
	}

	log.bus(data);
}

// Parse data sent from MID module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x20 : { // Broadcast : { Display status
			data.command = 'bro';
			data.value   = 'display status: ';
			break;
		}

		case 0x31 : { // Broadcast : { Button pressed
			data.command = 'bro';
			data.value   = 'button pressed: ' + data.msg[1] + ' ' + data.msg[2] + ' ' + data.msg[3];

			if (data.msg[1] === 0x00 && data.msg[2] === 0x15) {
				switch (data.msg[3]) {
					case 0x00 : break;
					case 0x01 : break;

					case 0x02 : bluetooth.command('connect');    break;
					case 0x03 : bluetooth.command('disconnect'); break;
					case 0x04 : bluetooth.command('previous');   break;
					case 0x05 : bluetooth.command('next');       break;
					case 0x06 : bluetooth.command('pause');      break;
					case 0x07 : bluetooth.command('play');       break;
					case 0x08 : bluetooth.command('repeat');     break;
					case 0x09 : bluetooth.command('shuffle');    break;

					case 0x0A : {
						update.config('lights.auto', false);
						LCM.auto_lights();
						break;
					}

					case 0x0B : {
						update.config('lights.auto', true);
						LCM.auto_lights();
						break;
					}
				}
			}

			// 00 00 01,MID,RAD,Button Button_1_pressed
			// 00 00 03,MID,RAD,Button Button_3_pressed
			// 00 00 03,MID,RAD,Button TP_MUTE_pressed
			// 00 00 04,MID,RAD,Button Button_4_pressed
			// 00 00 04,MID,RAD,Button VOLUME_+_pressed
			// 00 00 05,MID,RAD,Button Button_5_pressed
			// 00 00 06,MID,RAD,Button Button_6_pressed
			// 00 00 06,MID,RAD,Button SEEK_<_pressed
			// 00 00 07,MID,RAD,Button SEEK_>_pressed
			// 00 00 08,MID,RAD,Button CC/CD_pressed
			// 00 00 09,MID,RAD,Button FM_pressed
			// 00 00 0A,MID,RAD,Button Button_A_pressed
			// 00 00 0B,MID,RAD,Button Button_B_pressed
			// 00 00 0B,MID,RAD,Button TONE_pressed
			// 00 00 0C,MID,RAD,Button MAN_pressed
			// 00 00 0D,MID,RAD,Button Button_D_pressed
			// 00 00 0D,MID,RAD,Button MEM_pressed
			// 00 00 0E,MID,RAD,Button SC/RP_pressed
			// 00 00 23,MID,RAD,Button Button_3_pressed_long
			// 00 00 25,MID,RAD,Button Button_5_pressed_long
			// 00 00 2B,MID,RAD,Button Button_B_pressed_long
			// 00 00 2D,MID,RAD,Button Button_D_pressed_long
			// 00 00 41,MID,RAD,Button Button_1_released
			// 00 00 43,MID,RAD,Button Button_3_released
			// 00 00 43,MID,RAD,Button TP_MUTE_released
			// 00 00 44,MID,RAD,Button Button_4_released
			// 00 00 44,MID,RAD,Button VOLUME_+_released
			// 00 00 45,MID,RAD,Button Button_5_released
			// 00 00 46,MID,RAD,Button Button_6_released
			// 00 00 46,MID,RAD,Button SEEK_<_released
			// 00 00 47,MID,RAD,Button SEEK_>_released
			// 00 00 48,MID,RAD,Button CC/CD_released
			// 00 00 49,MID,RAD,Button FM_released
			// 00 00 4A,MID,RAD,Button Button_A_released
			// 00 00 4B,MID,RAD,Button Button_B_released
			// 00 00 4B,MID,RAD,Button TONE_released
			// 00 00 4C,MID,RAD,Button MAN_released
			// 00 00 4D,MID,RAD,Button Button_D_released
			// 00 00 4D,MID,RAD,Button MEM_released
			// 00 00 4E,MID,RAD,Button SC/RP_released
			// 00 10 06,MID,RAD,Button Button_6_pressed
			// 00 10 0B,MID,RAD,Button Button_B_pressed
			// 00 10 46,MID,RAD,Button Button_6_released
			// 00 10 4B,MID,RAD,Button Button_B_released
			// 00 15 07,MID,RAD,Button Button_7_pressed
			// 00 15 0B,MID,RAD,Button Button_B_pressed
			// 00 15 47,MID,RAD,Button Button_7_released
			// 00 15 4B,MID,RAD,Button Button_B_released
			// 00 21 06,MID,RAD,Button Button_6_pressed
			// 00 21 46,MID,RAD,Button Button_6_released
			// 00 33 04,MID,RAD,Button Button_4_pressed
			// 00 33 06,MID,RAD,Button Button_6_pressed
			// 00 33 09,MID,RAD,Button Button_9_pressed
			// 00 33 0A,MID,RAD,Button Button_A_pressed
			// 00 33 0B,MID,RAD,Button Button_B_pressed
			// 00 33 44,MID,RAD,Button Button_4_released
			// 00 33 46,MID,RAD,Button Button_6_released
			// 00 33 49,MID,RAD,Button Button_9_released
			// 00 33 4A,MID,RAD,Button Button_A_released
			// 00 33 4B,MID,RAD,Button Button_B_released
			// 00 34 02,MID,RAD,Button Button_2_pressed
			// 00 34 04,MID,RAD,Button Button_4_pressed
			// 00 34 08,MID,RAD,Button Button_8_pressed
			// 00 34 0B,MID,RAD,Button Button_B_pressed
			// 00 34 2B,MID,RAD,Button Button_B_pressed_long
			// 00 34 42,MID,RAD,Button Button_2_released
			// 00 34 44,MID,RAD,Button Button_4_released
			// 00 34 48,MID,RAD,Button Button_8_released
			// 00 34 4B,MID,RAD,Button Button_B_released
			// 00 35 03,MID,RAD,Button Button_3_pressed
			// 00 35 43,MID,RAD,Button Button_3_released
			// 00 46 06,MID,RAD,Button Button_6_pressed
			// 00 46 46,MID,RAD,Button Button_6_released
			// 01 20 00,MID,IKE,Button Button_0_pressed
			// 01 20 40,MID,IKE,Button Button_0_released
			break;
		}

		case 0x47 : { // Broadcast : { BM status
			data.command = 'bro';
			data.value   = 'BM status';
			break;
		}

		case 0x48 : { // Broadcast : { BM button
			data.command = 'bro';
			data.value   = 'BM button';
			break;
		}

		default : {
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
			break;
		}
	}

	log.bus(data);
}

// Emulate button presses
function button(button) {
	if (config.chassis.model !== 'e39') return;

	let button_down = 0x00;
	let button_hold;
	let button_up;

	// Switch statement to determine button, then encode bitmask
	switch (button) {
		case 'power' : {
			// Get down value of button
			button_down = bitmask.set(button_down, bitmask.bit[1]);
			button_down = bitmask.set(button_down, bitmask.bit[2]);

			// Generate hold and up values
			button_hold = bitmask.set(button_down, bitmask.bit[6]);
			button_up   = bitmask.set(button_down, bitmask.bit[7]);
			break;
		}
	}

	log.module('Button down: ' + button + ', hold: ' + button_hold);

	// Init variables
	let command     = 0x48; // Button action
	let packet_down = [ command, button_down ];
	let packet_up   = [ command, button_up ];

	bus.data.send({
		dst : 'RAD',
		msg : packet_down,
	});

	// Prepare and send the up message after 150ms
	setTimeout(() => {
		log.module('Button up: ' + button);

		bus.data.send({
			dst : 'RAD',
			msg : packet_up,
		});
	}, 150);
}

function init_listeners() {
	if (config.chassis.model !== 'e39') return;

	// Perform commands on power lib active event
	update.on('status.power.active', (data) => {
		status_loop(data.new);
		text_loop(data.new);
	});

	log.msg('Initialized listeners');
}


module.exports = {
	interval : {
		status_loop : null,
		text_loop   : null,
	},

	status : {
		status_loop : false,
		text_loop   : false,
	},

	button                : button,
	init_listeners        : init_listeners,
	parse_in              : parse_in,
	parse_out             : parse_out,
	refresh_text          : refresh_text,
	status_loop           : status_loop,
	text_loop             : text_loop,
	toggle_power_if_ready : toggle_power_if_ready,
};
