import hex from '../share/hex.js';

// Parse data sent from module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x62 : { // Broadcast: RDC status
			data.command = 'bro';
			data.value   = 'TODO: RDC status ' + hex.i2s(data.msg[1]) + ' ' + hex.i2s(data.msg[2]);
			break;
		}
	}

	return data;
}


export default {
	parse_out,
};
