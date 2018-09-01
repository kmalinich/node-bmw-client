function decode_pdc_status(data) {
	let parse;

	data.command = 'bro';
	data.value   = 'IKE gong/PDC status';

	parse = {
		distance_0 : data.msg[1],
		distance_1 : data.msg[2],
		distance_2 : data.msg[3],
	};

	log.module('Distances: ' + parse.distance_0 + ', ' + parse.distance_1 + ', ' + parse.distance_2);

	return data;
}

// Parse data sent from module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x07 : { // PDC status (Sets off IKE gongs)
			data = decode_pdc_status(data);
			break;
		}

		default : {
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
		}
	}

	log.bus(data);
}


module.exports = {
	parse_out : parse_out,
};
