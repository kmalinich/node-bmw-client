const module_name = __filename.slice(__dirname.length + 1, -3);

// Set or unset the status timeout
function status_loop(action) {
	if (config.emulate.bmbt !== true) return;

	if (status.vehicle.ignition_level < 1) action = false;

	if (BMBT.status_status_loop === action) return;

	switch (action) {
		case false:
			status.rad.audio_control = 'audio off';

			status.dsp.reset  = true;
			status.dsp.ready  = false;
			status.dspc.reset = true;
			status.dspc.ready = false;
			status.rad.reset  = true;
			status.rad.ready  = false;

			// Set status variable
			BMBT.status_status_loop = false;

			if (BMBT.timeouts.status_loop !== null) {
				log.module({ src : module_name, msg : 'Unset status refresh timeout' });
				clearTimeout(BMBT.timeouts.status_loop);
				BMBT.timeouts.status_loop = null;
			}
			break;
		case true:
			// Send a couple through to prime the pumps
			refresh_status();

			// Set status variable
			BMBT.status_status_loop = true;

			log.module({ src : module_name, msg : 'Set status refresh timeout' });
			break;
	}
}

// Send BMBT status, and request status from RAD
function refresh_status() {
	if (status.vehicle.ignition_level > 0) {
		bus.commands.send_device_status('CDC');
		bus.commands.send_device_status('BMBT');
		bus.commands.send_device_status('DSPC');

		bus.commands.request_device_status(module_name, 'RAD');
		bus.commands.request_device_status('RAD',  'DSP');

		BMBT.timeouts.status_loop = setTimeout(refresh_status, 10000);

		return;
	}

	status_loop(false);
}

// Send the power on button command if needed/ready
function toggle_power_if_ready() {
	if (config.emulate.bmbt !== true) return;

	// Only setTimeout if we don't already have one waiting
	if (BMBT.timeouts.power_on === null) {
		BMBT.timeouts.power_on = setTimeout(() => {
			// Debug logging
			// log.module({ src : module_name, msg : 'dsp.ready: '+status.dsp.ready });
			// log.module({ src : module_name, msg : 'rad.audio_control: '+status.rad.audio_control });

			if (status.rad.audio_control == 'audio off' && status.vehicle.ignition_level > 0) {
				kodi.notify(module_name, 'power on');
				IKE.text_override(module_name+' power');

				log.module({
					src : module_name,
					msg : 'Sending power!',
				});

				send_button('power');
				// DSP.request('memory'); // Get the DSP memory
			}

			BMBT.timeouts.power_on = null;
		}, 2000);
	}
}

// Parse data sent to BMBT module
function parse_in(data) {
	// Init variables
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
				case 0x00:
					data.value += 'off';
					break;
				case 0x05:
					data.value += 'no tape';
					break;
				case 0xFF:
					data.value += 'on';
					break;
				default:
					data.value += 'unknown 0x'+data.msg[1].toString(16);
			}
			break;

		case 0x47: // Broadcast: BM status
			data.command = 'sta';
			data.value   = 'BM';
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

	log.bus(data);
}

// Say we have no tape in the player
function send_cassette_status(value = 0x05) {
	bus_data.send({
		src: module_name,
		dst: 'RAD',
		msg: [0x4B, value],
	});
}

// Emulate button presses
function send_button(button) {
	let button_down = 0x00;
	let button_hold;
	let button_up;

	// Switch statement to determine button, then encode bitmask
	switch (button) {
		case 'power':
			// Get down value of button
			button_down = bitmask.set(button_down, bitmask.bit[1]);
			button_down = bitmask.set(button_down, bitmask.bit[2]);

			// Generate hold and up values
			button_hold = bitmask.set(button_down, bitmask.bit[6]);
			button_up   = bitmask.set(button_down, bitmask.bit[7]);
			break;
	}

	log.module({ src : module_name, msg : 'Button down '+button });

	// Init variables
	let command     = 0x48; // Button action
	let packet_down = [command, button_down];
	let packet_up   = [command, button_up];

	bus_data.send({
		src: module_name,
		dst: 'RAD',
		msg: packet_down,
	});

	// Prepare and send the up message after 150ms
	setTimeout(() => {
		log.module({ src : module_name, msg : 'Button up '+button });

		bus_data.send({
			src: module_name,
			dst: 'RAD',
			msg: packet_up,
		});
	}, 150);
}


module.exports = {
	status_status_loop : false,

	timeouts : {
		power_on    : null,
		status_loop : null,
	},

	parse_in             : (data)   => { parse_in(data);              },
	parse_out            : (data)   => { parse_out(data);             },
	toggle_power_if_ready    : ()       => { toggle_power_if_ready();         },
	send_button          : (button) => { send_button(button);         },
	send_cassette_status : (value)  => { send_cassette_status(value); },
	status_loop          : (action) => { status_loop(action);         },
};
