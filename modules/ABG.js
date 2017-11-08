// Parse data sent from ABG module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x70: // Broadcast: Remote control central locking status
			data.command = 'bro';
			data.value   = 'remote control central locking status ' + data.msg;
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
