// Ignition status
function decode_ignition(data) {
	data.command = 'bro';
	data.value   = 'Ignition status';

	log.module('Ignition message ' + Buffer.from(data.msg));

	let new_level_name;

	// Save previous ignition status
	let previous_level = status.vehicle.ignition_level;

	// Set ignition status value
	update.status('vehicle.ignition_level', data.msg[0]);

	switch (data.msg[0]) {
		case 0x00 : new_level_name = 'off'; break;

		case 0x40 : // Whilst just beginning to turn the key
		case 0x41 : new_level_name = 'accessory'; break;

		case 0x45 : new_level_name = 'run';   break;
		case 0x55 : new_level_name = 'start'; break;

		default : new_level_name = 'unknown';
	}

	update.status('vehicle.ignition', new_level_name);

	if (data.msg[0] > previous_level) { // Ignition going up
		switch (data.msg[0]) { // Evaluate new ignition state
			case 1 : { // Accessory
				log.module('Powerup state');
				this.emit('ignition-powerup');
				break;
			}

			case 3 : { // Run
				// If the accessory (1) ignition message wasn't caught
				if (previous_level === 0) {
					log.module('Powerup state');
					this.emit('ignition-powerup');
				}

				log.module('Run state');
				this.emit('ignition-run');

				break;
			}

			case 7 : { // Start
				switch (previous_level) {
					case 0 : { // If the accessory (1) ignition message wasn't caught
						log.module('Powerup state');
						this.emit('ignition-powerup');
						break;
					}

					case 3 : { // If the run (3) ignition message wasn't caught
						log.module('Run state');
						this.emit('ignition-run');
						break;
					}

					default : {
						log.module('Start-begin state');
						this.emit('ignition-start-begin');
					}
				}
			}
		}
	}
	else if (data.msg[0] < previous_level) { // Ignition going down
		switch (data.msg[0]) { // Evaluate new ignition state
			case 0 : { // Off
				// If the accessory (1) ignition message wasn't caught
				if (previous_level === 3) {
					log.module('Powerdown state');
					this.emit('ignition-powerdown');
				}

				log.module('Poweroff state');
				this.emit('ignition-poweroff');

				break;
			}

			case 1 : { // Accessory
				log.module('Powerdown state');
				this.emit('ignition-powerdown');

				break;
			}

			case 3 : { // Run
				log.module('Start-end state');
				this.emit('ignition-start-end');
			}
		}
	}

	data.command = 'bro';
	data.value   = 'ignition: ' + status.vehicle.ignition;

	return data;
}

// Parse data sent to module
function parse_in(data) {
	// Bounce if not enabled
	if (config.emulate.nbt1 !== true) return;

	switch (data.msg[0]) {
		default : {
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
		}
	}

	log.bus(data);
}

// Parse data sent from module
function parse_out(data) {
	switch (data.src.id) {
		case 0x130 : data = decode_ignition(data); break;

		default : {
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
		}
	}

	log.bus(data);
}


module.exports = {
	parse_in  : parse_in,
	parse_out : parse_out,
};
