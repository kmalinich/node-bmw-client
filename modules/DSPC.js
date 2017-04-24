var module_name = __filename.slice(__dirname.length + 1, -3);

// Parse data sent to DSPC module
function parse_in(data) {
	switch (data.msg[0]) {
		case 0x01: // Request: device status
			data.command = 'req';
			data.value   = 'device status';

			// Send the ready packet since this module doesn't actually exist
			if (config.emulate.dspc === true) {
				bus_commands.send_device_status(module_name);
			}
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
			break;
	}

	log.out(data);
}

// Parse data sent from DSPC module
function parse_out(data) {
	switch (data.msg[0]) {
		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
			break;
	}

	log.out(data);
}

module.exports = {
	parse_in           : (data)        => { parse_in(data); },
	parse_out          : (data)        => { parse_out(data); },
	send_device_status : (module_name) => { bus_commands.send_device_status(module_name); },
};
