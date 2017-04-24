var module_name = __filename.slice(__dirname.length + 1, -3);

// Parse data sent to CDC module
function parse_in(data) {
	// Init variables
	switch (data.msg[0]) {
		case 0x01: // Request: device status
			data.command = 'req';
			data.value   = 'device status';

			// Send the ready packet since this module doesn't actually exist
			if (config.emulate.cdc === true) {
				bus_commands.send_device_status(module_name);
			}
			break;

		case 0x02: // Device status
			switch (data.msg[1]) {
				case 0x00:
					data.value = 'ready';
					break;
				case 0x01:
					data.value = 'ready after reset';
					break;
			}
			break;

		case 0x38:
			if (config.emulate.cdc === true) {
				data.command = 'req'
				data.value   = 'CD control status';

				// Do CDC->LOC CD status stop
				send_cd_status('stop');
			}
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
			break;
	}
}

// Parse data sent from CDC module
function parse_out(data) {
	// Init variables
	switch (data.msg[0]) {
		case 0x39: // Broadcast: CD status
			data.command = 'bro';
			data.value   = 'CD status';
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
			break;
	}

	log.out(data);
}

// CDC->RAD CD status
function send_cd_status(status) {
	var data;
	var msg;

	switch (status) {
		case 'stop':
			msg = [0x39, 0x00, 0x02, 0x00, 0x01, 0x00, 0x01, 0x01];
			break;
		case 'play':
			msg = [0x39, 0x00, 0x02, 0x00, 0x01, 0x00, 0x01, 0x01];
			break;
	}

	omnibus.data_send.send({
		src: 'CDC',
		dst: 'RAD',
		msg: msg,
	});
}


module.exports = {
	parse_in           : (data) => { parse_in(data); },
	parse_out          : (data) => { parse_out(data); },
	send_cd_status     : () => { send_cd_status(status) },
	send_device_status : (module_name) => { bus_commands.send_device_status(module_name); },
};
