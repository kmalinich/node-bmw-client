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
			// Only power on if it's not already on
			if (status.hdmi.rpi.power === true) return;

			log.msg({ msg : 'Sending power on' });

			hdmi_rpi.hdmi_client.power(true);
			break;
		}

		case 'poweroff' : {
			// Only power off if it's not already off
			if (status.hdmi.rpi.power === false) return;

			log.msg({ msg : 'Sending power off' });

			hdmi_rpi.hdmi_client.power(false);
		}
	}
}

// Configure event listeners
function init_listeners() {
	// Error handling
	hdmi_rpi.hdmi_client.on('error', (data) => {
		log.msg('event: error');
		log.msg(JSON.stringify(data));
	});


	// Event handling
	hdmi_rpi.hdmi_client.on('command', (data) => {
		log.msg('event: command');
		log.msg(JSON.stringify(data));
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
	}, 3000);

	// Holla back
	process.nextTick(init_cb);
}

// Stop cec-client, clear connection var
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
	hdmi_client : null,

	command : command,

	init_listeners : init_listeners,

	init : init,
	term : term,
};
