var module_name = __filename.slice(__dirname.length + 1, -3);

// Only pull in libraries if hdmi is enabled
if (config.media.hdmi === true) {
	var nodecec = require('node-cec');
	var NodeCec = nodecec.NodeCec;
	var CEC     = nodecec.CEC;
	var cec     = new NodeCec('node-bmw');

	// 0xF0 = Samsung

	cec.on('REPORT_POWER_STATUS', (packet, power_status) => {
		var keys = Object.keys(CEC.PowerStatus);

		for (var i = keys.length - 1; i >= 0; i--) {
			if (CEC.PowerStatus[keys[i]] === power_status) {
				log.msg({ src : module_name, msg : 'Power status: \''+keys[i]+'\'' });

				status.hdmi.power_status = keys[i];
				break;
			}
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
	// Start cec-client and populate connection var
	startup : (callback) => {
		status.hdmi.client_ready = false;

		if (config.media.hdmi !== true) {
			if (typeof callback === 'function') { callback(); }
			return;
		}

		cec.start('cec-client', '-t', 't');
		cec.once('ready', (client) => {
			log.msg({ src : module_name, msg : 'Started' });
			status.hdmi.client_ready = true;

			// Populate global HDMI CEC client object
			hdmi_client = client;

			// Get status
			setTimeout(() => {
				HDMI.command('powerstatus');
			}, 3000);

			// Holla back
			callback();
		});
	},

	shutdown : (callback) => {
		if (config.media.hdmi !== true) {
			if (typeof callback === 'function') { callback(); }
			return;
		}

		// Shutdown and kill cec-client process
		if (status.hdmi.client_ready === true) {
			log.msg({
				src : 'HDMI',
				msg : 'Stopping cec-client process',
			});

			// Reset status variables
			status.hdmi.client_ready  = false;
			status.hdmi.physical_addr = null;
			status.hdmi.power_status  = null;

			// Register listener to wait for stop event
			cec.on('stop', () => {
				log.msg({
					src : 'HDMI',
					msg : 'Stopped',
				});

				if (typeof callback === 'function') { callback(); }
			});

			// Call for stop
			cec.stop();
		}
		else {
			log.msg({
				src : 'HDMI',
				msg : 'cec-client process not running',
			});

			// F**king reset them anyway
			status.hdmi.client_ready  = false;
			status.hdmi.physical_addr = null;
			status.hdmi.power_status  = null;
			if (typeof callback === 'function') { callback(); }
		}
	},

	// Send commands over HDMI CEC to control attached display
	command : (action) => {
		if (config.media.hdmi === true && hdmi_client !== null && status.hdmi.client_ready === true) {
			switch (action) {
				case 'powerstatus':
					log.msg({
						src : 'HDMI',
						msg : 'Requesting power status',
					});

					hdmi_client.sendCommand(0xF0, CEC.Opcode.GIVE_DEVICE_POWER_STATUS);
					break;

				case 'poweron':
					log.msg({
						src : 'HDMI',
						msg : 'Sending power on',
					});

					hdmi_client.sendCommand(0xF0, CEC.Opcode.IMAGE_VIEW_ON);
					// Get status
					setTimeout(() => {
						HDMI.command('powerstatus');
					}, 5000);
					break;

				case 'poweroff':
					log.msg({
						src : 'HDMI',
						msg : 'Sending power off',
					});

					hdmi_client.sendCommand(0xF0, CEC.Opcode.STANDBY);
					// Get status
					setTimeout(() => {
						HDMI.command('powerstatus');
					}, 5000);
			}
		}
	},
};
