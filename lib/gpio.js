const time_now = require('performance-now');


// Refresh/update GPIO values
function get() {
	if (config.gpio.enable !== true) return;

	for (let relay = 0; relay < 1; relay++) {
		// Get the current state
		let state = gpio.relay['relay_' + relay].readSync();
		update.status('gpio.relay_' + relay, (state === 1));
	}
}

// Set relay to a specific value
function set(relay, state) {
	if (config.gpio.enable !== true) return;

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

	// Handle fan hysteresis
	switch (relay) {
		case 1 : {
			switch (state) {
				case 0 : {
					let fan_gap = time_now() - gpio.fan_last;

					if (fan_gap < config.gpio.timeout.fan.hysteresis) {
						log.msg('Not disabling fan, hysteresis triggered');
						return;
					}

					break;
				}

				case 1 : gpio.fan_last = time_now();
			}
		}
	}

	gpio.relay['relay_' + relay].writeSync(state);

	update.status('gpio.relay_' + relay, (state === 1));
}

// Toggle relay to opposite of current value
function toggle(relay) {
	if (config.gpio.enable !== true) return;

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
	if (process.arch !== 'arm') update.config('gpio.enable', false, false);

	if (config.gpio.enable !== true) {
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
	if (config.gpio.enable !== true) {
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
	if (config.gpio.enable !== true) return;

	// Toggle GPIO outputs on power module events
	power.on('active', (power_state) => {
		// Enable/disable amp relay
		set('amp', power_state);

		switch (power_state) {
			case false : {
				// Run fan for additional 60s after poweroff
				setTimeout(() => {
					if (status.vehicle.ignition_level === 0) gpio.set('fan', false);
				}, config.gpio.timeout.fan.poweroff);

				break;
			}

			case true : set('amp', true);
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
				if (status.system.temperature < config.system.temperature.fan_enable) return;

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

	fan_last : (time_now() - 90000),

	// Functions
	get    : get,
	init   : init,
	set    : set,
	term   : term,
	toggle : toggle,

	init_listeners : init_listeners,
};
