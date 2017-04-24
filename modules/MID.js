var module_name = __filename.slice(__dirname.length + 1, -3);

// Pad string for IKE text screen length (20 characters)
String.prototype.mid_pad = function() {
	var string = this;

	while (string.length < 20) {
		string = string + ' ';
	}

	return string;
}

// Interval var
var interval_status_loop;

// ASCII to hex for MID message
function ascii2hex(str) {
	var array = [];
	for (var n = 0, l = str.length; n < l; n ++) {
		var hex = str.charCodeAt(n);
		array.push(hex);
	}
	return array;
}

// Top screen - First 11 characters
// 68 C0 23 00 20 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F CK
// Top screen - Right half
// 80 C0 23 00 20 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F 2F CK
// Menu - First 3 boxes
// 68 C0 21 00 15 20 2F 2F 2F 2F 05 2F 2F 2F 2F 05 2F 2F 2F 2F 05 2F 2F 2F 2F 05 2F 2F 2F 2F 05 2F 2F 2F 2F CK
// Menu - Last 3 boxes
// 68 C0 21 00 15 06 2F 2F 2F 2F 05 2F 2F 2F 2F 05 2F 2F 2F 2F 05 2F 2F 2F 2F 05 2F 2F 2F 2F 05 2F 2F 2F 2F CK

function text(message) {
	console.log('[node::MID] Sending text to MID screen: \'%s\'', message);
	message = message.mid_pad();

	// Need to center text..
	var message_hex = [0x23, 0x00, 0x20];
	var message_hex = message_hex.concat(ascii2hex(message));
	// var message_hex = message_hex.concat(0x04);

	omnibus.data_send.send({
		src: 'IKE',
		dst: 'MID',
		msg: message_hex,
	});
}

// Set or unset the status interval
function status_loop(action) {
	if (config.emulate.mid !== true) {
		return;
	}

	switch (action) {
		case 'set':
			refresh_status();
			interval_status_loop = setInterval(() => {
				refresh_status();
			}, 20000);
			break;

		case 'unset':
			clearInterval(interval_status_loop, () => {
			});
			break;
	}

	log.msg({
		src : 'MID',
		msg : 'Ping interval '+action,
		});
}

// Send MID status, and request status from RAD
function refresh_status() {
	if (status.vehicle.ignition_level > 0) {
		bus_commands.request_device_status(module_name, 'RAD');
		return;
	}

	status_loop(false);
}

// Send the power on button command if needed/ready
function power_on_if_ready() {
	if (config.emulate.mid !== true) {
		return;
	}

	// Debug logging
	// console.log('[node:MID] dsp.ready         : \'%s\'', status.dsp.ready);
	// console.log('[node:MID] rad.audio_control : \'%s\'', status.rad.audio_control);

	if (status.rad.audio_control == 'audio off' && status.dsp.ready === true) {
		console.log('[node:MID] Sending power!');
		send_button('power');
	}
}

// Parse data sent to MID module
function parse_in(data) {
	// Init variables
	switch (data.msg[0]) {
		case 0x01: // Request: device status
			data.command = 'req';
			data.value = 'device status';

			// Send the ready packet since this module doesn't actually exist
			if (config.emulate.mid === true) {
				bus_commands.send_device_status(module_name);
			}
			break;

		case 0x02: // Device status
			data.command = 'bro';
			data.value   = 'device status ';
			switch (data.msg[1]) {
				case 0x00:
					data.value = data.value+'ready';
					break;
				case 0x01:
					data.value = data.value+'ready after reset';
					break;
			}
			break;

		default:
			data.command = 'unk';
			data.value = Buffer.from(data.msg);
			break;
	}

	log.out(data);
}

// Parse data sent from MID module
function parse_out(data) {
	// Init variables
	var command;
	var value;

	switch (data.msg[0]) {
		case 0x20: // Broadcast: display status
			data.command = 'bro';
			data.value   = 'display status';
			break;

		case 0x31: // Broadcast: button pressed
			data.command = 'bro';
			data.value   = 'button pressed';

			// 31 00 00 01,MID,RAD,Button Button_1_pressed
			// 31 00 00 03,MID,RAD,Button Button_3_pressed
			// 31 00 00 03,MID,RAD,Button TP_MUTE_pressed
			// 31 00 00 04,MID,RAD,Button Button_4_pressed
			// 31 00 00 04,MID,RAD,Button VOLUME_+_pressed
			// 31 00 00 05,MID,RAD,Button Button_5_pressed
			// 31 00 00 06,MID,RAD,Button Button_6_pressed
			// 31 00 00 06,MID,RAD,Button SEEK_<_pressed
			// 31 00 00 07,MID,RAD,Button SEEK_>_pressed
			// 31 00 00 08,MID,RAD,Button CC/CD_pressed
			// 31 00 00 09,MID,RAD,Button FM_pressed
			// 31 00 00 0A,MID,RAD,Button Button_A_pressed
			// 31 00 00 0B,MID,RAD,Button Button_B_pressed
			// 31 00 00 0B,MID,RAD,Button TONE_pressed
			// 31 00 00 0C,MID,RAD,Button MAN_pressed
			// 31 00 00 0D,MID,RAD,Button Button_D_pressed
			// 31 00 00 0D,MID,RAD,Button MEM_pressed
			// 31 00 00 0E,MID,RAD,Button SC/RP_pressed
			// 31 00 00 23,MID,RAD,Button Button_3_pressed_long
			// 31 00 00 25,MID,RAD,Button Button_5_pressed_long
			// 31 00 00 2B,MID,RAD,Button Button_B_pressed_long
			// 31 00 00 2D,MID,RAD,Button Button_D_pressed_long
			// 31 00 00 41,MID,RAD,Button Button_1_released
			// 31 00 00 43,MID,RAD,Button Button_3_released
			// 31 00 00 43,MID,RAD,Button TP_MUTE_released
			// 31 00 00 44,MID,RAD,Button Button_4_released
			// 31 00 00 44,MID,RAD,Button VOLUME_+_released
			// 31 00 00 45,MID,RAD,Button Button_5_released
			// 31 00 00 46,MID,RAD,Button Button_6_released
			// 31 00 00 46,MID,RAD,Button SEEK_<_released
			// 31 00 00 47,MID,RAD,Button SEEK_>_released
			// 31 00 00 48,MID,RAD,Button CC/CD_released
			// 31 00 00 49,MID,RAD,Button FM_released
			// 31 00 00 4A,MID,RAD,Button Button_A_released
			// 31 00 00 4B,MID,RAD,Button Button_B_released
			// 31 00 00 4B,MID,RAD,Button TONE_released
			// 31 00 00 4C,MID,RAD,Button MAN_released
			// 31 00 00 4D,MID,RAD,Button Button_D_released
			// 31 00 00 4D,MID,RAD,Button MEM_released
			// 31 00 00 4E,MID,RAD,Button SC/RP_released
			// 31 00 10 06,MID,RAD,Button Button_6_pressed
			// 31 00 10 0B,MID,RAD,Button Button_B_pressed
			// 31 00 10 46,MID,RAD,Button Button_6_released
			// 31 00 10 4B,MID,RAD,Button Button_B_released
			// 31 00 15 07,MID,RAD,Button Button_7_pressed
			// 31 00 15 0B,MID,RAD,Button Button_B_pressed
			// 31 00 15 47,MID,RAD,Button Button_7_released
			// 31 00 15 4B,MID,RAD,Button Button_B_released
			// 31 00 21 06,MID,RAD,Button Button_6_pressed
			// 31 00 21 46,MID,RAD,Button Button_6_released
			// 31 00 33 04,MID,RAD,Button Button_4_pressed
			// 31 00 33 06,MID,RAD,Button Button_6_pressed
			// 31 00 33 09,MID,RAD,Button Button_9_pressed
			// 31 00 33 0A,MID,RAD,Button Button_A_pressed
			// 31 00 33 0B,MID,RAD,Button Button_B_pressed
			// 31 00 33 44,MID,RAD,Button Button_4_released
			// 31 00 33 46,MID,RAD,Button Button_6_released
			// 31 00 33 49,MID,RAD,Button Button_9_released
			// 31 00 33 4A,MID,RAD,Button Button_A_released
			// 31 00 33 4B,MID,RAD,Button Button_B_released
			// 31 00 34 02,MID,RAD,Button Button_2_pressed
			// 31 00 34 04,MID,RAD,Button Button_4_pressed
			// 31 00 34 08,MID,RAD,Button Button_8_pressed
			// 31 00 34 0B,MID,RAD,Button Button_B_pressed
			// 31 00 34 2B,MID,RAD,Button Button_B_pressed_long
			// 31 00 34 42,MID,RAD,Button Button_2_released
			// 31 00 34 44,MID,RAD,Button Button_4_released
			// 31 00 34 48,MID,RAD,Button Button_8_released
			// 31 00 34 4B,MID,RAD,Button Button_B_released
			// 31 00 35 03,MID,RAD,Button Button_3_pressed
			// 31 00 35 43,MID,RAD,Button Button_3_released
			// 31 00 46 06,MID,RAD,Button Button_6_pressed
			// 31 00 46 46,MID,RAD,Button Button_6_released
			// 31 01 20 00,MID,IKE,Button Button_0_pressed
			// 31 01 20 40,MID,IKE,Button Button_0_released
			break;

		case 0x32: // Broadcast: volume control
			data.command = 'bro';
			data.value   = 'volume control';
			// data.msg[1] -
			// -1 : 10
			// -2 : 20
			// -3 : 30
			// -4 : 40
			// -5 : 50
			// +1 : 11
			// +2 : 21
			// +3 : 31
			// +4 : 41
			// +5 : 51
			break;

		case 0x47: // Broadcast: BM status
			data.command = 'bro';
			data.value   = 'BM status';
			break;

		case 0x48: // Broadcast: BM button
			data.command = 'bro';
			data.value   = 'BM button';
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
			break;
	}

	log.out(data);
}

// Emulate button presses
function send_button(button) {
	var button_down = 0x00;
	var button_hold;
	var button_up;

	// Switch statement to determine button, then encode bitmask
	switch (button) {
		case 'power':
			// Get down value of button
			button_down = bitmask.bit_set(button_down, bitmask.bit[1]);
			button_down = bitmask.bit_set(button_down, bitmask.bit[2]);

			// Generate hold and up values
			button_hold = bitmask.bit_set(button_down, bitmask.bit[6]);
			button_up   = bitmask.bit_set(button_down, bitmask.bit[7]);
			break;
	}

	console.log('[MID::RAD] Sending button down: %s', button);

	// Init variables
	var command = 0x48; // Button action
	var packet_down = [command, button_down];
	var packet_up = [command, button_up];

	omnibus.data_send.send({
		src: 'MID',
		dst: 'RAD',
		msg: packet_down,
	});

	// Prepare and send the up message after 150ms
	setTimeout(() => {
		console.log('[MID::RAD] Sending button up: %s', button);
		omnibus.data_send.send({
			src: 'MID',
			dst: 'RAD',
			msg: packet_up,
		});
	}, 150);
}

module.exports = {
	parse_in             : (data)        => { parse_in(data); },
	parse_out            : (data)        => { parse_out(data); },
	power_on_if_ready    : ()            => { power_on_if_ready(); },
	send_button          : (button)      => { send_button(button); },
	send_device_status   : (module_name) => { bus_commands.send_device_status(module_name); },
	status_loop          : (action)      => { status_loop(action); },
	text                 : (message)     => { text(message); },
};
