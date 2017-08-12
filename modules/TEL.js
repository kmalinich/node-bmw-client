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

	log.bus(data);
}

// Turn on/off/flash the TEL LED by encoding a bitmask from an input object
function led(object) {
	// Bitmask
	// 0x00 = all off
	// 0x01 = solid red
	// 0x02 = flash red
	// 0x04 = solid yellow
	// 0x08 = flash yellow
	// 0x10 = solid green
	// 0x20 = flash green

	// Initialize output byte
	var byte = 0x00;
	if (object.solid_red)    byte = bitmask.set(byte, bitmask.bit[0]);
	if (object.flash_red)    byte = bitmask.set(byte, bitmask.bit[1]);
	if (object.solid_yellow) byte = bitmask.set(byte, bitmask.bit[2]);
	if (object.flash_yellow) byte = bitmask.set(byte, bitmask.bit[3]);
	if (object.solid_green)  byte = bitmask.set(byte, bitmask.bit[4]);
	if (object.flash_green)  byte = bitmask.set(byte, bitmask.bit[5]);

	// Send message
	log.module({ msg : 'Setting LED' });
	bus.data.send({
		src : 'TEL',
		dst: 'ANZV',
		msg: [0x2B, byte], // Turn on TEL LED
	});
}

module.exports = {
	led       : (object) => { led(object);     },
	parse_out : (data)   => { parse_out(data); },
};
