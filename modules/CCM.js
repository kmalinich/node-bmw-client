var module_name = __filename.slice(__dirname.length + 1, -3);

// Parse data sent from CCM module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x1A: // Broadcast: check control message
			data.command = 'bro';
			data.value   = 'check control message TODO';
			break;

		case 0x51: // Broadcast: check control sensors
			data.command = 'bro';

			switch (data.msg[1]) {
				case 0x00:
					data.value = 'none';
					break;
				case 0x04:
					data.value = 'key in ignition';
					break;
				case 0x12:
					data.value = 'seatbelt not fastened';
					break;
				default:
					data.value = data.msg[1];
					break;
			}

			data.value = 'check control sensors: '+data.value;
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
			break;
	}

	log.bus(data);
}

module.exports = {
	parse_out          : (data)        => { parse_out(data);                              },
	send_device_status : (module_name) => { bus_commands.send_device_status(module_name); },
};
