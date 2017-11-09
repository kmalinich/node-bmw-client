/* global pi_gpio: true */

// Only load if configured as Raspberry Pi
if (config.gpio.enable === true && process.arch == 'arm') {
	pi_gpio = require('onoff');
}

function toggle(relay) {
	if (config.gpio.enable !== true || process.arch != 'arm') return;

	let new_value;
	switch (relay) {
		case 1:
			new_value = Math.abs(gpio.relay.relay_1.digitalRead() - 1);
			gpio.relay.relay_1.writeSync(new_value);
			break;
		case 2:
			new_value = Math.abs(gpio.relay.relay_2.digitalRead() - 1);
			gpio.relay.relay_2.writeSync(new_value);
			break;
	}

	update.status('gpio.relay_' + relay, new_value);
}

function set(relay, value) {
	if (config.gpio.enable !== true || process.arch != 'arm') return;

	switch (relay) {
		case 1:
			gpio.relay.relay_1.writeSync(value);
			break;
		case 2:
			gpio.relay.relay_2.writeSync(value);
			break;
	}

	update.status('gpio.relay_' + relay, value);
}

function init(init_cb = null) {
	if (config.gpio.enable !== true || process.arch != 'arm') {
		typeof init_cb === 'function' && process.nextTick(init_cb);
		init_cb = undefined;
		return false;
	}

	gpio.relay.relay_1 = new pi_gpio.Gpio(config.gpio.pins.relay_1, 'high');
	gpio.relay.relay_2 = new pi_gpio.Gpio(config.gpio.pins.relay_2, 'high');
	// gpio.relay.relay_1.setActiveLow(true);
	// gpio.relay.relay_2.setActiveLow(true);

	log.msg({ msg : 'Initialized' });

	typeof init_cb === 'function' && process.nextTick(init_cb);
	init_cb = undefined;
}

function term(term_cb = null) {
	if (config.gpio.enable !== true || process.arch != 'arm') {
		typeof term_cb === 'function' && process.nextTick(term_cb);
		term_cb = undefined;
		return false;
	}

	// Turn off the relays on exit
	set(0, 1);
	set(1, 1);

	log.msg({ msg : 'Terminated' });

	typeof term_cb === 'function' && process.nextTick(term_cb);
	term_cb = undefined;
}


// Toggle GPIO outputs on IKE ignition events
IKE.on('ignition-powerup', () => {
	set(1, 0);
	set(2, 0);
});

IKE.on('ignition-poweroff', () => {
	set(1, 1);

	// Run fan for additional 60s after poweroff
	setTimeout(() => {
		if (status.vehicle.ignition_level === 0) gpio.set(2, 1);
	}, 60000);
});

// Enable fan GPIO relay on GM keyfob unlock event
GM.on('keyfob', (keyfob) => {
	switch (keyfob.button) {
		case 'unlock' : {
			gpio.set(2, 0); // Enable fan relay

			// 5 minutes after fan enable,
			// turn fan back off if ignition is off
			setTimeout(() => {
				if (status.vehicle.ignition_level === 0) gpio.set(2, 1);
			}, 300000);
		}
	}
});


module.exports = {
	// Might switch these two to arrays
	relay : {
		relay_1 : null,
		relay_2 : null,
	},

	state : {
		relay_1 : 0,
		relay_2 : 0,
	},

	// Functions
	init   : init,
	set    : set,
	term   : term,
	toggle : toggle,
};
