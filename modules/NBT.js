// Ignition status
// Exx : 4F8 -> 00 42 FE 01 FF FF FF FF
// Fxx : 12F -> 37 7C 8A DD D4 05 33 6B
function decode_ignition(data) {
	// Bounce if not enabled
	if (config.emulate.nbt !== true && config.retrofit.nbt !== true) return data;

	data.command = 'bro';
	data.value   = 'Ignition status';

	// log.module('Ignition message ' + Buffer.from(data.msg));

	return data;
}

// Used for iDrive knob rotational initialization
function decode_status_module(data) {
	// Bounce if not enabled
	if (config.emulate.nbt !== true && config.retrofit.nbt !== true) return data;

	data.command = 'con';
	data.value   = 'NBT init iDrive knob';

	// log.module('NBT status message ' + Buffer.from(data.msg));

	return data;
}

function video_source(source = 'default') {
	// Controlled by cmd_data.msg1[4], set to normal video output by default
	let cmd_data = {
		id   : 0x6F1,
		msg0 : [ 0x63, 0x10, 0x0B, 0x31, 0x01, 0xA0, 0x1C, 0x00 ],
		msg1 : [ 0x63, 0x21, 0x00, 0x00, 0x01, 0x00, 0x01, 0xFF ],
	};

	// Support toggling video input
	switch (source) {
		case 'toggle' : {
			log.module('Toggling video input');

			switch (status.nbt.video.source) {
				case 'default' : source = 'RFK'; break;
				case 'RFK'     : source = 'default';
			}

			break;
		}
	}

	switch (source) {
		case 'default' : cmd_data.msg1[4] = 0x01; break;
		case 'RFK'     : cmd_data.msg1[4] = 0x04; break;

		default : {
			log.module('Video source ' + source + ' is not valid');
			return;
		}
	}

	log.module('Setting NBT video source to ' + source);

	// Send 1st half of message
	bus.data.send({
		bus  : config.nbt.can_intf,
		id   : cmd_data.id,
		data : Buffer.from(cmd_data.msg0),
	});

	update.status('nbt.video.source', source);

	// 2nd half of message sent 100ms later
	setTimeout(() => {
		bus.data.send({
			bus  : config.nbt.can_intf,
			id   : cmd_data.id,
			data : Buffer.from(cmd_data.msg1),
		});
	}, 100);
}

function reverse_camera(gear) {
	// Bounce if NBT retrofit is not enabled or NBT reverse camera is not enabled
	if (config.retrofit.nbt               !== true) return;
	if (config.nbt.reverse_camera.enabled !== true) return;

	switch (gear) {
		case 'reverse' : {
			// If now in reverse, and were NOT before,
			// Send message to NBT to switch input to reverse camera
			if (status.egs.gear === 'reverse') return;

			// Wait 250ms, then check if we're still in reverse
			setTimeout(() => {
				if (status.egs.gear !== 'reverse') return;

				video_source(config.nbt.reverse_camera.input);
			}, 250);

			break;
		}

		default : {
			// If now NOT in reverse, and were before
			// Send message to NBT to switch input to default
			if (status.egs.gear !== 'reverse') return;

			setTimeout(() => {
				if (status.egs.gear         === 'reverse')                       return;
				if (status.nbt.video.source !== config.nbt.reverse_camera.input) return;

				video_source();
			}, 250);
		}
	}
}


function init_listeners() {
	// Bounce if not enabled
	if (config.emulate.nbt !== true && config.retrofit.nbt !== true) return;

	// Perform commands on EGS gear changes
	EGS.on('gear', reverse_camera);

	// Perform commands on power lib active event
	power.on('active', status_module);
	power.on('active', status_ignition);

	log.msg('Initialized listeners');
}


// NBT status
// 273 -> 1D E1 00 F0 FF 7F DE 04
function status_module(action = false) {
	// Bounce if not enabled
	if (config.emulate.nbt !== true && config.retrofit.nbt !== true) return;

	switch (config.nbt.mode.toLowerCase()) {
		case 'cic' : {
			// When CON receives this message, it resets it's relative rotation counter to -1
			update.status('con.rotation.relative', -1);
			break;
		}

		case 'nbt' : {
			switch (action) {
				case false : {
					if (NBT.timeout.status_module !== null) {
						clearTimeout(NBT.timeout.status_module);
						NBT.timeout.status_module = null;

						log.module('Unset module status timeout');
					}

					// Return here since we're not re-sending again
					return;
				}

				case true : {
					NBT.timeout.status_module = setTimeout(() => {
						status_module(true);
					}, 2000);

					if (NBT.timeout.status_module === null) {
						log.module('Set module status timeout');
					}
				}
			}
		}
	}

	// Default is NBT message
	let msg = {
		bus  : config.nbt.can_intf,
		id   : null,
		data : [ ],
	};

	switch (config.nbt.mode.toLowerCase()) {
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
			log.module('config.nbt.mode must be set to one of cic or nbt');
			return;
		}
	}

	// Convert data array to Buffer
	msg.data = Buffer.from(msg.data);

	// Send message
	bus.data.send(msg);
}

// Ignition status
// TODO: Should be in CAS module
function status_ignition() {
	// Bounce if not enabled
	if (config.retrofit.nbt !== true) return;

	// Handle setting/unsetting timeout
	switch (status.power.active) {
		case false : {
			// Return here if timeout is already null
			if (NBT.timeout.status_ignition !== null) {
				clearTimeout(NBT.timeout.status_ignition);
				NBT.timeout.status_ignition = null;

				log.module('Unset ignition status timeout');
			}

			// Send ignition off message
			bus.data.send({
				bus  : config.nbt.can_intf,
				id   : 0x12F,
				data : Buffer.from([ 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]),
			});

			// Return here since we're not re-sending again
			return;
		}

		case true : {
			if (NBT.timeout.status_ignition === null) {
				log.module('Set ignition status timeout');
			}

			NBT.timeout.status_ignition = setTimeout(status_ignition, 100);
		}
	}

	// Default is NBT message
	let msg = {
		bus  : config.nbt.can_intf,
		id   : 0x12F,
		data : [ 0x37, 0x7C, 0x8A, 0xDD, 0xD4, 0x05, 0x33, 0x6B ],
	};

	switch (config.nbt.mode.toLowerCase()) {
		case 'cic' : {
			msg.id   = 0x4F8;
			msg.data = [ 0x00, 0x42, 0xFE, 0x01, 0xFF, 0xFF, 0xFF, 0xFF ];
		}
	}

	// Convert data array to Buffer
	msg.data = Buffer.from(msg.data);

	// Send message
	bus.data.send(msg);
}


// Parse data sent to module
function parse_in(data) {
	// Bounce if not enabled
	if (config.emulate.nbt !== true) return data;

	return data;
}

// Parse data sent from module
function parse_out(data) {
	// Bounce if not enabled
	if (config.emulate.nbt !== true && config.retrofit.nbt !== true) return data;

	switch (data.src.id) {
		case 0x273 :
		case 0x563 : return decode_status_module(data);

		case 0x277 : { // NBT ACK to rotational initialization message
			data.command = 'rep';
			data.value   = 'CON => NBT : ACK init';
			break;
		}

		case 0x34E : { // NBT navigation information
			data.command = 'bro';
			data.value   = 'Navigation system information';
			break;
		}

		case 0x38D : return;
		case 0x5E3 : {
			data.command = 'bro';
			data.value   = 'Services';
			break;
		}

		case 0x12F :
		case 0x4F8 : return decode_ignition(data);
	}

	return data;
}


module.exports = {
	timeout : {
		status_ignition : null,
		status_module   : null,
	},

	// Functions
	init_listeners : init_listeners,

	video_source : video_source,

	parse_in  : parse_in,
	parse_out : parse_out,

	status_ignition : status_ignition, // Should be in CAS module
	status_module   : status_module,
};
