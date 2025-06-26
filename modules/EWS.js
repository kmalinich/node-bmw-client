import EventEmitter from 'events';

// Bump up default max event listeners
EventEmitter.defaultMaxListeners = 20;

// Bump up default max event listeners
EventEmitter.defaultMaxListeners = 20;


class EWS extends EventEmitter {
	// Request various things from EWS
	request(value) {
		let cmd;

		log.module('Requesting \'' + value + '\'');

		switch (value) {
			case 'immobilizerstatus' : {
				// cmd = [ 0x73, 0x00, 0x00, 0x80 ];
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
		data.skipLog = true;

		data.command = 'bro';
		data.value   = 'key presence - ';

		// Bitmask for data.msg[1]
		// 0x00 = no key detected
		// 0x01 = immobilization deactivated
		// 0x04 = valid key detected
		const immobilizer = {
			immobilized : null,
			key_number  : 0,
			key_present : null,
		};


		// Key detected/vehicle immobilized
		switch (data.msg[1]) {
			case 0x00 : {
				data.value += 'no key';
				immobilizer.key_present = false;
				break;
			}

			case 0x01 : {
				data.value += 'immobilization deactivated';
				immobilizer.immobilized = false;
				break;
			}

			case 0x04 : {
				data.value += 'valid key';
				immobilizer.key_present = true;
				immobilizer.immobilized = false;
				break;
			}

			default : {
				data.value += Buffer.from([ data.msg[1] ]);
			}
		}

		// Key number 255/0xFF = no key
		switch (data.msg[2]) {
			case 0xFF : {
				immobilizer.key_number  = null;
				immobilizer.key_present = false;
				break;
			}

			default : {
				immobilizer.key_number = data.msg[2];
			}
		}

		data.value += ', key ' + immobilizer.key_number;


		// Update status object
		update.status('immobilizer.immobilized', immobilizer.immobilized, false);
		update.status('immobilizer.key_number',  immobilizer.key_number,  false);
		update.status('immobilizer.key_present', immobilizer.key_present, false);

		// Emit immobilizer event
		this.emit('immobilizer', immobilizer);

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


export default EWS;
