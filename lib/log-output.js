var module_name = __filename.slice(__dirname.length + 1, -3);

var align = require('multipad');
var chalk = require('chalk');

function center(string, width) {
	return align.center(string, width, ' ');
}

module.exports = {
	msg : (data) => {
		// Output formatted string
		console.log('[%s] [%s] %s', chalk.red(center(data.src, 21)), chalk.yellow(center('MESSAGE', 11)), data.msg);

		// Send log data to WebSocket
		bus_client.log_msg(data);
	},

	// Dynamic bus message output
	bus : (data) => {
		if (config.server.bus !== true) {
			return;
		}

		// Skip some excessive loggers
		switch (data.value) {
			case 'sensor status' : return; break;
			case 'speed values'  : return; break;
		}

		switch (data.command) {
			case 'ack':
				data.command = chalk.green('ACKNOWLEDGE');
				break;
			case 'bro':
				data.command = chalk.magenta('BROADCAST');
				break;
			case 'con':
				data.command = chalk.blue('CONTROL');
				break;
			case 'rep':
				data.command = chalk.green('REPLY');
				break;
			case 'req':
				data.command = chalk.cyan('REQUEST');
				break;
			case 'upd':
				data.command = chalk.blue('UPDATE');
				break;
			case 'unk':
				data.command = chalk.yellow('UNKNOWN');
				break;
			default:
				data.command = chalk.yellow(data.command);
				break;
		}

		switch (data.bus) {
			case 'ibus' : data.bus = chalk.magenta(data.bus); break;
			default     : data.bus = chalk.cyan(data.bus);
		}

		// Output formatted string
		console.log('[%s] [%s >> %s] [%s]', data.bus, chalk.yellow(pad(5, data.src.name)), chalk.green(pad(data.dst.name, 5)), center(data.command, 21), data.value);

		// Send log data to WebSocket
		bus_client.log_bus(data);
	},
};
