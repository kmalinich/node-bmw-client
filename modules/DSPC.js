const module_name = __filename.slice(__dirname.length + 1, -3);

// Parse data sent to DSPC module
function parse_in(data) {
	switch (data.msg[0]) {
		case 0x01: // Request: device status
			data.command = 'req';
			data.value   = 'device status';

			// Send the ready packet since this module doesn't actually exist
			if (config.emulate.dspc === true) {
				bus.commands.send_device_status(module_name);
			}
			break;

		case 0x35: // Broadcast: car memory
			return; // This is handled inside of DSP

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
			break;
	}
}

// Parse data sent from DSPC module
function parse_out(data) {
	switch (data.msg[0]) {
		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
			break;
	}

	log.bus(data);
}

module.exports = {
	parse_in  : (data) => { parse_in(data);  },
	parse_out : (data) => { parse_out(data); },
};
