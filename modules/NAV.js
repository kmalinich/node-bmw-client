// Oct 25th 2011 21:38 UTC
// 1F 40 21 38 25 00 10 20 11
//    ?? %H %M %d ?? %m %C %y

// Parse GPS time and date message
function parse_gps_time(data) {
	data.command = 'bro';
	data.value   = 'GPS date and time';

	data.parse = {
		day    : parseInt(data.msg[4].toString(16)),
		hour   : parseInt(data.msg[2].toString(16)),
		minute : parseInt(data.msg[3].toString(16)),
		month  : parseInt(data.msg[6].toString(16)),
		year   : parseInt(data.msg[7].toString(16) + data.msg[8].toString(16)),

		string : null,
	};

	data.parse.string  = data.parse.year.toString() + '-' + data.parse.month.toString() + '-' + data.parse.day.toString() + ' ';
	data.parse.string += data.parse.hour.toString() + ':' + data.parse.minute + ' UTC';

	data.value += ': ' + data.parse.string;

	return data;
}

// Parse data sent from NAV module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x1F : { // Broadcast: Time and date
			data = parse_gps_time(data);
			break;
		}

		default : {
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
		}
	}

	log.bus(data);
}

module.exports = {
	parse_out : parse_out,
};
