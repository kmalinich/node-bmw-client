var module_name = __filename.slice(__dirname.length + 1, -3);

// Parse data sent from ABG module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x70: // Broadcast: Remote control central locking status
			data.command = 'bro';
			data.value   = 'remote control central locking status '+data.msg;
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
};
