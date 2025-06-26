function video_source(source = 'default') {
	// Controlled by cmd_data.msg1[4], set to normal video output by default
	const cmd_data = {
		id   : 0x6F1,
		msg0 : [ 0x63, 0x10, 0x0B, 0x31, 0x01, 0xA0, 0x1C, 0x00 ],
		msg1 : [ 0x63, 0x21, 0x00, 0x00, 0x01, 0x00, 0x01, 0xFF ],
	};

	// Support toggling video input
	switch (source) {
		case 'toggle' : {
			log.module('Toggling video input');

			// Pick target video source based on current video source (for toggling)
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
} // video_source(source)

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
} // reverse_camera(gear)


// Used for iDrive knob rotational initialization
function decode_init_con(data) {
	// Bounce if not enabled
	if (config.emulate.nbt !== true && config.retrofit.nbt !== true) return data;

	data.command = 'con';
	data.value   = 'NBT init iDrive knob';

	// log.module('NBT status message ' + Buffer.from(data.msg));

	return data;
} // decode_init_con(data)

// Initialize CON rotation counter
function encode_init_con(action = false) {
	// Bounce if not enabled
	if (config.emulate.nbt !== true && config.retrofit.con !== true) return;

	// Handle setting/unsetting timeout
	switch (action) {
		case false : {
			if (NBT.timeout.encode_init_con !== null) {
				clearTimeout(NBT.timeout.encode_init_con);
				NBT.timeout.encode_init_con = null;

				log.module('Unset CON rotation init timeout');
			}

			// Return here since we're not re-sending again
			return;
		}

		case true : {
			NBT.timeout.encode_init_con = setTimeout(() => {
				encode_init_con(true);
			}, 10000);

			if (NBT.timeout.encode_init_con === null) log.module('Set CON rotation init timeout');
		}
	}

	const msg = {
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
			log.error('config.nbt.mode must be set to one of CIC or NBT');
			return;
		}
	}

	// Convert data array to Buffer
	msg.data = Buffer.from(msg.data);

	// Send message
	bus.data.send(msg);
} //  encode_init_con(action)


function init_listeners() {
	// Bounce if not enabled
	if (config.emulate.nbt !== true && config.retrofit.nbt !== true) return;

	// Perform commands on EGS gear changes
	EGS.on('gear', reverse_camera);

	// Perform commands on power lib active event
	power.on('active', data => {
		encode_init_con(data.new);
	});

	log.module('Initialized listeners');
} // init_listeners()


// Parse data sent to module
function parse_in(data) {
	// Bounce if emulation isn't enabled
	if (config.emulate.nbt !== true) return data;

	return data;
} // parse_in(data)

// Parse data sent from module
function parse_out(data) {
	// Bounce if not enabled
	if (config.emulate.nbt !== true && config.retrofit.nbt !== true) return data;

	switch (data.src.id) {
		case 0x273 :
		case 0x563 : return decode_init_con(data);

		// TODO: I think this should be parsed in CON.js
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
	}

	return data;
} // parse_out(data)


export default {
	timeout : {
		encode_init_con : null,
	},

	// Functions
	init_listeners,

	video_source,

	parse_in,
	parse_out,
};
