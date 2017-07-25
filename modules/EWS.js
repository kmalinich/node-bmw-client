const module_name = __filename.slice(__dirname.length + 1, -3);

// Request various things from EWS
function request(value) {
	let cmd;

	log.module({
		src : module_name,
		msg : 'Requesting \''+value+'\'',
	});

	switch (value) {
		case 'immobiliserstatus':
			// cmd = [0x73, 0x00, 0x00, 0x80];
			cmd = [0x73];
			break;
	}

	bus_data.send({
		src: 'CCM',
		dst: module_name,
		msg: cmd,
	});
}

// Parse data sent from EWS module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x74: // Broadcast: immobiliser status
			data.command = 'bro';
			data.value   = 'key presence - ';

			// Bitmask for data.msg[1]
			// 0x00 = no key detected
			// 0x01 = immobilisation deactivated
			// 0x04 = valid key detected

			// Key detected/vehicle immobilised
			switch (data.msg[1]) {
				case 0x00:
					data.value += 'no key';
					status.immobilizer.key_present = false;
					break;
				case 0x01:
					data.value += 'immobilisation deactivated';
					// status.immobilizer.key_present = null;
					status.immobilizer.immobilized = false;
					break;
				case 0x04:
					data.value += 'valid key';
					status.immobilizer.key_present = true;
					status.immobilizer.immobilized = false;
					break;
				default:
					data.value += Buffer.from([data.msg[1]]);
			}

			// Key number 255/0xFF = no key
			if (data.msg[2] == 0xFF) {
				status.immobilizer.key_number = null;
			}
			else {
				status.immobilizer.key_number = data.msg[2];
			}

			data.value += ', key '+status.immobilizer.key_number;
			break;

		case 0xA0: // Broadcast: diagnostic command acknowledged
			data.command = 'bro';
			data.value   = 'diagnostic command acknowledged';
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
	}

	log.bus(data);
}

module.exports = {
	parse_out : (data)  => { parse_out(data); },
	request   : (value) => { request(value);  },
};
