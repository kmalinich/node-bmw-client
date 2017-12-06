const module_name = __filename.slice(__dirname.length + 1, -3);

// Decode various BMBT button presses
function decode_button(data) {
	data.command = 'bro';
	data.value   = 'BM button ';

	let action = 'depress';
	let button;

	// Determine action
	let mask = bitmask.check(data.msg[1]).mask;
	switch (mask.b6) {
		case true : {
			switch (mask.b7) {
				case true  : break;
				case false : {
					// Remove hold bit from button value
					data.msg[1] = bitmask.unset(data.msg[1], bitmask.b[6]);
					action      = 'hold';
				}
			}
			break;
		}

		case false : {
			switch (mask.b7) {
				case false : break;
				case true  : {
					// Remove release bit from button value
					data.msg[1] = bitmask.unset(data.msg[1], bitmask.b[7]);
					action      = 'release';
				}
			}
		}
	}

	// Determine button
	switch (data.msg[1]) {
		case 0x00 : button = '>';        break;
		case 0x01 : button = '2';        break;
		case 0x02 : button = '4';        break;
		case 0x03 : button = '6';        break;
		case 0x04 : button = 'Tone';     break;
		case 0x05 : button = 'Knob';     break;
		case 0x06 : button = 'Power';    break;
		case 0x07 : button = 'Clock';    break;
		case 0x08 : button = 'Phone';    break;
		case 0x10 : button = '<';        break;
		case 0x11 : button = '1';        break;
		case 0x12 : button = '3';        break;
		case 0x13 : button = '5';        break;
		case 0x14 : button = '<>';       break;
		case 0x20 : button = 'Select';   break;
		case 0x21 : button = 'AM';       break;
		case 0x22 : button = 'RDS';      break;
		case 0x23 : button = 'Mode';     break;
		case 0x24 : button = 'Eject';    break;
		case 0x30 : button = 'RAD menu'; break;
		case 0x31 : button = 'FM';       break;
		case 0x32 : button = 'PTY/TP';   break;
		case 0x33 : button = 'Dolby';    break;
		case 0x34 : button = 'GT menu';  break;
		case 0x38 : button = 'Info';     break;
		default   : button = 'Unknown';
	}

	data.value += action + ' ' + button;

	// If media control is disabled, return here
	if (config.bmbt.media === false) return data;

	switch (action) {
		case 'hold' : {
			switch (config.bmbt.media) {
				case 'bluetooth' : // Bluetooth version
					switch (button) {
						case '<'     : break;
						case '>'     : break;
						case 'eject' : BT.command('play'); break; // Think about it
					}
					break;

				case 'kodi' : // Kodi version
					switch (button) {
						case '<'     : kodi.command('seek-rewind');  break;
						case '>'     : kodi.command('seek-forward'); break;
						case 'eject' : break;
					}
			}
			break;
		}

		case 'release' : {
			switch (config.bmbt.media) {
				case 'bluetooth' : // Bluetooth version
					switch (status.bmbt.last.action + status.bmbt.last.button) {
						case 'depress<'     : BT.command('previous'); break;
						case 'depress>'     : BT.command('next');     break;
						case 'depresseject' : BT.command('pause');    break; // Think about it

						case 'hold<'     : break;
						case 'hold>'     : break;
						case 'holdeject' : break;
					}
					break;

				case 'kodi' : // Kodi version
					switch (status.bmbt.last.action + status.bmbt.last.button) {
						case 'depress<'     : kodi.command('previous'); break;
						case 'depress>'     : kodi.command('next');     break;
						case 'depresseject' : kodi.command('toggle');   break;

						case 'hold<'     : kodi.command('toggle'); break;
						case 'hold>'     : kodi.command('toggle'); break;
						case 'holdeject' : break;
					}
			}
			break;
		}
	}

	// case 'depress' :

	// Update status object with the new data
	update.status('bmbt.last.action', action);
	update.status('bmbt.last.button', button);

	return data;
}

// Decode BMBT knob turns
function decode_knob(data) {
	data.command = 'bro';
	data.value   = 'BM knob ';

	let direction = 'left';
	let steps;

	// Determine rotation direction
	// Bit7 : Right
	let mask = bitmask.check(data.msg[1]).mask;
	if (mask.b7) {
		data.msg[1] = bitmask.unset(data.msg[1], bitmask.b[7]);
		direction   = 'right';
	}

	steps = data.msg[1];

	data.value += direction + ' ' + steps + ' steps';

	return data;
}

// Set or unset the status timeout
function status_loop(action) {
	if (config.emulate.bmbt !== true) return;

	if (status.vehicle.ignition_level < 1) action = false;

	if (BMBT.status_status_loop === action) return;

	log.module({ msg : 'status_loop(' + action + ')' });

	switch (action) {
		case false :
			update.status('rad.source_name', 'off');

			update.status('dsp.reset',  true);
			update.status('dsp.ready',  false);
			update.status('dspc.reset', true);
			update.status('dspc.ready', false);
			update.status('rad.reset',  true);
			update.status('rad.ready',  false);

			// Set status variable
			BMBT.status_status_loop = false;

			if (BMBT.timeouts.status_loop !== null) {
				log.module({ msg : 'Unset status refresh timeout' });
				clearTimeout(BMBT.timeouts.status_loop);
				BMBT.timeouts.status_loop = null;
			}
			break;

		case true :
			// Send a couple through to prime the pumps
			refresh_status();

			// Set status variable
			BMBT.status_status_loop = true;

			log.module({ msg : 'Set status refresh timeout' });
	}
}

// Send BMBT status, and request status from RAD
function refresh_status() {
	if (status.vehicle.ignition_level > 0) {
		log.module({ msg : 'Refreshing status' });

		bus.cmds.send_device_status('CDC');
		bus.cmds.send_device_status('BMBT');
		bus.cmds.send_device_status('DSPC');

		bus.cmds.request_device_status(module_name, 'RAD');
		bus.cmds.request_device_status('RAD',  'DSP');

		BMBT.timeouts.status_loop = setTimeout(refresh_status, 8000);

		return;
	}

	status_loop(false);
}

// Send the power on button command if needed/ready
function toggle_power_if_ready() {
	if (config.emulate.bmbt !== true) return;

	// Only setTimeout if we don't already have one waiting
	if (BMBT.timeouts.power_on !== null) return;

	BMBT.timeouts.power_on = setTimeout(() => {
		// Debug logging
		// log.module({ msg : 'dsp.ready: '+status.dsp.ready });
		// log.module({ msg : 'rad.source_name: '+status.rad.source_name });

		BMBT.timeouts.power_on = null;

		if (status.rad.source_name !== 'off' || status.vehicle.ignition_level === 0) {
			return;
		}

		kodi.notify(module_name,         'power [BMBT]');
		IKE.text_override(module_name + ' power [BMBT]');

		log.module({ msg : 'Sending power!' });

		send_button('power');
		// DSP.request('memory'); // Get the DSP memory

		status_loop(true);

		// Increase volume after power on
		setTimeout(() => {
			RAD.volume_control(5);
			RAD.volume_control(5);
			RAD.volume_control(5);
		}, 500);
		setTimeout(() => {
			RAD.volume_control(5);
			RAD.volume_control(5);
			RAD.volume_control(5);
		}, 750);
		setTimeout(() => {
			RAD.volume_control(5);
			RAD.volume_control(5);
			RAD.volume_control(5);
		}, 1000);
	}, 1000);
}

// Parse data sent to BMBT module
function parse_in(data) {
	switch (data.msg[0]) {
		case 0x4A: // Cassette control
			send_cassette_status();
			toggle_power_if_ready();
			break;
	}
}

// Parse data sent from BMBT module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x4B: // Cassette status
			data.command = 'sta';
			data.value   = 'cassette: ';

			switch (data.msg[1]) {
				case 0x00 : data.value += 'off';     break;
				case 0x05 : data.value += 'no tape'; break;
				case 0x06 : data.value += 'tape in'; break;
				case 0xFF : data.value += 'on';      break;
				default   : data.value += 'unknown 0x' + data.msg[1].toString(16);
			}
			break;

		case 0x47: // Broadcast: BM status
			data = decode_button(data);
			break;

		case 0x48: // Broadcast: BM button
			data = decode_button(data);
			break;

		case 0x49: // Broadcast: BM knob
			data = decode_knob(data);
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
			break;
	}

	log.bus(data);
}

// Say we have no tape in the player
function send_cassette_status(value = 0x05) {
	bus.data.send({
		src : module_name,
		dst : 'RAD',
		msg : [ 0x4B, value ],
	});
}

// Emulate button presses
function send_button(button) {
	let button_down = 0x00;
	// let button_hold;
	let button_up;

	// Switch statement to determine button, then encode bitmask
	switch (button) {
		case 'power' :
			// Get down value of button
			button_down = bitmask.set(button_down, bitmask.bit[1]);
			button_down = bitmask.set(button_down, bitmask.bit[2]);

			// Generate hold and up values
			// button_hold = bitmask.set(button_down, bitmask.bit[6]);
			button_up = bitmask.set(button_down, bitmask.bit[7]);
			break;
	}

	log.module({ msg : 'Button down ' + button });

	// Init variables
	let command     = 0x48; // Button action
	let packet_down = [ command, button_down ];
	let packet_up   = [ command, button_up ];

	bus.data.send({
		src : module_name,
		dst : 'RAD',
		msg : packet_down,
	});

	// Prepare and send the up message after 150ms
	setTimeout(() => {
		log.module({ msg : 'Button up ' + button });

		bus.data.send({
			src : module_name,
			dst : 'RAD',
			msg : packet_up,
		});
	}, 150);
}

function init_listeners() {
	// Enable keepalive on IKE ignition event
	IKE.on('ignition-powerup', () => {
		status_loop(true);
	});

	// Enable keepalive on IKE ignition event
	IKE.on('ignition-poweroff', () => {
		status_loop(false);
	});
}


module.exports = {
	status_status_loop : false,

	timeouts : {
		power_on    : null,
		status_loop : null,
	},

	init_listeners        : init_listeners,
	parse_in              : parse_in,
	parse_out             : parse_out,
	send_button           : send_button,
	send_cassette_status  : send_cassette_status,
	status_loop           : status_loop,
	toggle_power_if_ready : toggle_power_if_ready,
};
