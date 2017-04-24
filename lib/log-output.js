module.exports = {
	// Dynamic log message output
	msg : (data) => {
		data.src = pad(8, data.src);
		console.log('[node] [%s]', pad(data.src, 9), data.msg);
	},

	// Dynamic bus message output
	out : (data) => {
		// Skip some excessive loggers
		switch (data.value) {
			case 'sensor status':
				return;
				break;
			case 'speed values':
				return;
				break;
		}

		var src_fmt;
		switch (data.src.name.length) {
			case 2:
				src_fmt = '  '+data.src.name;
				break;
			case 3:
				src_fmt = ' '+data.src.name;
				break;
			default:
				src_fmt = data.src.name;
				break;
		}

		var dst_fmt;
		switch (data.dst.name.length) {
			case 2:
				dst_fmt = data.dst.name+'  ';
				break;
			case 3:
				dst_fmt = data.dst.name+' ';
				break;
			default:
				dst_fmt = data.dst.name;
				break;
		}

		var command_fmt;
		switch (data.command) {
			case 'bro':
				command_fmt = 'BROADCAST';
				break;
			case 'con':
				command_fmt = ' CONTROL ';
				break;
			case 'rep':
				command_fmt = '  REPLY  ';
				break;
			case 'req':
				command_fmt = ' REQUEST ';
				break;
			case 'unk':
				command_fmt = ' UNKNOWN ';
				break;
			default:
				command_fmt = data.command;
				break;
		}

		console.log('[%s] [%s>%s] [%s]', data.bus, src_fmt, dst_fmt, command_fmt, data.value);
	},
};
