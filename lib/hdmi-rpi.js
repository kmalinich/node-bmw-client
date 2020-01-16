// Send commands with rpi_hdmi to control attached display
function command(action = 'off') {
	// Bounce if not configured
	if (config.media.hdmi.rpi.enable !== true) return;

	switch (action) {
		case 'status' : {
			log.lib('Requesting power status');
			hdmi_rpi.hdmi_client.status();
			break;
		}

		case true :
		case 'on' : {
			log.lib('Sending power on');

			// Remove manual power override
			update.status('hdmi.rpi.power_override', false);

			hdmi_rpi.hdmi_client.power(true);
			break;
		}

		case false :
		case 'off' : {
			log.lib('Sending power off');

			// Remove manual power override
			update.status('hdmi.rpi.power_override', false);

			hdmi_rpi.hdmi_client.power(false);
			break;
		}

		case 'toggle' : {
			log.lib('Toggling power');
			hdmi_rpi.hdmi_client.power(!status.hdmi.rpi.power);
		}
	}
}

// Configure event listeners
async function init_listeners() {
	// Error handling
	hdmi_rpi.hdmi_client.on('error', data => {
		log.error('event: error :: ' + JSON.stringify(data));
	});


	// Event handling
	hdmi_rpi.hdmi_client.on('command', data => {
		log.lib('event: command :: ' + JSON.stringify(data));
	});

	hdmi_rpi.hdmi_client.on('status', data => {
		log.lib('event: status');

		switch (data.command.type) {
			case 'tv' : {
				update.status('hdmi.rpi.group',       data.status.group);
				update.status('hdmi.rpi.mode',        data.status.mode);
				update.status('hdmi.rpi.progressive', data.status.progressive);
				update.status('hdmi.rpi.ratio',       data.status.ratio);
				update.status('hdmi.rpi.refreshrate', data.status.refreshrate);
				update.status('hdmi.rpi.resolution',  data.status.resolution);
				update.status('hdmi.rpi.state',       data.status.state);

				break;
			}

			case 'vc' : {
				update.status('hdmi.rpi.power', data.status.power);
				break;
			}

			case 'vt' : {
				update.status('hdmi.rpi.tty', data.status.tty);
			}
		}
	});


	// Turn on and off based on power library events
	power.on('active', command);

	log.lib('Initialized listeners');
} // async init_listeners()


// Check power status vs. ignition status to ensure the screen is not on when it shouldn't be
function check() {
	let correct_power_state;
	switch (status.vehicle.ignition) {
		case 'off' : correct_power_state = false; break;
		default    : correct_power_state = true;
	}

	switch (correct_power_state) {
		case false : {
			switch (status.hdmi.rpi.power) {
				case false : {
					// log.lib('Power state correct, no action needed');
					return true;
				}

				case true : {
					log.lib('Power state incorrect, attempting to correct');
					hdmi_rpi.hdmi_client.power(correct_power_state);
					return false;
				}
			}

			break;
		}

		case true : {
			switch (status.hdmi.rpi.power) {
				case false : {
					// Only power on if power_override is false
					switch (status.hdmi.rpi.power_override) {
						case false : {
							log.lib('Power state incorrect, attempting to correct');
							hdmi_rpi.hdmi_client.power(correct_power_state);
							return false;
						}

						case true : {
							log.lib('Power state incorrect, but currently overridden');
							return false;
						}
					}

					break;
				}

				case true : {
					// log.lib('Power state correct, no action needed');
					return true;
				}
			}
		}
	}
}

// Periodically perform check() function
function check_process() {
	if (hdmi_rpi.timeout.check === null) {
		log.lib('Set check timeout (' + config.media.hdmi.rpi.check_interval + ' seconds)');
	}

	check();

	hdmi_rpi.timeout.check = setTimeout(check_process, (config.media.hdmi.rpi.check_interval * 1000));
}


// Start cec-client, populate connection var
async function init() {
	if (config.media.hdmi.rpi.enable !== true) return;

	// Only pull in libraries if hdmi is enabled
	hdmi_rpi.hdmi_client = new (require('rpi-hdmi'))();

	log.lib('Initialized');

	await init_listeners();

	// Get status
	setTimeout(() => { command('status'); }, 500);

	check_process();
} // async init()

// Reset variables and exit
async function term() {
	if (config.media.hdmi.rpi.enable !== true) return;

	// Reset status variables
	update.status('hdmi.rpi.power',  null);

	log.lib('Terminated');
} // async term()


module.exports = {
	timeout : {
		check : null,
	},

	hdmi_client : null,

	command,

	init,
	init_listeners,

	term,
};
