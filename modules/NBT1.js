// Ignition status
// Exx : 4F8 -> 00 42 FE 01 FF FF FF FF
// Fxx : 12F -> 37 7C 8A DD D4 05 33 6B
function decode_ignition(data) {
	// Bounce if not enabled
	if (config.emulate.nbt1 !== true && config.retrofit.nbt1 !== true) return;

	data.command = 'bro';
	data.value   = 'Ignition status';

	// log.module('Ignition message ' + Buffer.from(data.msg));

	return data;
}

// Used for iDrive knob rotational initialization
function decode_status_module(data) {
	// Bounce if not enabled
	if (config.emulate.nbt1 !== true && config.retrofit.nbt1 !== true) return;

	data.command = 'con';
	data.value   = 'NBT1 init iDrive knob';

	// log.module('NBT1 status message ' + Buffer.from(data.msg));

	return data;
}


function init_listeners() {
	// Bounce if not enabled
	if (config.emulate.nbt1 !== true && config.retrofit.nbt1 !== true) return;

	// Perform commands on power lib active event
	update.on('status.power.active', status_module);
	update.on('status.power.active', status_ignition);

	log.msg('Initialized listeners');
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
	// Bounce if not enabled
	if (config.emulate.nbt1 !== true && config.retrofit.nbt1 !== true) return;

	switch (data.src.id) {
		case 0x273 :
		case 0x563 : data = decode_status_module(data); break;

		case 0x277 : { // NBT1 ACK to rotational initialization message
			data.command = 'rep';
			data.value   = 'CON1 => NBT1 : ACK init';
			break;
		}

		case 0x34E : { // NBT1 navigation information
			data.command = 'bro';
			data.value   = 'Navigation system information';

			// Bounce if this data is already on K-CAN (can1)
			// if (data.bus === 'can1') break;

			// // Forward to can1
			// bus.data.send({
			// 	bus  : 'can1',
			// 	id   : data.src.id,
			// 	data : Buffer.from(data.msg),
			// });

			break;
		}

		case 0x38D : return;
		case 0x5E3 : {
			data.command = 'bro';
			data.value   = 'Services';
			break;
		}

		case 0x12F :
		case 0x4F8 : data = decode_ignition(data); break;

		default : {
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
		}
	}

	log.bus(data);
}


// NBT1 status
// 273 -> 1D E1 00 F0 FF 7F DE 04
function status_module() {
	// Bounce if not enabled
	if (config.emulate.nbt1 !== true && config.retrofit.nbt1 !== true) return;

	switch (config.nbt1.mode.toLowerCase()) {
		case 'cic' : {
			// When CON1 receives this message, it resets it's relative rotation counter to -1
			update.status('con1.rotation.relative', -1);
			break;
		}

		case 'nbt' : {
			switch (status.power.active) {
				case false : {
					if (NBT1.timeout.status_module !== null) {
						clearTimeout(NBT1.timeout.status_module);
						NBT1.timeout.status_module = null;

						log.module('Unset module status timeout');
					}

					// Return here since we're not re-sending again
					return;
				}

				case true : {
					if (NBT1.timeout.status_module === null) {
						log.module('Set module status timeout');
					}

					NBT1.timeout.status_module = setTimeout(status_module, 2000);
				}
			}
		}
	}

	// Default is NBT1 message
	let msg = {
		bus  : config.nbt1.can_intf,
		id   : null,
		data : [ ],
	};

	switch (config.nbt1.mode.toLowerCase()) {
		case 'cic' : {
			msg.id   = 0x273;
			msg.data = [ 0x1D, 0xE1, 0x00, 0xF0, 0xFF, 0x7F, 0xDE, 0x04 ];
			break;
		}

		case 'nbt' : {
			msg.id   = 0x563;
			msg.data = [ 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x63 ];
			break;
		}

		default : {
			log.module('config.nbt1.mode must be set to one of cic or nbt');
			return;
		}
	}

	// This is pretty noisy due to 2000ms timeout
	// log.module('Sending module status');

	// Convert data array to Buffer
	msg.data = Buffer.from(msg.data);

	// Send message
	bus.data.send(msg);
}

// Ignition status
// TODO : Should be in CAS1 module
function status_ignition() {
	// Bounce if not enabled
	if (config.retrofit.nbt1 !== true) return;

	// Handle setting/unsetting timeout
	switch (status.power.active) {
		case false : {
			// Return here if timeout is already null
			if (NBT1.timeout.status_ignition !== null) {
				clearTimeout(NBT1.timeout.status_ignition);
				NBT1.timeout.status_ignition = null;

				log.module('Unset ignition status timeout');
			}

			// Send ignition off message
			bus.data.send({
				bus  : config.nbt1.can_intf,
				id   : 0x12F,
				data : Buffer.from([ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]),
			});

			// Return here since we're not re-sending again
			return;
		}

		case true : {
			if (NBT1.timeout.status_ignition === null) {
				log.module('Set ignition status timeout');
			}

			NBT1.timeout.status_ignition = setTimeout(status_ignition, 100);
		}
	}

	// Default is NBT1 message
	let msg = {
		bus  : config.nbt1.can_intf,
		id   : 0x12F,
		data : [ 0x37, 0x7C, 0x8A, 0xDD, 0xD4, 0x05, 0x33, 0x6B ],
	};

	switch (config.nbt1.mode.toLowerCase()) {
		case 'cic' : {
			msg.id   = 0x4F8;
			msg.data = [ 0x00, 0x42, 0xFE, 0x01, 0xFF, 0xFF, 0xFF, 0xFF ];
		}
	}

	// This is pretty noisy due to 200ms timeout
	// log.module('Sending ignition status');

	// Convert data array to Buffer
	msg.data = Buffer.from(msg.data);

	// Send message
	bus.data.send(msg);
}


module.exports = {
	timeout : {
		status_ignition : null,
		status_module   : null,
	},

	// Functions
	init_listeners : init_listeners,

	parse_in  : parse_in,
	parse_out : parse_out,

	status_ignition : status_ignition, // Should be in CAS1 module
	status_module   : status_module,
};
