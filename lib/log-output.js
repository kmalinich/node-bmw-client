var module_name = __filename.slice(__dirname.length + 1, -3);

var align = require('multipad');
var chalk = require('chalk');

function center(string, width) {
	return align.center(string, width, ' ');
}

module.exports = {
	// Formatted output for when a value changes
	change : (data) => {
		data.command = 'CHANGE';

		// Pad strings
		data.src_fmt     = center(data.src,     14);
		data.command_fmt = center(data.command, 9);

		// Colorize strings
		data.src_fmt     = chalk.cyan (data.src_fmt);
		data.command_fmt = chalk.cyan (data.command_fmt);
		data.old         = chalk.red  (data.old);
		data.new         = chalk.green(data.new);

		// Replace and colorize true/false
		data.old = data.old.toString().replace('true', chalk.green('true')).replace('false', chalk.red('false'));
		data.new = data.new.toString().replace('true', chalk.green('true')).replace('false', chalk.red('false'));

		// Render gray arrow
		var arrows = chalk.white.dim('=>');

		// Output formatted string
		console.log('[%s] [%s] %s: \'%s\' %s \'%s\'', data.src_fmt, data.command_fmt, data.value, data.old, arrows, data.new);

		// Send log data to WebSocket
		socket.log_msg(data);
	},

	msg : (data) => {
		data.command = 'MESSAGE';

		// Pad strings
		data.src_fmt     = center(data.src,     14);
		data.command_fmt = center(data.command, 9);

		// Colorize strings
		data.src_fmt     = chalk.white.dim(data.src_fmt);
		data.command_fmt = chalk.white.dim(data.command_fmt);

		// Output formatted string
		console.log('[%s] [%s] %s', data.src_fmt, data.command_fmt, data.msg);

		// Send log data to WebSocket
		socket.log_msg(data);
	},

	module : (data) => {
		data.command = 'MESSAGE';

		// Pad strings
		data.src_fmt     = center(data.src,     14);
		data.command_fmt = center(data.command, 9);

		// Colorize strings
		data.src_fmt     = chalk.magenta(data.src_fmt);
		data.command_fmt = chalk.white.dim(data.command_fmt);

		// Output formatted string
		console.log('[%s] [%s] %s', data.src_fmt, data.command_fmt, data.msg);

		// Send log data to WebSocket
		socket.log_msg(data);
	},

	// Dynamic bus message output
	bus : (data) => {
		if (config.server.bus !== true) return;

		// Skip some excessive loggers
		// switch (data.value) {
		// 	case 'sensor status' : return; break;
		// 	case 'speed values'  : return; break;
		// }

		// Save original strings
		data.bus_orig      = data.bus;
		data.src.name_orig = data.src.name;
		data.dst.name_orig = data.dst.name;
		data.command_orig  = data.command;

		// Format bus
		data.bus = data.bus.charAt(0).toUpperCase();

		// Format command
		switch (data.command_orig) {
			case 'ack' : data.command = 'ACK';       break;
			case 'bro' : data.command = 'BROADCAST'; break;
			case 'con' : data.command = 'CONTROL';   break;
			case 'rep' : data.command = 'REPLY';     break;
			case 'req' : data.command = 'REQUEST';   break;
			case 'sta' : data.command = 'STATUS';    break;
			case 'upd' : data.command = 'UPDATE';    break;
			case 'unk' :
				data.command = 'UNKNOWN';
				data.value   = '0x'+data.msg[0].toString(16);
		}

		// Pad strings
		data.bus      = pad   (1, data.bus);
		data.src.name = pad   (4, data.src.name);
		data.dst.name = pad   (   data.dst.name, 4);
		data.command  = center(data.command, 9);

		// Colorize source and destination
		data.src.name = chalk.yellow(data.src.name);
		data.dst.name = chalk.green (data.dst.name);

		// Colorize bus
		switch (data.bus_orig) {
			case 'dbus' : data.bus = chalk.red    (data.bus); break;
			case 'ibus' : data.bus = chalk.cyan   (data.bus); break;
			case 'kbus' : data.bus = chalk.yellow (data.bus); break;
			case 'node' : data.bus = chalk.magenta(data.bus); break;
			default     : data.bus = chalk.magenta(data.bus);
		}

		// Colorize command
		switch (data.command_orig) {
			case 'ack' : data.command = chalk.green  (data.command); break;
			case 'bro' : data.command = chalk.magenta(data.command); break;
			case 'con' : data.command = chalk.red    (data.command); break;
			case 'rep' : data.command = chalk.green  (data.command); break;
			case 'req' : data.command = chalk.cyan   (data.command); break;
			case 'sta' : data.command = chalk.blue   (data.command); break;
			case 'upd' : data.command = chalk.blue   (data.command); break;
			default    : data.command = chalk.yellow (data.command); break;
		}

		// Replace and colorize true/false
		data.value = data.value.toString().replace('true', chalk.green('true')).replace('false', chalk.red('false'));

		// Render gray arrows
		var arrows = chalk.white.dim('>>');

		// Output formatted string
		console.log('[%s] [%s%s%s] [%s]', data.bus, data.src.name, arrows, data.dst.name, data.command, data.value);

		// Send log data to WebSocket
		socket.log_bus(data);
	},

	// Dynamic log message output
	send : (data) => {
		log.bus({
			bus     : 'sock',
			command : data.host.split('.')[0],
			value   : data.host,
			src     : {
				name : data.src,
			},
			dst : {
				name : data.dst,
			},
		});
	},
};
