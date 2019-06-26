const EventEmitter = require('events');


class EGS extends EventEmitter {
	parse_304(data) {
		data.command = 'bro';
		data.value   = 'Transmission gear';

		let gear;

		switch (data.msg[0]) {
			case 0xC1 : gear = 'indeterminate'; break;

			case 0xC2 : gear = 'reverse'; break;
			case 0xC3 : gear = 'reverse'; break;

			case 0xC5 : gear = 'indeterminate'; break;
			case 0xC6 : gear = 'indeterminate'; break;

			case 0xC7 : gear = 'drive'; break;

			case 0xC8 : gear = 'indeterminate'; break;
			case 0xC9 : gear = 'indeterminate'; break;
			case 0xCA : gear = 'indeterminate'; break;

			case 0xD1 : gear = 'neutral'; break;

			case 0xE1 : gear = 'park'; break;
			case 0xE3 : gear = 'park'; break;

			default : gear = 'unknown';
		}

		// Emit gear event
		this.emit('gear', gear);

		// Update status object
		update.status('egs.gear', gear, false);

		return data;
	}


	// Parse data sent from module
	parse_out(data) {
		switch (data.src.id) {
			case 0x304 : return this.parse_304(data);

			default : data.value = data.src.id.toString(16);
		}

		return data;
	}
}


module.exports = EGS;
