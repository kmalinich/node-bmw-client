// This module.. can get confused with the AIC module
// (AIC module is the rain-only sensor)

// Parse data sent from RLS module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x58: { // Broadcast: Headlight wipe interval
			data.command = 'bro';
			data.value = 'headlight wipe interval';

			update.status('rls.interval.wipe.headlight.v1', data.msg[1]);
			update.status('rls.interval.wipe.headlight.v2', data.msg[2]);

			let notify_title = 'RLS : Headlight wipe interval';
			let notify_msg   = 'V1: ' + status.rls.interval.wipe.headlight.v1 + ' V2: ' + status.rls.interval.wipe.headlight.v2;

			kodi.notify(notify_title, notify_msg);
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
	parse_out : (data) => { parse_out(data); },
};
