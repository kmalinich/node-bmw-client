var module_name = __filename.slice(__dirname.length + 1, -3);

// 7F 80 1F 40 14 58 07 00 07 20 11,NAV --> IKE Time & date UTC 14:58 07 Juli 2011
// 7F 80 1F 40 14 59 07 00 07 20 11,NAV --> IKE Time & date UTC 14:59 07 Juli 2011
// 7F 80 1F 40 16 35 24 00 07 20 11,NAV --> IKE Time & date UTC 16:35 24 Juli 2011
// 7F 80 1F 40 17 47 05 00 06 20 11,NAV --> IKE Time & date UTC 17:47 05 Juni 2011
// 7F 80 1F 40 17 48 05 00 06 20 11,NAV --> IKE Time & date UTC 17:48 05 Juni 2011
// 7F 80 1F 40 17 49 05 00 06 20 11,NAV --> IKE Time & date UTC 17:49 05 Juni 2011
// 7F 80 1F 40 17 50 05 00 06 20 11,NAV --> IKE Time & date UTC 17:50 05 Juni 2011
// 7F 80 1F 40 17 51 05 00 06 20 11,NAV --> IKE Time & date UTC 17:51 05 Juni 2011
// 7F 80 1F 40 17 52 05 00 06 20 11,NAV --> IKE Time & date UTC 17:52 05 Juni 2011
// 7F 80 1F 40 17 53 05 00 06 20 11,NAV --> IKE Time & date UTC 17:53 05 Juni 2011
// 7F 80 1F 40 17 54 05 00 06 20 11,NAV --> IKE Time & date UTC 17:54 05 Juni 2011
// 7F 80 1F 40 17 55 05 00 06 20 11,NAV --> IKE Time & date UTC 17:55 05 Juni 2011
// 7F 80 1F 40 19 05 13 00 10 20 11,NAV --> IKE Time & date UTC 19:05 13 October 2011
// 7F 80 1F 40 20 07 12 00 10 20 11,NAV --> IKE Time & date UTC 20:07 12 Oktober 2011
// 7F 80 1F 40 20 07 20 00 07 20 11,NAV --> IKE Time & date UTC 20:07 20 Juli 2011
// 7F 80 1F 40 20 08 12 00 10 20 11,NAV --> IKE Time & date UTC 20:08 12 Oktober 2011
// 7F 80 1F 40 20 08 20 00 07 20 11,NAV --> IKE Time & date UTC 20:08 20 Juli 2011
// 7F 80 1F 40 20 15 22 00 08 20 11,NAV --> IKE Time & date UTC 20:15 22 August 2011
// 7F 80 1F 40 20 16 22 00 08 20 11,NAV --> IKE Time & date UTC 20:16 22 August 2011
// 7F 80 1F 40 21 26 06 00 07 20 11,NAV --> IKE Time & date UTC 21:26 06 Juli 2011
// 7F 80 1F 40 21 27 06 00 07 20 11,NAV --> IKE Time & date UTC 21:27 06 Juli 2011
// 7F 80 1F 40 21 28 06 00 07 20 11,NAV --> IKE Time & date UTC 21:28 06 Juli 2011
// 7F 80 1F 40 21 28 25 00 10 20 11,NAV --> IKE Time & date UTC 21:28 25 October 2011
// 7F 80 1F 40 21 29 06 00 07 20 11,NAV --> IKE Time & date UTC 21:29 06 Juli 2011
// 7F 80 1F 40 21 29 25 00 10 20 11,NAV --> IKE Time & date UTC 21:29 25 October 2011
// 7F 80 1F 40 21 30 25 00 10 20 11,NAV --> IKE Time & date UTC 21:30 25 October 2011
// 7F 80 1F 40 21 31 25 00 10 20 11,NAV --> IKE Time & date UTC 21:31 25 October 2011
// 7F 80 1F 40 21 32 25 00 10 20 11,NAV --> IKE Time & date UTC 21:32 25 October 2011
// 7F 80 1F 40 21 33 25 00 10 20 11,NAV --> IKE Time & date UTC 21:33 25 October 2011
// 7F 80 1F 40 21 34 25 00 10 20 11,NAV --> IKE Time & date UTC 21:34 25 October 2011
// 7F 80 1F 40 21 35 25 00 10 20 11,NAV --> IKE Time & date UTC 21:35 25 October 2011
// 7F 80 1F 40 21 36 25 00 10 20 11,NAV --> IKE Time & date UTC 21:36 25 October 2011
// 7F 80 1F 40 21 37 25 00 10 20 11,NAV --> IKE Time & date UTC 21:37 25 October 2011
// 7F 80 1F 40 21 38 25 00 10 20 11,NAV --> IKE Time & date UTC 21:38 25 October 2011

// Parse data sent from NAV module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x1F: // Broadcast: Time and date
			data.command = 'bro';
			data.value   = 'GPS time and date '+data.msg;
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
	}

	log.out(data);
}

module.exports = {
	parse_out          : (data) => { parse_out(data); },
	send_device_status : (module_name) => { bus_commands.send_device_status(module_name); },
};
