// Send commands with rpi_hdmi to control attached display
function command(action) {
	// Bounce if not configured
	if (config.media.hdmi.rpi.enable !== true) return;

	switch (action) {
		case 'status' : {
			log.msg('Requesting power status');
			hdmi_rpi.hdmi_client.status();
			break;
		}

		case 'on' : {
			// Bounce if already set to proper status
			if (status.hdmi.rpi.power === true) return hdmi_rpi.hdmi_client.status();

			log.msg('Sending power on');

			// Remove manual power override
			update.status('hdmi.rpi.power_override', false);

			hdmi_rpi.hdmi_client.power(true);
			break;
		}

		case 'off' : {
			// Bounce if already set to proper status
			if (status.hdmi.rpi.power === false) return hdmi_rpi.hdmi_client.status();

			log.msg('Sending power off');

			// Remove manual power override
			update.status('hdmi.rpi.power_override', false);

			hdmi_rpi.hdmi_client.power(false);
			break;
		}

		case 'toggle' : {
			log.msg('Toggling power');
			hdmi_rpi.hdmi_client.power(!status.hdmi.rpi.power);
		}
	}
}

// Configure event listeners
function init_listeners() {
	// Error handling
	hdmi_rpi.hdmi_client.on('error', (data) => {
		log.msg('event: error :: ' + JSON.stringify(data));
	});


	// Event handling
	hdmi_rpi.hdmi_client.on('command', (data) => {
		log.msg('event: command :: ' + JSON.stringify(data));
	});

	hdmi_rpi.hdmi_client.on('status', (data) => {
		log.msg('event: status');

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
				update.status('hdmi.rpi.tty',   data.status.tty);
			}
		}
	});


	// Turn on and off based on power library events
	update.on('status.power.active', (data) => {
		switch (data.new) {
			case false : {
				update.status('hdmi.rpi.power_override', false);

				// Poweroff delay timeout
				setTimeout(() => {
					command('off');
				}, config.media.poweroff_delay);
				break;
			}

			case true : command('on');
		}
	});

	log.msg('Initialized listeners');
}


// Check power status vs. ignition status to ensure the screen is not on when it shouldn't be
function check() {
	let correct_power_state;
	switch (status.vehicle.ignition) {
		case 'off' : correct_power_state = false; break;
		default    : correct_power_state = true;
	}

	switch (correct_power_state) {
		case true : {
			switch (status.hdmi.rpi.power) {
				case true : {
					// log.msg('Power state correct, no action needed');
					return true;
				}

				case false : {
					// Only power on if power_override is false
					switch (status.hdmi.rpi.power_override) {
						case false : {
							log.msg('Power state incorrect, attempting to correct');
							hdmi_rpi.hdmi_client.power(correct_power_state);
							return false;
						}

						case true : {
							log.msg('Power state incorrect, but currently overridden');
							return false;
						}
					}
				}
			}

			break;
		}

		case false : {
			switch (status.hdmi.rpi.power) {
				case false : {
					// log.msg('Power state correct, no action needed');
					return true;
				}

				case true : {
					log.msg('Power state incorrect, attempting to correct');
					hdmi_rpi.hdmi_client.power(correct_power_state);
					return false;
				}
			}
		}
	}
}

// Periodically perform check() function
function check_process() {
	if (hdmi_rpi.timeout.check === null) {
		log.msg('Set check timeout (' + config.media.hdmi.rpi.check_interval + 'ms)');
	}

	check();

	hdmi_rpi.timeout.check = setTimeout(check_process, config.media.hdmi.rpi.check_interval);
}


// Start cec-client, populate connection var
function init(init_cb) {
	if (config.media.hdmi.rpi.enable !== true) {
		process.nextTick(init_cb);
		return;
	}

	// Only pull in libraries if hdmi is enabled
	hdmi_rpi.hdmi_client = new (require('rpi-hdmi'))();

	log.msg('Initialized');

	init_listeners();

	// Get status
	setTimeout(() => { command('status'); }, 500);

	check_process();

	// Holla back
	process.nextTick(init_cb);
}

// Reset variables and exit
function term(term_cb) {
	if (config.media.hdmi.rpi.enable !== true) {
		process.nextTick(term_cb);
		term_cb = undefined;
		return;
	}

	// Reset status variables
	update.status('hdmi.rpi.power',  null);

	log.msg('Terminated');
	process.nextTick(term_cb);
	term_cb = undefined;
}


module.exports = {
	timeout : {
		check : null,
	},

	hdmi_client : null,

	command : command,

	init_listeners : init_listeners,

	init : init,
	term : term,
};
