var module_name = __filename.slice(__dirname.length + 1, -3);

// Only pull in libraries if hdmi is enabled
if (config.media.hdmi.enable === true) {
	var nodecec = require('node-cec');
	var NodeCec = nodecec.NodeCec;
	var CEC     = nodecec.CEC;
	var cec     = new NodeCec('node-bmw');

	cec.on('REPORT_POWER_STATUS', (packet, power_status) => {
		var keys = Object.keys(CEC.PowerStatus);

		for (var i = keys.length - 1; i >= 0; i--) {
			if (CEC.PowerStatus[keys[i]] !== power_status) continue;

			log.msg({ src : module_name, msg : 'Power status: \''+keys[i]+'\'' });

			status.hdmi.power_status = keys[i];
			break;
		}
	});

	// Error handling
	cec.on('error', () => {
		log.msg({ src : module_name, msg : 'Error' });
	});

	// Event handling
	cec.on('REPORT_PHYSICAL_ADDRESS', (packet, address) => {
		log.msg({ src : module_name, msg : 'Physical address: \''+address+'\'' });
		status.hdmi.physical_addr = address;
	});

	cec.on('ROUTING_CHANGE', (packet, fromSource, toSource) => {
		log.msg({ src : module_name, msg : 'Routing change: \''+fromSource+'\' => \''+toSource+'\'' });
	});

	cec.on('ACTIVE_SOURCE', (packet, source) => {
		log.msg({ src : module_name, msg : 'Active source: \''+source+'\'' });
	});

	cec.on('SET_OSD_NAME', (packet, osdname) => {
		log.msg({ src : module_name, msg : 'Set OSD name: \''+osdname+'\'' });
	});

	cec.on('POLLING', (packet) => {
		log.msg({ src : module_name, msg : 'Polling' });
	});
}

module.exports = {
	hdmi_client : null,

	// Start cec-client and populate connection var
	init : (init_callback) => {
		status.hdmi.client_ready = false;

		if (config.media.hdmi.enable !== true) {
			if (typeof init_callback === 'function') init_callback();
			init_callback = undefined;
			return;
		}

		cec.start('cec-client', '-t', 't');
		cec.once('ready', (client) => {
			log.msg({ src : module_name, msg : 'Started' });
			status.hdmi.client_ready = true;

			// Populate global HDMI CEC client object
			HDMI.hdmi_client = client;

			// Get status
			setTimeout(() => {
				HDMI.command('powerstatus');
			}, 3000);

			// Holla back
			if (typeof init_callback === 'function') init_callback();
			init_callback = undefined;
		});
	},

	term : (term_callback) => {
		if (config.media.hdmi.enable !== true) {
			if (typeof term_callback === 'function') term_callback();
			term_callback = undefined;
			return;
		}

		// Shutdown and kill cec-client process
		if (status.hdmi.client_ready === true) {
			log.msg({
				src : module_name,
				msg : 'Stopping cec-client process',
			});

			// Reset status variables
			status.hdmi.client_ready  = false;
			status.hdmi.physical_addr = null;
			status.hdmi.power_status  = null;

			// Register listener to wait for stop event
			cec.on('stop', () => {
				log.msg({
					src : module_name,
					msg : 'Stopped',
				});

				if (typeof term_callback === 'function') term_callback();
				term_callback = undefined;
			});

			// Call for stop
			cec.stop();
		}
		else {
			log.msg({
				src : module_name,
				msg : 'cec-client process not running',
			});

			// F**king reset them anyway
			status.hdmi.client_ready  = false;
			status.hdmi.physical_addr = null;
			status.hdmi.power_status  = null;

			if (typeof term_callback === 'function') term_callback();
			term_callback = undefined;
		}
	},

	// Send commands over HDMI CEC to control attached display
	command : (action) => {
		// Bounce if not configured or not ready
		if (config.media.hdmi.enable !== true || HDMI.hdmi_client === null || status.hdmi.client_ready !== true) {
			return;
		}

		switch (action) {
			case 'powerstatus':
				log.msg({
					src : module_name,
					msg : 'Requesting power status',
				});

				var command = {
					check  : false,
					opcode : CEC.Opcode.GIVE_DEVICE_POWER_STATUS,
				};
				break;

			case 'poweron':
				log.msg({
					src : module_name,
					msg : 'Sending power on',
				});

				var command = {
					check  : true,
					opcode : CEC.Opcode.IMAGE_VIEW_ON,
				};
				break;

			case 'poweroff':
				log.msg({
					src : module_name,
					msg : 'Sending power off',
				});

				var command = {
					check  : true,
					opcode : CEC.Opcode.STANDBY,
				};
				break;
		}

		// Send desired command opcode
		HDMI.hdmi_client.sendCommand(config.media.hdmi.manufacturer, command.opcode);

		// Get status if need be
		if (command.check === true) {
			setTimeout(() => {
				HDMI.command('powerstatus');
			}, 5000);
		}
	},
};
