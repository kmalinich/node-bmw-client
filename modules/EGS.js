function parse_304(data) {
	let gear;

	switch (data.msg[0]) {
		case 0xC2 : gear = 'reverse'; break;
		case 0xC3 : gear = 'reverse'; break;

		case 0xC1 : gear = 'shifting'; break;

		case 0xC7 : gear = 'drive'; break;

		case 0xD1 : gear = 'neutral'; break;

		case 0xE1 : gear = 'park'; break;
		case 0xE3 : gear = 'park'; break;

		default : {
			gear = 'unknown';
		}
	}

	if (config.retrofit.nbt === true) {
		switch (gear) {
			case 'reverse' : {
				// If we're now in reverse, but weren't before,
				// Send message to NBT_HU to switch input to reverse camera
				if (status.egs.gear !== 'reverse') {
					setTimeout(() => {
						if (status.egs.gear !== 'reverse') {
							log.module('Switching NBT video to RFK');

							bus.data.send({
								bus  : config.nbt.can_intf,
								id   : 0x6F1,
								data : Buffer.from([ 0x63, 0x10, 0x0B, 0x31, 0x01, 0xA0, 0x1C, 0x00 ]),
							});

							setTimeout(() => {
								bus.data.send({
									bus  : config.nbt.can_intf,
									id   : 0x6F1,
									data : Buffer.from([ 0x63, 0x21, 0x00, 0x00, 0x04, 0x00, 0x01, 0xFF ]),
								});
							}, 100);
						}
					}, 250);
				}

				break;
			}

			default : {
				// If we're now NOT reverse, but were before,
				// Send message to NBT_HU to reset input switch
				if (status.egs.gear === 'reverse') {
					setTimeout(() => {
						if (status.egs.gear === 'reverse') {
							log.module('Resetting NBT video input');

							bus.data.send({
								bus  : config.nbt.can_intf,
								id   : 0x6F1,
								data : Buffer.from([ 0x63, 0x10, 0x0B, 0x31, 0x01, 0xA0, 0x1C, 0x00 ]),
							});

							setTimeout(() => {
								bus.data.send({
									bus  : config.nbt.can_intf,
									id   : 0x6F1,
									data : Buffer.from([ 0x63, 0x21, 0x00, 0x00, 0x01, 0x00, 0x01, 0xFF ]),
								});
							}, 100);
						}
					}, 250);
				}
			}
		}
	}

	update.status('egs.gear', gear);
}


// Parse data sent from module
function parse_out(data) {
	data.command = 'bro';

	switch (data.src.id) {
		case 0x304 : parse_304(data); data.value = 'Transmission gear'; break;

		default : data.value = data.src.id.toString(16);
	}
}


module.exports = {
	parse_out : parse_out,
};
