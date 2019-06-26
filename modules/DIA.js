// Parse data sent to module
function parse_in(data) {
	if (data.src.upper === 'LCM') LCM.parse_out(data);

	switch (DIA.last.val) {
		case 'coding-data' : {
			log.msg(DIA.last.cmd + ' ' + DIA.last.dst + ' ' + DIA.last.val + ': ' + data.msg);
			break;
		}

		case 'dsp-status' : {
			log.msg(DIA.last.dst + ' ' + DIA.last.val + ': ' + data.msg);
			break;
		}

		case 'io-status' : {
			log.msg(DIA.last.dst + ' ' + DIA.last.val + ': ' + data.msg);
			break;
		}

		case 'identity' : {
			log.msg(DIA.last.cmd + ' ' + DIA.last.dst + ' ' + DIA.last.val + ': ' + data.msg);
			break;
		}
	}
}

// Parse data sent from module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x00 : {
			data.command = 'req';
			data.value   = 'identity';
			break;
		}

		case 0x02 : {
			data.command = 'req';
			data.value   = 'ais';
			break;
		}

		case 0x08 : {
			data.command = 'req';
			data.value   = 'coding-data';
			break;
		}

		case 0x09 : {
			data.command = 'con';
			data.value   = 'coding-data';
			break;
		}

		case 0x0B : {
			data.command = 'req';
			data.value   = 'io-status';
			break;
		}

		case 0x0C : {
			data.command = 'con';
			data.value   = 'io-status';
			break;
		}

		case 0x1B : {
			data.command = 'req';
			data.value   = 'dsp-status';
			break;
		}

		case 0x1C : {
			data.command = 'con';
			data.value   = 'dsp-status';
			break;
		}

		case 0xB8 : {
			data.command = 'req';
			data.value   = 'motor-values';
		}
	}

	DIA.last = {
		cmd : data.command,
		dst : data.dst.name,
		msg : data.msg,
		val : data.value,
	};

	return data;
}

module.exports = {
	last : {
		cmd : null,
		dst : null,
		msg : null,
		val : null,
	},

	parse_in  : parse_in,
	parse_out : parse_out,
};
