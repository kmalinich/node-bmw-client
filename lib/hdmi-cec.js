// Scope variables
let CEC;
let NodeCec;
let cec;
let nodecec;

// Send commands over hdmi CEC to control attached display
function command(action, override = false) {
	// Bounce if not configured or not ready
	if (config.media.hdmi.cec.enable !== true || hdmi_cec.hdmi_client === null || status.hdmi.cec.client_ready !== true) {
		return;
	}

	let command_obj;

	switch (action) {
		case 'status':
			log.msg('Requesting power status');

			command_obj = {
				check  : false,
				opcode : CEC.Opcode.GIVE_DEVICE_POWER_STATUS,
			};
			break;

		case 'on':
			// Only power on if it's not already on
			if (override === false && status.hdmi.cec.power_status === 'ON') return;

			// Note that we've powered it on
			hdmi_cec.powered_on_once = true;

			log.msg('Sending power on');

			command_obj = {
				check  : true,
				opcode : CEC.Opcode.IMAGE_VIEW_ON,
			};
			break;

		case 'off':
			// Only power off if it's not already off
			if (override === false && status.hdmi.cec.power_status === 'STANDBY') return;

			log.msg('Sending power off');

			command_obj = {
				check  : true,
				opcode : CEC.Opcode.STANDBY,
			};
			break;

		case 'off-if-on-once':
			// Only power off if we've powered it on once already
			if (hdmi_cec.powered_on_once !== true) return;
			command('off', true);
	}

	// Send desired command opcode
	if (typeof command_obj !== 'undefined') {
		if (typeof command_obj.opcode !== 'undefined') {
			hdmi_cec.hdmi_client.sendCommand(config.media.hdmi.cec.manufacturer, command_obj.opcode);
		}

		// Get status if need be
		if (typeof command_obj.check !== 'undefined') {
			if (command_obj.check === true) {
				setTimeout(() => {
					command('status');
				}, 5000);
			}
		}
	}
}

// Configure event listeners
function init_listeners() {
	// Error handling
	cec.on('error', () => {
		log.msg('Error');
	});

	// Event handling
	cec.on('REPORT_PHYSICAL_ADDRESS', (packet, address) => {
		update.status('hdmi.cec.physical_addr', address);
	});

	cec.on('ROUTING_CHANGE', (packet, fromSource, toSource) => {
		log.msg('Routing change: \'' + fromSource + '\' => \'' + toSource + '\'');
	});

	cec.on('ACTIVE_SOURCE', (packet, source) => {
		log.msg('Active source: \'' + source + '\'');
	});

	cec.on('SET_OSD_NAME', (packet, osdname) => {
		log.msg('Set OSD name: \'' + osdname + '\'');
	});

	cec.on('POLLING', () => {
		log.msg('Polling');
	});

	cec.on('REPORT_POWER_STATUS', (packet, power_status) => {
		let keys = Object.keys(CEC.PowerStatus);

		for (let i = keys.length - 1; i >= 0; i--) {
			if (CEC.PowerStatus[keys[i]] !== power_status) continue;
			update.status('hdmi.cec.power_status', keys[i]);
			break;
		}
	});

	// Start/stop playback and manipulate volume on IKE ignition events
	IKE.on('ignition-run', () => {
		// If the hdmi display is currently on, power it off
		//
		// This helps prepare for engine start during scenarios
		// like at the fuel pump, when the ignition is switched
		// from run to accessory, which ordinarily would leave the screen on
		//
		// That causes an issue if you go back to run from accessory,
		// with the screen still on, since it may damage the screen
		// if it experiences a low-voltage event caused by the starter motor
		command('off-if-on-once');
	});

	IKE.on('engine-running', () => { command('on'); });

	power.on('active', (power_state) => {
		switch (power_state) {
			case false : {
				setTimeout(() => {
					command('off', true);
				}, config.media.hdmi.cec.poweroff_delay);

				break;
			}
		}
	});

	log.msg('Initialized');
}

// Start cec-client, populate connection var
function init(init_cb = null) {
	update.status('hdmi.cec.client_ready', false);

	if (config.media.hdmi.cec.enable !== true) {
		typeof init_cb === 'function' && process.nextTick(init_cb);
		init_cb = undefined;
		return;
	}

	// Only pull in libraries if hdmi is enabled
	nodecec = require('node-cec');
	NodeCec = nodecec.NodeCec;
	CEC     = nodecec.CEC;
	cec     = new NodeCec(config.media.hdmi.cec.osd_string);

	cec.start('cec-client', '-t', 't');

	cec.once('ready', (client) => {
		log.msg('Initialized');
		update.status('hdmi.cec.client_ready', true);

		init_listeners();

		// Populate global hdmi CEC client object
		hdmi_cec.hdmi_client = client;

		// Get status
		setTimeout(() => { command('status'); }, 3000);

		// Holla back
		typeof init_cb === 'function' && process.nextTick(init_cb);
		init_cb = undefined;
	});
}

// Stop cec-client, clear connection var
function term(term_cb = null) {
	if (config.media.hdmi.cec.enable !== true) {
		typeof term_cb === 'function' && process.nextTick(term_cb);
		term_cb = undefined;
		return;
	}

	// Shutdown and kill cec-client process
	if (status.hdmi.cec.client_ready === true) {
		log.msg('Stopping cec-client process');

		// Reset status variables
		update.status('hdmi.cec.client_ready',  false);
		update.status('hdmi.cec.physical_addr', null);
		update.status('hdmi.cec.power_status',  null);

		// Register listener to wait for stop event
		cec.on('stop', () => {
			log.msg('Terminated');
			typeof term_cb === 'function' && process.nextTick(term_cb);
			term_cb = undefined;
		});

		// Call for stop
		cec.stop();
	}
	else {
		log.msg('cec-client process not running');

		// F**king reset them anyway
		update.status('hdmi.cec.client_ready',  false);
		update.status('hdmi.cec.physical_addr', null);
		update.status('hdmi.cec.power_status',  null);

		typeof term_cb === 'function' && process.nextTick(term_cb);
		term_cb = undefined;
	}
}


module.exports = {
	powered_on_once : false,

	hdmi_client : null,

	command : command,

	init           : init,
	init_listeners : init_listeners,
	term           : term,
};
