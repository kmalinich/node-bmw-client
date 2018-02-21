/* eslint key-spacing : 0 */

// Parse data sent from TEL module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x2B : { // Broadcast: Indicator status
			data.command = 'bro';
			data.value   = 'indicator status';

			// Bitmask
			// Bit0 = red,    solid
			// Bit1 = red,    flash
			// Bit2 = yellow, solid
			// Bit3 = yellow, flash
			// Bit4 = green,  solid
			// Bit5 = green,  flash

			let mask = bitmask.check(data.msg[1]).mask;

			// If 'flash' and 'solid' for the same color are passed, the LED flashes
			let led = {
				green : {
					flash : !mask.bit0 && !mask.bit1 && !mask.bit2 && !mask.bit3 &&                mask.bit5 && !mask.bit8,
					solid : !mask.bit0 && !mask.bit1 && !mask.bit2 && !mask.bit3 &&  mask.bit4 && !mask.bit5 && !mask.bit8,
				},
				red : {
					flash :                mask.bit1 && !mask.bit2 && !mask.bit3 && !mask.bit4 && !mask.bit5 && !mask.bit8,
					solid :  mask.bit0 && !mask.bit1 && !mask.bit2 && !mask.bit3 && !mask.bit4 && !mask.bit5 && !mask.bit8,
				},
				yellow : {
					flash : !mask.bit0 && !mask.bit1 &&                mask.bit3 && !mask.bit4 && !mask.bit5 && !mask.bit8,
					solid : !mask.bit0 && !mask.bit1 &&  mask.bit2 && !mask.bit3 && !mask.bit4 && !mask.bit5 && !mask.bit8,
				},
			};

			update.status('tel.led.green.solid',  led.green.solid);
			update.status('tel.led.green.flash',  led.green.flash);
			update.status('tel.led.red.solid',    led.red.solid);
			update.status('tel.led.red.flash',    led.red.flash);
			update.status('tel.led.yellow.solid', led.yellow.solid);
			update.status('tel.led.yellow.flash', led.yellow.flash);
			break;
		}

		case 0x2C : { // Broadcast: Telephone status
			data.command = 'bro';
			data.value   = 'telephone status TODO';

			// Bitmask
			// Bit0 : Handsfree
			// Bit1 : Active call (false = phone menu displayed)
			// Bit2 : Incoming call
			// Bit3 : Phone screen disabled
			// Bit4 : Phone on
			// Bit5 : Phone active
			// Bit6 : Phone adapter installed
			break;
		}

		case 0x52 : { // Broadcast: Text display
			data.command = 'bro';
			data.value   = 'text display: ' + hex.h2s(data.msg);
			break;
		}

		case 0xA6 : { // Request: Special indicators
			data.command = 'req';
			data.value   = 'special indicators TODO';
			break;
		}

		case 0xA9 : { // Broadcast: Telephone data
			data.command = 'bro';
			data.value   = 'telephone data TODO';

			// A9 03 30 30, NAV,TEL, Telephone data Current_network_request     Count_0
			// A9 0A 30 30, NAV,TEL, Telephone data Current_phone_status        Count_0
			// A9 31 00 00, TEL,NAV, Telephone data Telematics_settings_request

			// A9 0B 00 00 04,       TEL,NAV, Telephone data Data="0B 00 00 04"
			// A9 27 01 00 41 00 00, NAV,RAD, Telephone data Data="27 01 00 41 00 00"
			// A9 28 01 00 4D 00 00, NAV,RAD, Telephone data Data="28 01 00 4D 00 00"
			break;
		}

		default : {
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
		}
	}

	log.bus(data);
}

// Turn on/off/flash the TEL LED by encoding a bitmask from an input object
function led(object) {
	// Bitmask
	// 0x00 = all off
	// Bit0 = red, solid
	// Bit1 = red, flashing
	// Bit2 = yellow, solid
	// Bit3 = yellow, flashing
	// Bit4 = green, solid
	// Bit5 = green, flashing

	// Initialize output byte
	let byte = 0x00;

	// If 'flash' and 'solid' for the same color are passed, the LED flashes
	if (object.solid_red)    byte = bitmask.set(byte, bitmask.bit[0]);
	if (object.flash_red)    byte = bitmask.set(byte, bitmask.bit[1]);
	if (object.solid_yellow) byte = bitmask.set(byte, bitmask.bit[2]);
	if (object.flash_yellow) byte = bitmask.set(byte, bitmask.bit[3]);
	if (object.solid_green)  byte = bitmask.set(byte, bitmask.bit[4]);
	if (object.flash_green)  byte = bitmask.set(byte, bitmask.bit[5]);

	log.module({ msg : 'Setting LED' });

	// Send message
	bus.data.send({
		src : 'TEL',
		dst : 'ANZV',
		msg : [ 0x2B, byte ], // Turn on TEL LED
	});
}

module.exports = {
	led       : led,
	parse_out : parse_out,
};
