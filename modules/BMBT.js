var module_name = __filename.slice(__dirname.length + 1, -3);

// Set or unset the status interval
function status_loop(action) {
	if (config.emulate.bmbt !== true) {
		return;
	}

	if (status.vehicle.ignition_level < 1) {
		action = false;
	}

	if (BMBT.status_status_loop == action) {
		return;
	}

	log.msg({ src : module_name, msg : 'Status loop '+action });

	switch (action) {
		case false:
			clearInterval(BMBT.interval_status_loop);

			// Set status variables
			BMBT.status_status_loop = false;

			status.rad.audio_control = 'audio off';

			status.dsp.reset  = true;
			status.dsp.ready  = false;
			status.dspc.reset = true;
			status.dspc.ready = false;
			status.rad.reset  = true;
			status.rad.ready  = false;

			break;
		case true:
			// Set status variable
			BMBT.status_status_loop = true;

			// Send a couple through to prime the pumps
			refresh_status();

			BMBT.interval_status_loop = setInterval(() => {
				refresh_status();
			}, 20000);
			break;
	}
}

// Send BMBT status, and request status from RAD
function refresh_status() {
	if (status.vehicle.ignition_level > 0) {
		bus_commands.request_device_status(module_name, 'RAD');
		bus_commands.request_device_status('RAD',  'DSP');
		return;
	}

	status_loop(false);
}

// Send the power on button command if needed/ready
function power_on_if_ready() {
	if (status.vehicle.ignition_level === 0 || config.emulate.bmbt !== true) { return; }

	// Debug logging
	// log.msg({ src : module_name, msg : 'dsp.ready: '+status.dsp.ready });
	// log.msg({ src : module_name, msg : 'rad.audio_control: '+status.rad.audio_control });

	if (status.rad.audio_control == 'audio off') {
		IKE.text_override('BMBT power');
		log.msg({
			src : module_name,
			msg : 'Sending power!',
		});
		send_button('power');
		DSP.request('memory'); // Get the DSP memory
	}
}

// Parse data sent to BMBT module
function parse_in(data) {
	// Init variables
	switch (data.msg[0]) {
		case 0x4A: // Cassette control
			data.command = 'con';
			data.value   = 'cassette ';
			data.value   = data.value+data.msg[1];

			send_cassette_status();
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
			break;
	}

	log.bus(data);
}

// Parse data sent from BMBT module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x32: // Broadcast: volume control
			data.command = 'bro';
			data.value   = 'volume control';
			break;

		case 0x4B: // Cassette status
			data.command = 'bro';
			data.value   = 'cassette status no tape';
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

	log.bus(data);
}

// Say we have no tape in the player
function send_cassette_status() {
	socket.data_send({
		src: module_name,
		dst: 'RAD',
		msg: [0x4B, 0x05],
	});
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

	log.msg({ src : module_name, msg : 'Button down '+button });

	// Init variables
	var command     = 0x48; // Button action
	var packet_down = [command, button_down];
	var packet_up   = [command, button_up];

	socket.data_send({
		src: module_name,
		dst: 'RAD',
		msg: packet_down,
	});

	// Prepare and send the up message after 150ms
	setTimeout(() => {
		log.msg({ src : module_name, msg : 'Button up '+button });
		socket.data_send({
			src: module_name,
			dst: 'RAD',
			msg: packet_up,
		});
	}, 150);
}


module.exports = {
	status_status_loop   : false,
	interval_status_loop : null,
	parse_in             : (data)        => { parse_in(data); },
	parse_out            : (data)        => { parse_out(data); },
	power_on_if_ready    : ()            => { power_on_if_ready(); },
	send_button          : (button)      => { send_button(button); },
	send_cassette_status : ()            => { send_cassette_status(); },
	send_device_status   : (module_name) => { bus_commands.send_device_status(module_name); },
	status_loop          : (action)      => { status_loop(action); },
}
