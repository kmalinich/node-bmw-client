const module_name = __filename.slice(__dirname.length + 1, -3).replace('-', '_');

const align    = require('multipad');
const trucolor = require('trucolor');

// 24bit color chalk-style palette
const chalk = (0, trucolor.chalkish)((0, trucolor.palette)({}, {
	black  : 'rgb:48,48,48',
	blue   : 'rgb:51,152,219',
	cyan   : 'rgb:0,200,200',
	green  : 'rgb:47,223,100',
	gray   : 'rgb:144,144,144',
	orange : 'rgb:255,153,50',
	pink   : 'rgb:178,0,140',
	purple : 'rgb:114,83,178',
	red    : 'rgb:231,76,60',
	white  : 'rgb:224,224,224',
	yellow : 'rgb:255,204,50',

	boldblack  : 'bold rgb:48,48,48',
	boldblue   : 'bold rgb:51,152,219',
	boldcyan   : 'bold rgb:0,200,200',
	boldgreen  : 'bold rgb:47,223,100',
	boldgray   : 'bold rgb:144,144,144',
	boldorange : 'bold rgb:255,153,50',
	boldpink   : 'bold rgb:178,0,140',
	boldpurple : 'bold rgb:114,83,178',
	boldred    : 'bold rgb:231,76,60',
	boldwhite  : 'bold rgb:224,224,224',
	boldyellow : 'bold rgb:255,204,50',

	italicblack  : 'italic rgb:48,48,48',
	italicblue   : 'italic rgb:51,152,219',
	italiccyan   : 'italic rgb:0,200,200',
	italicgreen  : 'italic rgb:47,223,100',
	italicgray   : 'italic rgb:144,144,144',
	italicorange : 'italic rgb:255,153,50',
	italicpink   : 'italic rgb:178,0,140',
	italicpurple : 'italic rgb:114,83,178',
	italicred    : 'italic rgb:231,76,60',
	italicwhite  : 'italic rgb:224,224,224',
	italicyellow : 'italic rgb:255,204,50',
}));


function center(string, width) {
	return align.center(string, width, ' ');
}


module.exports = {
	// 24bit color chalk-style palette
	chalk : chalk,

	// Formatted output for when a value changes
	change : (data) => {
		data.command = 'CHANGE';

		// Pad strings
		data.src_fmt     = center(data.src,     14);
		data.command_fmt = center(data.command, 9);

		// Catch nulls
		if (data.old === null) data.old = 'null';
		if (data.new === null) data.new = 'null';

		// Colorize strings
		data.src_fmt     = chalk.cyan (data.src_fmt);
		data.command_fmt = chalk.cyan (data.command_fmt);
		data.old         = chalk.red  (data.old.toString());
		data.new         = chalk.green(data.new.toString());

		// Replace and colorize true/false
		data.old = data.old.toString().replace('true', chalk.green('true')).replace('false', chalk.red('false'));
		data.new = data.new.toString().replace('true', chalk.green('true')).replace('false', chalk.red('false'));

		// Render gray arrow
		let arrows = chalk.gray('=>');

		// Output formatted string
		console.log('[%s] [%s] %s: \'%s\' %s \'%s\'', data.src_fmt, data.command_fmt, data.value, data.old, arrows, data.new);

		// Send log data to WebSocket
		socket.log_msg(data);
	},

	msg : (data) => {
		data.command = 'MESSAGE';

		// Pad strings
		data.src_fmt     = center(data.src,     26);
		data.command_fmt = center(data.command, 21);

		// Colorize strings
		data.src_fmt     = chalk.gray(data.src_fmt);
		data.command_fmt = chalk.gray(data.command_fmt);

		// Output formatted string
		console.log('[%s] [%s] %s', data.src_fmt, data.command_fmt, data.msg);

		// Send log data to WebSocket
		socket.log_msg(data);
	},

	module : (data) => {
		data.mod = 'MODULE';

		// Pad strings
		data.src_fmt = center(data.src, 26);
		data.mod_fmt = center(data.mod, 21);
		data.msg_fmt = center(data.msg, 21);

		// Colorize strings
		data.src_fmt = chalk.pink(data.src_fmt);
		data.mod_fmt = chalk.orange(data.mod_fmt);
		data.msg_fmt = chalk.gray(data.msg_fmt);

		// Output formatted string
		console.log('[%s] [%s] %s', data.src_fmt, data.mod_fmt, data.msg_fmt);

		// Send log data to WebSocket
		socket.log_msg(data);
	},

	// Dynamic bus message output
	bus : (data) => {
		// Skip some excessive loggers
		switch (data.value) {
			case 'sensor status' : return; break;
			case 'speed values'  : return; break;
		}

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
			default    :
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
			case 'canbus' : data.bus = chalk.orange(data.bus); break;
			case 'dbus'   : data.bus = chalk.red   (data.bus); break;
			case 'ibus'   : data.bus = chalk.cyan  (data.bus); break;
			case 'kbus'   : data.bus = chalk.yellow(data.bus); break;
			case 'node'   : data.bus = chalk.pink  (data.bus); break;
			default       : data.bus = chalk.pink  (data.bus);
		}

		// Colorize command
		switch (data.command_orig) {
			case 'ack' : data.command = chalk.green (data.command); break;
			case 'bro' : data.command = chalk.pink  (data.command); break;
			case 'con' : data.command = chalk.red   (data.command); break;
			case 'rep' : data.command = chalk.green (data.command); break;
			case 'req' : data.command = chalk.cyan  (data.command); break;
			case 'sta' : data.command = chalk.blue  (data.command); break;
			case 'upd' : data.command = chalk.blue  (data.command); break;
			default    : data.command = chalk.yellow(data.command); break;
		}

		// Replace and colorize true/false
		data.value = data.value.toString().replace('true', chalk.green('true')).replace('false', chalk.red('false'));

		// Render gray arrows
		let arrows = chalk.gray('>>');

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

	socket : (data) => {
		data.orig = {
			method : data.method,
			type   : data.type,
			event  : data.event,
		};

		// Colorize strings
		switch (data.orig.method) {
			case 'tx' : data.method = chalk.red  (data.method.toUpperCase()); break;
			default   : data.method = chalk.green(data.method.toUpperCase()); break;
		}

		switch (data.orig.type) {
			case 'client' : data.type = chalk.blue  (center(data.type.toUpperCase(), 21)); break;
			default       : data.type = chalk.orange(center(data.type.toUpperCase(), 21)); break;
		}

		data.event = center(data.event, 21);
		switch (data.orig.event) {
			case 'bus-data'          : data.event = chalk.blue  (data.event); break;
			case 'lcd-text'          : data.event = chalk.cyan  (data.event); break;
			case 'log-bus'           : data.event = chalk.green (data.event); break;
			case 'log-msg'           : data.event = chalk.gray  (data.event); break;
			case 'host-data'         : data.event = chalk.pink  (data.event); break;
			case 'host-data-request' : data.event = chalk.purple(data.event); break;
			default                  : data.event = chalk.orange(data.event); break;
		}

		// Output formatted string
		console.log('[%s] [%s] [%s] %s', data.method, data.type, data.event, data.string);

		// Send log data to WebSocket
		socket.log_msg(data);
	},
};
