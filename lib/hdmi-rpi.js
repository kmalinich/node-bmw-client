// Send commands with rpi_hdmi to control attached display
function command(action) {
	// Bounce if not configured
	if (config.media.hdmi.rpi.enable !== true) return;

	switch (action) {
		case 'powerstatus' : {
			log.msg({ msg : 'Requesting power status' });
			hdmi_rpi.hdmi_client.status();
			break;
		}

		case 'poweron' : {
			log.msg({ msg : 'Sending power on' });
			hdmi_rpi.hdmi_client.power(true);
			break;
		}

		case 'poweroff' : {
			log.msg({ msg : 'Sending power off' });
			hdmi_rpi.hdmi_client.power(false);
			break;
		}

		case 'powertoggle' : {
			log.msg({ msg : 'Toggling power' });
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
				update.status('hdmi.rpi.power',       data.status.power);
				update.status('hdmi.rpi.progressive', data.status.progressive);
				update.status('hdmi.rpi.ratio',       data.status.ratio);
				update.status('hdmi.rpi.refreshrate', data.status.refreshrate);
				update.status('hdmi.rpi.resolution',  data.status.resolution);
				update.status('hdmi.rpi.state',       data.status.state);

				break;
			}

			case 'vt' : {
				update.status('hdmi.rpi.tty', data.status.tty);
			}
		}
	});


	// Turn on and off with ignition
	IKE.on('ignition-poweroff', () => { command('poweroff'); });
	IKE.on('ignition-powerup',  () => { command('poweron');  });

	log.msg({ msg : 'Initialized listeners' });
}


// Check power status vs. ignition status to ensure the screen is not on when it shouldn't be
function check() {
	let correct_power_state;
	switch (status.vehicle.ignition) {
		case 'off' : correct_power_state = false; break;
		default    : correct_power_state = true;
	}

	if (status.hdmi.rpi.power === correct_power_state) {
		log.msg('Power state correct, no action needed');
		return true;
	}

	log.msg('Power state incorrect, attempting to correct');
	hdmi_rpi.hdmi_client.power(correct_power_state);
}

// Periodically perform check() function
function check_process() {
	if (hdmi_rpi.timeouts.check === null) {
		log.msg('Set check timeout (' + config.media.hdmi.rpi.check_interval + 'ms)');
	}

	check();

	hdmi_rpi.timeouts.check = setTimeout(check_process, config.media.hdmi.rpi.check_interval);
}


// Start cec-client, populate connection var
function init(init_cb) {
	if (config.media.hdmi.rpi.enable !== true) {
		process.nextTick(init_cb);
		return;
	}

	// Only pull in libraries if hdmi is enabled
	hdmi_rpi.hdmi_client = new (require('rpi-hdmi'))();

	log.msg({ msg : 'Initialized' });

	init_listeners();

	// Get status
	setTimeout(() => {
		command('powerstatus');
	}, 500);

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
	update.status('hdmi.power_status',  null);

	log.msg({ msg : 'Terminated' });
	process.nextTick(term_cb);
	term_cb = undefined;
}


module.exports = {
	timeouts : {
		check : null,
	},

	hdmi_client : null,

	command : command,

	init_listeners : init_listeners,

	init : init,
	term : term,
};
