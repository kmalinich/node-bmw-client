/* global config log status bus */

const module_name = __filename.slice(__dirname.length + 1, -3).replace('-', '_');

function send_device_status(src) {
	// Bounce if we're not configured to emulate this module
	if (config.emulate[src.toLowerCase()] !== true) return;

	log.msg({ src: module_name, msg: 'Sending '+src.toUpperCase()+' status' });

	// Handle 'ready' vs. 'ready after reset'
	let reset_bit = 0x00;
	if (status[src.toLowerCase()].reset === true) {
		status[src.toLowerCase()].reset = false;
		reset_bit = 0x01;
	}

	let destination = 'GLO';
	if (src == 'CDC') destination = 'LOC';

	bus.data.send({
		src : src.toUpperCase(),
		dst : destination,
		msg : [0x02, reset_bit],
	});
}

function request_device_status(src, dst) {
	bus.data.send({
		src : src.toUpperCase(),
		dst : dst.toUpperCase(),
		msg : [0x01],
	});
}

module.exports = {
	send_device_status    : (src)      => { send_device_status(src);         },
	request_device_status : (src, dst) => { request_device_status(src, dst); },
};
