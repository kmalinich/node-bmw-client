function backlight(value) {
	// Bounce if not enabled
	if (config.emulate.fem1 !== true) return;

	// data.msg[0]: Backlight intensity
	// 0xFE      : 0%
	// 0x00-0xFD : 1%-100%
	// 0xFF      : 0%

	// Can't be > 0xFF || < 0x00
	if (value > 0xFF) value = 0xFF;
	if (value < 0x00) value = 0xFF;

	// Set status value
	update.status('fem1.backlight.value', value);

	// Workarounds
	switch (value) {
		case 0x00 : value = 0xFE; break; // 0% workaround
		case 0xFE : value = 0xFD; break; // Almost-100% workaround
		case 0xFF : value = 0xFD; break; // Almost-100% workaround
		default   : value--;             // Decrement value by one (see above)
	}

	update.status('fem1.backlight.real', value);

	bus.data.send({
		bus  : 'can1',
		id   : 0x202,
		data : Buffer.from([ value, 0x00 ]),
	});
}


// Backlight message
function decode_backlight(data) {
	data.command = 'bro';
	data.value   = 'Backlight intensity';

	// data.msg[0]: Backlight intensity
	// 0xFE      : 0%
	// 0x00-0xFD : 1%-100%
	// 0xFF      : 0%

	let value = data.msg[0];

	// Set status value
	update.status('fem1.backlight.real', value);

	// Workarounds
	switch (value) {
		case 0xFE : value = 0x00; break; // 0% workaround
		case 0xFD : value = 0xFF; break; // Almost-100% workaround
		case 0xFF : value = 0x00; break; // Almost-100% workaround
		default   : value++;             // Increment value by one (see above)
	}

	update.status('fem1.backlight.value', value);

	return data;
}


function init_listeners() {
	update.on('status.power.active', (data) => {
		switch (data.new) {
			case false : { // Turn off backlight when power shuts off
				backlight(0x00);
				break;
			}

			case true : { // Turn on backlight when power turns on
				backlight(0xFF);
			}
		}
	});

	log.module('Initialized listeners');
}


// Parse data sent from module
function parse_out(data) {
	switch (data.src.id) {
		case 0x202 : data = decode_backlight(data); break;

		default : {
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
		}
	}

	log.bus(data);
}


module.exports = {
	backlight : backlight,

	// Functions
	init_listeners : init_listeners,

	parse_out : parse_out,
};
