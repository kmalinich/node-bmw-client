// Parse data sent from CCM module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x1A: // Broadcast: check control message
			data.command = 'bro';
			data.value   = 'check control message TODO ' + hex.h2a(data.msg);
			break;

		case 0x51: // Broadcast: check control sensors
			data.command = 'bro';
			data.value   = 'check control sensors - ';

			// Le sigh.. this is a bitmask, not done properly
			switch (data.msg[1]) {
				case 0x00:
					data.value += 'none';
					break;
				case 0x04:
					data.value += 'key in ignition';
					break;
				case 0x12:
					data.value += 'seatbelt not fastened';
					break;
				default:
					data.value += data.msg[1];
			}
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
			break;
	}

	log.bus(data);
}

module.exports = {
	parse_out : parse_out,
};
