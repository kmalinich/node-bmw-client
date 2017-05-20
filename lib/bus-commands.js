var module_name = __filename.slice(__dirname.length + 1, -3);

function send_device_status(src) {
	// Bounce if we're not configured to emulate this module
	if (config.emulate[src.toLowerCase()] !== true) { return; }

	log.msg({ src: module_name, msg: 'Sending '+src.toUpperCase()+' status' });

	// Handle 'ready' vs. 'ready after reset'
	if (status[src.toLowerCase()].reset === true) {
		status[src.toLowerCase()].reset = false;
		var msg = [0x02, 0x00];
	}
	else {
		var msg = [0x02, 0x01];
	}

	var destination = 'GLO';
	if (src == 'CDC') { var destination = 'LOC'; }

	socket.data_send({
		src : src.toUpperCase(),
		dst : destination,
		msg : msg,
	});
}

function request_device_status(src, dst) {
	socket.data_send({
		src: src.toUpperCase(),
		dst: dst.toUpperCase(),
		msg: [0x01],
	});
}

module.exports = {
	send_device_status    : (src)      => { send_device_status(src); },
	request_device_status : (src, dst) => { request_device_status(src, dst); },
};
