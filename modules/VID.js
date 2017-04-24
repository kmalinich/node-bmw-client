var module_name = __filename.slice(__dirname.length + 1, -3);

// Parse data sent from VID module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x4F: // RGB control (of LCD screen in dash)
			data.command = 'con';

			// On/off + input
			// Again, this is actually bitmask, but.. it's late
			// 0x00 : off
			// 0x01 : GT
			// 0x02 : TV
			// 0x04 : NAVJ
			// 0x10 : on
			switch (data.msg[1]) {
				case 0x00:
					data.value = 'LCD off';
					break;
				case 0x11:
					data.value = 'LCD on TV';
					break;
				case 0x12:
					data.value = 'LCD on GT';
					break;
				case 0x14:
					data.value = 'LCD on NAVJ';
					break;
				default:
					data.value = 'LCD on unknown \''+Buffer.from([data.msg[1]])+'\'';
					break;
			}
			break;

		case 0xA0: // Broadcast: diagnostic command acknowledged
			data.command = 'bro';
			data.value   = 'diagnostic command acknowledged';
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
	}

	log.out(data);
}

module.exports = {
  parse_out          : (data) => { parse_out(data); },
  send_device_status : (module_name) => { bus_commands.send_device_status(module_name); },
}
