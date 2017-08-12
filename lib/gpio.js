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
			new_value = Math.abs(gpio.relay.relay_1.digitalRead()-1);
			gpio.relay.relay_1.writeSync(new_value);
			break;
		case 2:
			new_value = Math.abs(gpio.relay.relay_2.digitalRead()-1);
			gpio.relay.relay_2.writeSync(new_value);
			break;
	}

	log.msg({ msg : 'Set GPIO '+relay+': '+new_value });
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

	log.msg({ msg : 'Set GPIO '+relay+': '+value });
}

function init(init_callback = null) {
	if (config.gpio.enable !== true || process.arch != 'arm') {
		if (typeof init_callback === 'function') init_callback();
		init_callback = undefined;
		return false;
	}

	gpio.relay.relay_1 = new pi_gpio.Gpio(config.gpio.pins.relay_1, 'high');
	gpio.relay.relay_2 = new pi_gpio.Gpio(config.gpio.pins.relay_2, 'high');
	// gpio.relay.relay_1.setActiveLow(true);
	// gpio.relay.relay_2.setActiveLow(true);

	log.msg({ msg : 'Initialized' });

	if (typeof init_callback === 'function') init_callback();
	init_callback = undefined;
	return;
}

function term(term_callback = null) {
	if (config.gpio.enable !== true || process.arch != 'arm') {
		if (typeof term_callback === 'function') term_callback();
		term_callback = undefined;
		return false;
	}

	// Turn off the relays on exit
	set(1, 1);
	set(1, 1);

	log.msg({ msg : 'Terminated' });

	if (typeof term_callback === 'function') term_callback();
	term_callback = undefined;
	return;
}


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
	init   : (init_cb)      => { init(init_cb);     },
	term   : (term_cb)      => { term(term_cb);     },
	set    : (relay, value) => { set(relay, value); },
	toggle : (relay)        => { toggle(relay);     },
};
