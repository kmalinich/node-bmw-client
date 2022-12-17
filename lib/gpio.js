// Refresh/update GPIO values
async function get() {
	if (config.gpio.enable !== true) return;

	// Get the current state
	for (let relay = 0; relay < 1; relay++) {
		const state = await gpio.relay['relay_' + relay].readSync();
		update.status('gpio.relay_' + relay, (state === 1));
	}
} // async get()

// Set relay to a specific value
async function set(relay, state) {
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
					const fan_gap = Date.now() - gpio.fan_last;

					if (fan_gap < config.gpio.timeout.fan.hysteresis) {
						log.lib('Not disabling fan, hysteresis triggered');
						return;
					}

					break;
				}

				case 1 : gpio.fan_last = Date.now();
			}
		}
	}

	await gpio.relay['relay_' + relay].writeSync(state);

	update.status('gpio.relay_' + relay, (state === 1));
} // async set(relay, state)

// Toggle relay to opposite of current value
async function toggle(relay) {
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
	const state = Math.abs(gpio.relay['relay_' + relay].readSync() - 1);

	await gpio.relay['relay_' + relay].writeSync(state);

	update.status('gpio.relay_' + relay, (state === 1));
} // async toggle(relay)


async function init() {
	if (process.arch !== 'arm') update.config('gpio.enable', false, false);

	if (config.gpio.enable !== true) return false;

	// Only load if configured as Raspberry Pi
	const GPIO = require('onoff').Gpio;

	const options = {
		direction : 'high',
		edge      : 'none',
		options   : {
			activeLow : true,
		},
	};

	gpio.relay[0] = new GPIO(config.gpio.pins.relay_0, options.direction, options.options);
	gpio.relay[1] = new GPIO(config.gpio.pins.relay_1, options.direction, options.options);
	log.lib('Initialized');

	// Turn off relays
	for (let i = 0; i < 2; i++) await set(i, false);
} // async init()

async function term() {
	if (config.gpio.enable !== true) return false;

	// Turn off relays
	for (let i = 0; i < 2; i++) await set(i, false);

	log.lib('Terminated');
} // async term()


function init_listeners() {
	if (config.gpio.enable !== true) return;

	// Toggle GPIO outputs on power module events
	power.on('active', power_state => {
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

	update.on('status.system.temperature', data => {
		// Bounce if system power isn't active
		if (status.power.active !== true) return;

		// Enable fan if CPU temperature is over configured limit
		set('fan', (data.new >= config.system.temperature.fan_enable));
	});

	// Enable fan GPIO relay on GM keyfob unlock event
	GM.on('keyfob', keyfob => {
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


	log.lib('Initialized listeners');
}


export default {
	relay : [ null, null ],

	fan_last : (Date.now() - 90000),

	// Functions
	get,
	init,
	set,
	term,
	toggle,

	init_listeners,
};
