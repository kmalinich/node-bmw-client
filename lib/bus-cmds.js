function send_device_status(src) {
	// Bounce if we're not configured to emulate this module
	if (config.emulate[src.toLowerCase()] !== true) return;

	log.msg({ msg : 'Sending ' + src.toUpperCase() + ' status' });

	// Handle 'ready' vs. 'ready after reset'
	let reset_bit = 0x00;
	if (status[src.toLowerCase()].reset === true) {
		status[src.toLowerCase()].reset = false;
		reset_bit = 0x01;
	}

	let destination;
	switch (src) {
		case 'CDC' :
		case 'RAD' : {
			destination = 'LOC';
			break;
		}

		default : {
			destination = 'GLO';
		}
	}

	bus.data.send({
		src : src.toUpperCase(),
		dst : destination,
		msg : [ 0x02, reset_bit ],
	});
}

function request_device_status(src, dst) {
	log.msg({ msg : 'Requesting ' + dst.toUpperCase() + ' status' });

	bus.data.send({
		src : src.toUpperCase(),
		dst : dst.toUpperCase(),
		msg : [ 0x01 ],
	});
}

module.exports = {
	send_device_status    : send_device_status,
	request_device_status : request_device_status,
};
