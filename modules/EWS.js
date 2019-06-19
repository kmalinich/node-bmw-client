const EventEmitter = require('events');


class EWS extends EventEmitter {
	// Request various things from EWS
	request(value) {
		let cmd;

		log.module('Requesting \'' + value + '\'');

		switch (value) {
			case 'immobilizerstatus' : {
				// cmd = [0x73, 0x00, 0x00, 0x80];
				cmd = [ 0x73 ];
				break;
			}
		}

		bus.data.send({
			src : 'CCM',
			msg : cmd,
		});
	}


	// Broadcast: Immobilizer status
	parse_immobilizer_status(data) {
		data.command = 'bro';
		data.value   = 'key presence - ';

		// Bitmask for data.msg[1]
		// 0x00 = no key detected
		// 0x01 = immobilisation deactivated
		// 0x04 = valid key detected

		// Key detected/vehicle immobilised
		switch (data.msg[1]) {
			case 0x00 : {
				data.value += 'no key';
				update.status('immobilizer.key_present', false, false);
				break;
			}

			case 0x01 : {
				data.value += 'immobilisation deactivated';
				// update.status('immobilizer.key_present', null, false);
				update.status('immobilizer.immobilized', false, false);
				break;
			}

			case 0x04 : {
				data.value += 'valid key';
				update.status('immobilizer.key_present', true,  false);
				update.status('immobilizer.immobilized', false, false);
				break;
			}

			default : {
				data.value += Buffer.from([ data.msg[1] ]);
			}
		}

		// Key number 255/0xFF = no key
		switch (data.msg[2]) {
			case 0xFF : {
				update.status('immobilizer.key_number', null, false);
				break;
			}

			default : {
				update.status('immobilizer.key_number', data.msg[2], false);
			}
		}

		data.value += ', key ' + status.immobilizer.key_number;

		return data;
	}


	// Parse data sent from EWS module
	parse_out(data) {
		switch (data.msg[0]) {
			case 0x74 : return this.parse_immobilizer_status(data);

			// Broadcast: Diagnostic command acknowledged
			case 0xA0 : {
				data.command = 'bro';
				data.value   = 'diagnostic command acknowledged';
			}
		}

		return data;
	}
}


module.exports = EWS;
