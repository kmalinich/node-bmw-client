var module_name = __filename.slice(__dirname.length + 1, -3);
var align = require('multipad');

function center(string, width) {
	return align.center(string, width, ' ');
}

module.exports = {
	msg : (data) => {
		// Output formatted string
		console.log('[%s] [%s] %s', center(data.src, 21), center('MESSAGE', 24), data.msg);

		// Send log data to WebSocket
		bus_client.log_msg(data);
	},

	// Dynamic bus message output
	bus : (data) => {
		// Skip some excessive loggers
		switch (data.value) {
			case 'sensor status' : return; break;
			case 'speed values'  : return; break;
		}

		switch (data.command) {
			case 'ack':
				data.command = 'ACKNOWLEDGE';
				break;
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
		console.log('[%s] [%s >> %s] [%s]', data.bus, pad(5, data.src.name), pad(data.dst.name, 5), center(data.command, 24), data.value);

		// Send log data to WebSocket
		bus_client.log_bus(data);
	},
};
