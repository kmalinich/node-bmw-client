var module_name = __filename.slice(__dirname.length + 1, -3);

module.exports = {
	// Dynamic log message output
	msg : (data) => {
		// Send log data to WebSocket
		bus_client.log_msg(data);

		// Output formatted string
		console.log('[node] [%s]', pad(6, data.src), data.msg);
	},

	// Dynamic bus message output
	bus : (data) => {
		// Send log data to WebSocket
		bus_client.log_bus(data);

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
		console.log('[%s] [%s>>%s] [%s]', data.bus, pad(6, data.src.name), pad(data.dst.name, 6), pad(data.command, 10), data.value);
	},
};
