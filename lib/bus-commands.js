var module_name = __filename.slice(__dirname.length + 1, -3);

function send_device_status(src) {
	// Handle 'ready' vs. 'ready after reset'
	if (status[src.toLowerCase()].reset === true) {
		status[src.toLowerCase()].reset = false;
		var msg = [0x02, 0x00];
	}
	else {
		var msg = [0x02, 0x01];
	}

	omnibus.data_send.send({
		dst : 'GLO',
		msg : msg,
		src : src.toUpperCase(),
	});
}

function request_device_status(src, dst) {
	omnibus.data_send.send({
		src: src.toUpperCase(),
		dst: dst.toUpperCase(),
		msg: [0x01],
	});
}

module.exports = {
	send_device_status    : (src)      => { send_device_status(src); },
	request_device_status : (src, dst) => { request_device_status(src, dst); },
};
