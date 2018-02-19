/* global pi_gpio: true */

// Only load if configured as Raspberry Pi
if (config.gpio.enable === true && process.arch === 'arm') {
	pi_gpio = require('onoff');
}

// Refresh/update GPIO values
function get() {
	if (config.gpio.enable !== true || process.arch !== 'arm') return;

	for (let relay = 0; relay < 1; relay++) {
		// Get the current state
		let state = gpio.relay['relay_' + relay].readSync();
		// Remember: values are backwards, so 0 = on, 1 = off
		update.status('gpio.relay_' + relay, (state === 0));
	}
}

// Set relay to a specific value
function set(relay, state) {
	if (config.gpio.enable !== true || process.arch !== 'arm') return;

	// Handle relay name
	switch (relay) {
		case 'amp' :
		case 0     : relay = 0; break;

		case 'fan' :
		case 1     :
		default    : relay = 1;
	}

	// Handle relay state - the actual required values are backwards
	switch (state) {
		case 'on' :
		case 1    :
		case true : state = 0; break;

		case 'off' :
		case 0     :
		case false :
		default    : state = 1;
	}

	gpio.relay['relay_' + relay].writeSync(state);

	update.status('gpio.relay_' + relay, (state === 0));
}

// Toggle relay to opposite of current value
function toggle(relay) {
	if (config.gpio.enable !== true || process.arch !== 'arm') return;

	// Handle relay name
	switch (relay) {
		case 'amp' :
		case 0     : relay = 0; break;

		case 'fan' :
		case 1     :
		default    : relay = 1;
	}

	// Calculate the opposite of the current state
	let state = Math.abs(gpio.relay['relay_' + relay].readSync() - 1);

	gpio.relay['relay_' + relay].writeSync(state);

	update.status('gpio.relay_' + relay, (state === 0));
}


function init(init_cb = null) {
	if (config.gpio.enable !== true || process.arch != 'arm') {
		typeof init_cb === 'function' && process.nextTick(init_cb);
		init_cb = undefined;
		return false;
	}

	gpio.relay.relay_0 = new pi_gpio.Gpio(config.gpio.pins.relay_0, 'high');
	gpio.relay.relay_1 = new pi_gpio.Gpio(config.gpio.pins.relay_1, 'high');

	log.msg('Initialized');

	// Turn off relays
	for (let i = 0; i < 1; i++) set(i, false);

	typeof init_cb === 'function' && process.nextTick(init_cb);
	init_cb = undefined;
}

function term(term_cb = null) {
	if (config.gpio.enable !== true || process.arch != 'arm') {
		typeof term_cb === 'function' && process.nextTick(term_cb);
		term_cb = undefined;
		return false;
	}

	// Turn off relays
	for (let i = 0; i < 1; i++) set(i, false);

	log.msg('Terminated');

	typeof term_cb === 'function' && process.nextTick(term_cb);
	term_cb = undefined;
}


function init_listeners() {
	// Toggle GPIO outputs on IKE ignition events
	IKE.on('ignition-powerup', () => {
		set('fan', true);
	});

	IKE.on('ignition-poweroff', () => {
		// Run fan for additional 60s after poweroff
		setTimeout(() => {
			if (status.vehicle.ignition_level === 0) gpio.set('fan', false);
		}, 60000);
	});

	// Enable fan GPIO relay on GM keyfob unlock event
	GM.on('keyfob', (keyfob) => {
		switch (keyfob.button) {
			case 'unlock' : {
				gpio.set('fan', true); // Enable fan relay

				// 5 minutes after fan enable,
				// turn fan back off if ignition is off
				setTimeout(() => {
					if (status.vehicle.ignition_level === 0) gpio.set('fan', false);
				}, 300000);
			}
		}
	});
}


module.exports = {
	// Might switch this to an array
	relay : {
		relay_0 : null,
		relay_1 : null,
	},

	// Functions
	get    : get,
	init   : init,
	set    : set,
	term   : term,
	toggle : toggle,

	init_listeners : init_listeners,
};
