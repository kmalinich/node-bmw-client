// Refresh/update GPIO values
function get() {
	if (config.gpio.enable !== true || process.arch !== 'arm') return;

	for (let relay = 0; relay < 1; relay++) {
		// Get the current state
		let state = gpio.relay['relay_' + relay].readSync();
		update.status('gpio.relay_' + relay, (state === 1));
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

	// Handle relay state
	switch (state) {
		case 'on' :
		case 1    :
		case true : state = 1; break;

		case 'off' :
		case 0     :
		case false :
		default    : state = 0;
	}

	gpio.relay['relay_' + relay].writeSync(state);

	update.status('gpio.relay_' + relay, (state === 1));
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

	update.status('gpio.relay_' + relay, (state === 1));
}


function init(init_cb = null) {
	if (config.gpio.enable !== true || process.arch !== 'arm') {
		typeof init_cb === 'function' && process.nextTick(init_cb);
		init_cb = undefined;
		return false;
	}

	// Only load if configured as Raspberry Pi
	const pi_gpio = require('onoff').Gpio;

	let options = {
		direction : 'high',
		edge      : 'none',
		options   : {
			activeLow : true,
		},
	};

	gpio.relay.relay_0 = new pi_gpio(config.gpio.pins.relay_0, options.direction, options.options);
	gpio.relay.relay_1 = new pi_gpio(config.gpio.pins.relay_1, options.direction, options.options);

	log.msg('Initialized');

	// Turn off relays
	for (let i = 0; i < 2; i++) set(i, false);

	typeof init_cb === 'function' && process.nextTick(init_cb);
	init_cb = undefined;
}

function term(term_cb = null) {
	if (config.gpio.enable !== true || process.arch !== 'arm') {
		typeof term_cb === 'function' && process.nextTick(term_cb);
		term_cb = undefined;
		return false;
	}

	// Turn off relays
	for (let i = 0; i < 2; i++) set(i, false);

	log.msg('Terminated');

	typeof term_cb === 'function' && process.nextTick(term_cb);
	term_cb = undefined;
}


function init_listeners() {
	// Toggle GPIO outputs on power module events
	update.on('status.power.active', (data) => {
		switch (data.new) {
			case false : {
				// Run fan for additional 60s after poweroff
				setTimeout(() => {
					if (status.vehicle.ignition_level === 0) gpio.set('fan', false);
				}, config.gpio.timeout.fan.poweroff);
			}
		}
	});

	update.on('status.system.temperature', (data) => {
		// Bounce if system power isn't active
		if (status.power.active !== true) return;

		// Enable fan if CPU temperature is over configured limit
		set('fan', (data.new >= config.system.temperature.fan_enable));
	});

	// Enable fan GPIO relay on GM keyfob unlock event
	GM.on('keyfob', (keyfob) => {
		switch (keyfob.button) {
			case 'unlock' : {
				if (status.vehicle.ignition_level !== 0) return;

				gpio.set('fan', true); // Enable fan relay

				// 5 minutes after fan enable, turn fan back off if ignition is off
				setTimeout(() => {
					if (status.vehicle.ignition_level === 0) gpio.set('fan', false);
				}, config.gpio.timeout.fan.unlock);
			}
		}
	});

	log.msg('Initialized listeners');
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
