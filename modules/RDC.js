// Parse data sent from module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x62 : { // Broadcast: RDC status
			data.command = 'bro';
			data.value   = 'RDC status TODO, ' + hex.i2s(data.msg[1]) + ' ' + hex.i2s(data.msg[2]);
			break;
		}
	}

	return data;
}


module.exports = {
	parse_out : parse_out,
};
