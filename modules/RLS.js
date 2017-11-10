// This module.. can get confused with the AIC module
// (AIC module is the rain-only sensor)

function parse_light_control_status(data) {
	data.command = 'bro';
	data.value   = 'light control status';

	// Examples
	//
	// D1 D2
	// 11 01 Intensity=1, Lights=on,  Reason=Twilight
	// 21 02 Intensity=2, Lights=on,  Reason=Darkness
	// 31 04 Intensity=3, Lights=on,  Reason=Rain
	// 41 08 Intensity=4, Lights=on,  Reason=Tunnel
	// 50 00 Intensity=5, Lights=off, Reason=N/A
	// 60 00 Intensity=6, Lights=off, Reason=N/A
	//
	// D1 - Lights on/off + intensity
	// 0x01 : Bit0      : Lights on
	// 0x10 : Bit4      : Intensity 1
	// 0x20 : Bit5      : Intensity 2
	// 0x30 : Bit4+Bit5 : Intensity 3
	// 0x40 : Bit6      : Intensity 4
	// 0x50 : Bit4+Bit6 : Intensity 5
	// 0x60 : Bit5+Bit6 : Intensity 6
	//
	// D2 - Reason
	// 0x01 : Bit0 : Twilight
	// 0x02 : Bit1 : Darkness
	// 0x04 : Bit2 : Rain
	// 0x08 : Bit3 : Tunnel
	// 0x10 : Bit4 : Basement/garage

	let parse = {
		intensity : null,
		reason    : null,
	};

	update.status('rls.light.intensity', parse.intensity);
	update.status('rls.light.reason',    parse.reason);

	return data;
}

function parse_headlight_wipe_interval(data) {
	data.command = 'bro';
	data.value   = 'headlight wipe interval';

	update.status('rls.interval.wipe.headlight.v1', data.msg[1]);
	update.status('rls.interval.wipe.headlight.v2', data.msg[2]);

	// let notify_title = 'RLS : Headlight wipe interval';
	// let notify_msg   = 'V1: ' + status.rls.interval.wipe.headlight.v1 + ' V2: ' + status.rls.interval.wipe.headlight.v2;
	// kodi.notify(notify_title, notify_msg);

	return data;
}

// Parse data sent from RLS module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x58: { // Broadcast: Headlight wipe interval
			data = parse_headlight_wipe_interval(data);
			break;
		}

		case 0x59: { // Broadcast: Light control status
			data = parse_light_control_status(data);
			break;
		}

		default: {
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
		}
	}

	log.bus(data);
}

// Request various things from RLS
function request(value) {
	// Init variables
	let src;
	let cmd;

	switch (value) {
		case 'rain-sensor-status':
			src = 'IHKA';
			cmd = [ 0x71 ]; // Get IO status
			break;
	}

	bus.data.send({
		src : src,
		dst : 'GM',
		msg : cmd,
	});
}

module.exports = {
	request   : (data) => { request(data);   },
	parse_out : parse_out,
};
