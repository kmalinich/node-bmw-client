var module_name = __filename.slice(__dirname.length + 1, -3);

// Request various things from EWS
function request(value) {
	var cmd;
	console.log('[node::EWS] Requesting \'%s\'', value);

	switch (value) {
		case 'immobiliserstatus':
			// cmd = [0x73, 0x00, 0x00, 0x80];
			cmd = [0x73];
			break;
	}

	omnibus.data_send.send({
		src: 'CCM',
		dst: 'EWS',
		msg: cmd,
	});
}

// Parse data sent from EWS module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x74: // Broadcast: immobiliser status
			data.command = 'bro';

			// Bitmask for data.msg[1]
			// 0x00 = no key detected
			// 0x01 = immobilisation deactivated
			// 0x04 = valid key detected

			// Key detected/vehicle immobilised
			switch (data.msg[1]) {
				case 0x00:
					data.value = 'no key';
					status.immobilizer.key_present = false;
					break;
				case 0x01:
					data.value = 'immobilisation deactivated';
					// status.immobilizer.key_present = null;
					status.immobilizer.immobilized = false;
					break;
				case 0x04:
					data.value = 'valid key';
					status.immobilizer.key_present = true;
					status.immobilizer.immobilized = false;
					break;
				default:
					data.value = Buffer.from([data.msg[1]]);
					break;
			}

			data.value = 'key presence : \''+data.value+'\'';
			log.out(data);

			// Start over again
			data.value = null;

			// Key number 255/0xFF = no key, vehicle immobilized
			if (data.msg[2] == 0xFF) {
				status.immobilizer.key_number = null;
				// status.immobilizer.immobilized = true;
			}
			else {
				status.immobilizer.key_number = data.msg[2];
			}

			data.value = 'key number : \''+status.immobilizer.key_number+'\'';
			break;

		case 0xA0: // Broadcast: diagnostic command acknowledged
			data.command = 'bro';
			data.value   = 'diagnostic command acknowledged';
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
			break;
	}

	log.out(data);
}

module.exports = {
	parse_out          : (data) => { parse_out(data); },
	send_device_status : (module_name) => { bus_commands.send_device_status(module_name); },
	request            : (value) => { request(value); },
};
