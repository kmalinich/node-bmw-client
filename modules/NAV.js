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


// Parse data sent from module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x1F : { // Broadcast: Time and date
			data = parse_gps_time(data);
			break;
		}

		case 0xA2 : { // Broadcast: Current GPS position
			data.command = 'bro';
			data.value   = 'current GPS position TODO';
			// data.msg[1] = 0x01 : GPS fix
			break;
		}

		case 0xA4 : { // Broadcast: Current location name
			data.command = 'bro';
			data.value   = 'current location name TODO';
			// data.msg[2] = 0x01 : Town
			// data.msg[2] = 0x02 : Street
			break;
		}

		case 0xA7 : { // Request: TMC status
			data.command = 'req';
			data.value   = 'TMC status, update class: ' + hex.i2s(data.msg[1]);
			break;
		}

		case 0xA9 : { // Broadcast: Telephone data
			data.command = 'bro';
			data.value   = 'Telephone data TODO';
			// A9 03 30 30,NAV,TEL,Telephone data Current_network_request Count_0
			// A9 0A 30 30,NAV,TEL,Telephone data Current_phone_status    Count_0
			break;
		}

		default : {
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
		}
	}

	return data;
}

module.exports = {
	parse_out : parse_out,
};
