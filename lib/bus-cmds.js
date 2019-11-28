function send_device_status(src) {
	// Bounce if we're not configured to emulate this module
	if (config.emulate[src.toLowerCase()] !== true) return;

	// log.lib('Sending ' + src.toUpperCase() + ' status');

	// Handle 'ready' vs. 'ready after reset'
	let reset_bit = 0x00;
	if (status[src.toLowerCase()].reset === true) {
		status[src.toLowerCase()].reset = false;
		reset_bit = 0x01;
	}

	let destination;
	switch (src) {
		case 'CDC' :
		case 'RAD' : destination = 'LOC'; break;

		default : destination = 'GLO';
	}

	bus.data.send({
		src : src.toUpperCase(),
		dst : destination,
		msg : [ 0x02, reset_bit ],
	});
}

function request_device_status(src, dst) {
	src = src.toUpperCase();
	dst = dst.toUpperCase();

	// log.lib(src + ' requesting ' + dst + ' status');

	bus.data.send({
		src,
		dst,
		msg : [ 0x01 ],
	});
}


export default {
	send_device_status,
	request_device_status,
};
