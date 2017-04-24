var module_name = __filename.slice(__dirname.length + 1, -3);

// Parse data sent from TEL module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x2B: // Broadcast: Indicator status
			data.command = 'bro';
			data.value   = 'indicator status TODO';
			break;

			// Bit0 = red
			// Bit1 = red + flashing
			// Bit2 = orange
			// Bit3 = orange + flashing
			// Bit4 = green
			// Bit5 = green + flashing

		case 0x2C: // Broadcast: Telephone status
			data.command = 'bro';
			data.value   = 'telephone status TODO';
			break;

			// Bit0 : Handsfree
			// Bit1 : Active call (false = phone menu displayed)
			// Bit2 : Incoming call
			// Bit3 : Phone screen disabled
			// Bit4 : Phone on
			// Bit5 : Phone active
			// Bit6 : Phone adapter installed

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
