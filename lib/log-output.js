module.exports = {
	// Dynamic log message output
	msg : (data) => {
		// Send log data to WebSocket
		socket_client.log_msg(data);

		// Output formatted string
		console.log('[node] [%s]', pad(10, data.src, 10), data.msg);
	},

	// Dynamic bus message output
	bus : (data) => {
		// Send log data to WebSocket
		socket_client.log_bus(data);

		// Skip some excessive loggers
		switch (data.value) {
			case 'sensor status' : return; break;
			case 'speed values'  : return; break;
		}

		switch (data.command) {
			case 'bro':
				data.command = 'BROADCAST';
				break;
			case 'con':
				data.command = 'CONTROL';
				break;
			case 'rep':
				data.command = 'REPLY';
				break;
			case 'req':
				data.command = 'REQUEST';
				break;
			case 'unk':
				data.command = 'UNKNOWN';
		}

		// Output formatted string
		console.log('[%s] [%s > %s] [%s]', data.bus, pad(4, data.src.name), pad(data.dst.name, 4), pad(10, data.command, 10), data.value);
	},
};
