/* eslint key-spacing : 0 */


// Broadcast: Telephone data
function decode_data_telephone(data) {
	data.command = 'bro';
	data.value   = 'TODO: telephone data';

	// A9 03 30 30, NAV,TEL, Telephone data Current_network_request     Count_0
	// A9 0A 30 30, NAV,TEL, Telephone data Current_phone_status        Count_0
	// A9 31 00 00, TEL,NAV, Telephone data Telematics_settings_request

	// A9 0B 00 00 04,       TEL,NAV, Telephone data Data="0B 00 00 04"
	// A9 27 01 00 41 00 00, NAV,RAD, Telephone data Data="27 01 00 41 00 00"
	// A9 28 01 00 4D 00 00, NAV,RAD, Telephone data Data="28 01 00 4D 00 00"

	return data;
}

// Broadcast: Indicator status
function decode_status_indicator(data) {
	data.command = 'bro';
	data.value   = 'indicator status';

	// Bitmask
	// Bit0 = red,    solid
	// Bit1 = red,    flash
	// Bit2 = yellow, solid
	// Bit3 = yellow, flash
	// Bit4 = green,  solid
	// Bit5 = green,  flash

	const mask = bitmask.check(data.msg[1]).mask;

	// If 'flash' and 'solid' for the same color are passed, the LED flashes
	const led = {
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

	update.status('tel.led.green.solid',  led.green.solid,  false);
	update.status('tel.led.green.flash',  led.green.flash,  false);
	update.status('tel.led.red.solid',    led.red.solid,    false);
	update.status('tel.led.red.flash',    led.red.flash,    false);
	update.status('tel.led.yellow.solid', led.yellow.solid, false);
	update.status('tel.led.yellow.flash', led.yellow.flash, false);

	return data;
}

// Broadcast: Telephone status
function decode_status_telephone(data) {
	data.command = 'bro';
	data.value   = 'TODO: telephone status';

	// Bitmask
	// Bit0 : Handsfree
	// Bit1 : Active call (false = phone menu displayed)
	// Bit2 : Incoming call
	// Bit3 : Phone screen disabled
	// Bit4 : Phone on
	// Bit5 : Phone active
	// Bit6 : Phone adapter installed

	return data;
}

// Request: Special indicators
function decode_special(data) {
	data.command = 'req';
	data.value   = 'TODO: special indicators';

	return data;
}

// Broadcast: Text display
function decode_text(data) {
	data.command = 'bro';
	data.value   = 'text display: ' + hex.h2s(data.msg);

	return data;
}


// Turn on/off/flash the TEL LED by encoding a bitmask from an input object
function led(object) {
	// Return immediately if ignition is off
	if (status.vehicle.ignition_level === 0) return;

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

	log.module('Setting LED');

	// Send message
	bus.data.send({
		src : 'TEL',
		dst : 'ANZV',
		msg : [ 0x2B, byte ], // Turn on TEL LED
	});
} // led(object)


function setLEDs() {
	led({
		solid_red    : !status.bluetooth.device.connected,
		solid_yellow : (status.bluetooth.player.status === 'paused'),
		solid_green  : status.bluetooth.device.connected,

		flash_red    : status.bluetooth.device.disconnecting,
		flash_yellow : (status.bluetooth.player.status === 'playing'),
		flash_green  : status.bluetooth.device.connecting,
	});
} // setLEDs()


// Parse data sent to TEL module
function parse_in(data) {
	// Bounce if emulation isn't enabled
	if (config.emulate.tel !== true) return;

	// switch (data.msg[0]) {
	// }

	return data;
} // parse_in(data)

// Parse data sent from TEL module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x2B : return decode_status_indicator(data);
		case 0x2C : return decode_status_telephone(data);
		case 0xA9 : return decode_data_telephone(data);
		case 0x52 : return decode_text(data);
		case 0xA6 : return decode_special(data);
	}

	return data;
}

function init_listeners() {
	log.module('Initializing listeners');

	update.on('status.bluetooth.device.connected', setLEDs);
	update.on('status.bluetooth.device.connecting', setLEDs);
	update.on('status.bluetooth.device.disconnecting', setLEDs);
	update.on('status.bluetooth.player.status', setLEDs);

	update.on('status.vehicle.ignition_level', setLEDs);

	log.module('Initialized listeners');
} // init_listeners()


module.exports = {
	led,

	setLEDs,

	parse_in,
	parse_out,

	init_listeners,
};
