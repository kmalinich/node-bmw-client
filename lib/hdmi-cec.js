// Scope variables
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
			log.lib('Requesting power status');

			command_obj = {
				check  : false,
				opcode : nodecec.types.opcodes.give_device_power_status,
			};
			break;

		case 'on':
			// Only power on if it's not already on
			if (override === false && status.hdmi.cec.power_status === 'ON') return;

			// Note that we've powered it on
			hdmi_cec.powered_on_once = true;

			log.lib('Sending power on');

			command_obj = {
				check  : true,
				opcode : nodecec.types.opcodes.image_view_on,
			};
			break;

		case 'off':
			// Only power off if it's not already off
			if (override === false && status.hdmi.cec.power_status === 'STANDBY') return;

			log.lib('Sending power off');

			command_obj = {
				check  : true,
				opcode : nodecec.types.opcodes.standby,
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
	if (config.media.hdmi.cec.enable !== true) return;

	// Error handling
	cec.on('error', log.error);

	// Event handling
	cec.on('REPORT_PHYSICAL_ADDRESS', (packet, address) => {
		update.status('hdmi.cec.physical_addr', address);
	});

	cec.on('ROUTING_CHANGE', (packet, fromSource, toSource) => {
		log.lib('Routing change: \'' + fromSource + '\' => \'' + toSource + '\'');
	});

	cec.on('ACTIVE_SOURCE', (packet, source) => {
		log.lib('Active source: \'' + source + '\'');
	});

	cec.on('SET_OSD_NAME', (packet, osdname) => {
		log.lib('Set OSD name: \'' + osdname + '\'');
	});

	cec.on('POLLING', () => {
		log.lib('Polling');
	});

	cec.on('REPORT_POWER_STATUS', (packet, power_status) => {
		for (const powerStatusKey in nodecec.types.power_status) {
			if (nodecec.types.power_status[powerStatusKey] !== power_status) continue;
			update.status('hdmi.cec.power_status', powerStatusKey);
		}
	});

	// Power on/off IKE ignition events
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

	power.on('active', power_state => {
		switch (power_state) {
			case false : {
				setTimeout(() => {
					command('off', true);
				}, config.media.hdmi.cec.poweroff_delay);

				break;
			}
		}
	});

	log.lib('Initialized');
}


// Start cec-client, populate connection var
async function init() {
	update.status('hdmi.cec.client_ready', false);

	if (config.media.hdmi.cec.enable !== true) return;

	// Only pull in libraries if hdmi is enabled
	nodecec = require('node-cec');
	NodeCec = nodecec.NodeCec;
	cec     = new NodeCec(config.media.hdmi.cec.osd_string);

	cec.once('ready', client => {
		log.lib('Initialized');
		update.status('hdmi.cec.client_ready', true);

		// Populate global hdmi CEC client object
		hdmi_cec.hdmi_client = client;

		// Get status
		setTimeout(() => { command('status'); }, 3000);
	});

	await cec.start('cec-client', '-t', 't');
} // async init()

// Stop cec-client, clear connection var
async function term() {
	if (config.media.hdmi.cec.enable !== true) return;

	// Shutdown and kill cec-client process
	if (status.hdmi.cec.client_ready === true) {
		log.lib('Stopping cec-client process');

		// Reset status variables
		update.status('hdmi.cec.client_ready',  false);
		update.status('hdmi.cec.physical_addr', null);
		update.status('hdmi.cec.power_status',  null);

		// Register listener to wait for stop event
		cec.on('stop', () => {
			log.lib('Terminated');
		});

		// Call for stop
		await cec.stop();

		return;
	}

	log.lib('cec-client process not running');

	// F**king reset them anyway
	update.status('hdmi.cec.client_ready',  false);
	update.status('hdmi.cec.physical_addr', null);
	update.status('hdmi.cec.power_status',  null);
} // async term()


module.exports = {
	powered_on_once : false,

	hdmi_client : null,

	command,

	init,
	init_listeners,
	term,
};
