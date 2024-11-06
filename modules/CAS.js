/* eslint key-spacing : 0 */

const EventEmitter = require('events');

// Bump up default max event listeners
EventEmitter.defaultMaxListeners = 20;


class CAS extends EventEmitter {
	constructor() {
		super();

		this.timeout = {
			encode_ignition : null,
		};
	} // constructor()


	// [0x130] Ignition status
	decode_ignition(data) {
		data.command = 'bro';

		let new_level_name;

		// Save previous ignition status
		const previous_level = status.vehicle.ignition_level;

		// Set ignition status value
		update.status('vehicle.ignition_level', data.msg[0], false);

		switch (data.msg[0]) {
			case 0x00 : new_level_name = 'off'; break;

			case 0x40 : // Whilst just beginning to turn the key
			case 0x41 : new_level_name = 'accessory'; break;

			case 0x45 : new_level_name = 'run';   break;
			case 0x55 : new_level_name = 'start'; break;

			default : new_level_name = 'unknown';
		}

		update.status('vehicle.ignition', new_level_name, false);

		if (data.msg[0] > previous_level) { // Ignition going up
			switch (data.msg[0]) { // Evaluate new ignition state
				case 0x40 :
				case 0x41 : { // Accessory
					log.module('Powerup state');
					break;
				}

				case 0x45 : { // Run
					log.module('Run state');

					// Perform KOMBI gauge sweep, if enabled
					KOMBI.gauge_sweep();
					break;
				}

				case 0x55 : { // Start
					switch (previous_level) {
						case 0x00 : { // If the accessory (1) ignition message wasn't caught
							log.module('Powerup state');
							break;
						}

						case 0x45 : { // If the run (3) ignition message wasn't caught
							log.module('Run state');
							break;
						}

						default : {
							log.module('Start-begin state');
						}
					}
				}
			}
		}
		else if (data.msg[0] < previous_level) { // Ignition going down
			switch (data.msg[0]) { // Evaluate new ignition state
				case 0x00 : { // Off
					// If the accessory (1) ignition message wasn't caught
					if (previous_level === 0x45) {
						log.module('Powerdown state');
					}

					log.module('Poweroff state');
					break;
				}

				case 0x40 :
				case 0x41 : { // Accessory
					log.module('Powerdown state');
					break;
				}

				case 0x45 : { // Run
					log.module('Start-end state');
				}
			}
		}

		data.value = 'ignition status: ' + status.vehicle.ignition;

		return data;
	} // decode_ignition(data)

	// Ignition status
	encode_ignition(action) {
		// Bounce if not enabled
		if (config.emulate.cas !== true) return;

		// Handle setting/unsetting timeout
		switch (action) {
			case false : {
				// Return here if timeout is already null
				if (this.timeout.encode_ignition !== null) {
					clearTimeout(this.timeout.encode_ignition);
					this.timeout.encode_ignition = null;

					log.module('Unset ignition status timeout');
				}

				// Send ignition off message
				bus.data.send({
					bus  : config.cas.can_intf,
					id   : 0x12F,
					data : Buffer.from([ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]),
				});

				// Return here since we're not re-sending again
				return;
			}

			case true : {
				if (this.timeout.encode_ignition === null) {
					log.module('Set ignition status timeout');
				}

				this.timeout.encode_ignition = setTimeout(this.encode_ignition, 100);
			}
		}

		const msg = {
			bus  : config.cas.can_intf,
		};

		switch (config.cas.generation.toLowerCase()) {
			case 'exx' : { // CIC
				msg.id   = 0x4F8;
				msg.data = [ 0x00, 0x42, 0xFE, 0x01, 0xFF, 0xFF, 0xFF, 0xFF ];
				break;
			}

			case 'fxx' : { // NBT
				msg.id   = 0x12F;
				msg.data = [ 0x37, 0x7C, 0x8A, 0xDD, 0xD4, 0x05, 0x33, 0x6B ];
				break;
			}

			default : {
				log.error('config.cas.generation must be set to one of Exx or Fxx');
				return;
			}
		}

		// Convert data array to Buffer
		msg.data = Buffer.from(msg.data);

		// Send message
		bus.data.send(msg);
	} // encode_ignition(action)


	// Broadcast: Key fob status
	// [0x23A] Decode a key fob bitmask message, and act upon the results
	decode_status_keyfob(data) {
		data.command = 'bro';
		data.value   = 'key fob status - ';

		const mask = bitmask.check(data.msg[2]).mask;

		const keyfob = {
			button     : null,
			button_str : null,
			buttons    : {
				lock   :  mask.bit2 && !mask.bit0 && !mask.bit4 && !mask.bit8,
				unlock : !mask.bit2 &&  mask.bit0 && !mask.bit4 && !mask.bit8,
				trunk  : !mask.bit2 && !mask.bit0 &&  mask.bit4 && !mask.bit8,
				none   : !mask.bit2 && !mask.bit0 && !mask.bit4,
			},
		};

		// Loop button object to populate log string
		for (const button in keyfob.buttons) {
			if (keyfob.buttons[button] !== true) continue;
			keyfob.button     = button;
			keyfob.button_str = 'button: ' + button;
			break;
		}

		// Update status object
		update.status('cas.keyfob.button',         keyfob.button,         false);
		update.status('cas.keyfob.buttons.lock',   keyfob.buttons.lock,   false);
		update.status('cas.keyfob.buttons.none',   keyfob.buttons.none,   false);
		update.status('cas.keyfob.buttons.trunk',  keyfob.buttons.trunk,  false);
		update.status('cas.keyfob.buttons.unlock', keyfob.buttons.unlock, false);

		// Emit keyfob event
		this.emit('keyfob', keyfob);

		// Assemble log string
		data.value += keyfob.key_str + ', ' + keyfob.button_str + ', ' + keyfob.low_batt_str;

		return data;
	} // decode_status_keyfob(data)

	// [0x2FC] Decode a door status message from CAS and act upon the results
	decode_status_opened(data) {
		data.command = 'bro';
		data.value   = 'door status';

		// Set status from message by decoding bitmask
		update.status('doors.front_left',  bitmask.test(data.msg[1], 0x01), false);
		update.status('doors.front_right', bitmask.test(data.msg[1], 0x04), false);
		update.status('doors.hood',        bitmask.test(data.msg[2], 0x04), false);
		update.status('doors.rear_left',   bitmask.test(data.msg[1], 0x10), false);
		update.status('doors.rear_right',  bitmask.test(data.msg[1], 0x40), false);
		update.status('doors.trunk',       bitmask.test(data.msg[2], 0x01), false);

		// Set status.doors.closed if all doors are closed
		const update_closed_doors = (!status.doors.front_left && !status.doors.front_right && !status.doors.rear_left && !status.doors.rear_right);
		update.status('doors.closed', update_closed_doors, false);

		// Set status.doors.opened if any doors are opened
		update.status('doors.opened', (update_closed_doors === false), false);

		// Set status.doors.sealed if all doors and flaps are closed
		const update_sealed_doors = (status.doors.closed && !status.doors.hood && !status.doors.trunk);
		update.status('doors.sealed', update_sealed_doors, false);

		return data;
	} // decode_status_opened(data)


	init_listeners() {
		// Bounce if not enabled
		if (config.emulate.cas !== true && config.retrofit.cas !== true) return;

		// Perform commands on power lib active event
		power.on('active', data => {
			this.encode_ignition(data.new);
		});

		log.module('Initialized listeners');
	} // init_listeners()


	// Parse data sent to module
	parse_in(data) {
		// Bounce if emulation isn't enabled
		if (config.emulate.cas !== true) return;

		return data;
	} // parse_in(data);

	// Parse data sent from module
	parse_out(data) {
		switch (data.src.id) {
			case 0x130 : return this.decode_ignition(data); // 0x12F / 0x4F8
			case 0x23A : return this.decode_status_keyfob(data);
			case 0x2FC : return this.decode_status_opened(data);
		}

		return data;
	} // parse_out();
}


module.exports = CAS;
