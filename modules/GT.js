const module_name = __filename.slice(__dirname.length + 1, -3);

// Parse data sent from GT module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x2B: // Broadcast: Indicator status
			data.command = 'bro';
			data.value   = 'indicator status';
			break;

		case 0x41: // Control: Aux heat/vent
			data.command = 'con';
			switch (data.msg[1]) {
				case 0x11: data.value = 'Aux heat off'; break;
				case 0x12: data.value = 'Aux heat on';  break;
				case 0x13: data.value = 'Aux vent off'; break;
				case 0x14: data.value = 'Aux vent on';  break;
			}
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
	}

	log.bus(data);
}

module.exports = {
	parse_out : (data) => { parse_out(data); },
};
