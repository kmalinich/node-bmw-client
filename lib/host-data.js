const module_name = __filename.slice(__dirname.length + 1, -3).replace('-', '_');

// Check if we can get temp data
// (support is on macOS and RPi)
function check(check_callback = null) {
	// Don't check the logic twice, and only notify the first time
	if (host_data.check_result === null) {
		// Save check result
		host_data.check_result = (process.arch == 'arm' || process.platform == 'darwin');

		// Save host type
		host_data.type = process.arch == 'arm' && 'pi-temperature' || 'smc';

		// Load appropriate temperature library
		system_temp = require(host_data.type);

		log.msg({
			src : module_name,
			msg : 'Check passed: '+host_data.check_result+', type: '+host_data.type,
		});
	}

	if (typeof check_callback === 'function') check_callback();
	check_callback = undefined;

	return host_data.check_result;
}

// Init all host data
function init() {
	status.system = {
		type : 'client',
		up : os.uptime(),
		temperature : null,
		host : {
			full : os.hostname(),
			short : os.hostname().split('.')[0],
		},
		cpu : {
			arch : os.arch(),
			load : os.loadavg(),
			model : os.cpus()[0].model,
			speed : os.cpus()[0].speed,
		},
		memory : {
			free : os.freemem(),
			total : os.totalmem(),
			free_percent : parseFloat(((os.freemem()/os.totalmem()).toFixed(4))*100),
		},
		os : {
			platform : os.platform(),
			type : os.type(),
			release : os.release(),
		},
	};

	refresh_temperature();

	log.msg({
		src : module_name,
		msg : 'Initialized',
	});
}

// Get+save RPi temp
function refresh_temperature() {
	if (!check()) {
		status.system.temperature = 0;
		return false;
	}

	switch (host_data.type) {
		case 'pi-temperature':
			system_temp.measure((error, value) => {
				if (typeof error == 'undefined' || error === null) {
					status.system.temperature = Math.round(value);
					return;
				}

				status.system.temperature = 0;

				log.msg({
					src : module_name,
					msg : host_data.type+' error: '+error,
				});
			});
			break;

		case 'smc':
			// TC0D : Hackintosh
			// TC0E : 2016 rMBP

			// Either TC0D or TC0E is always 0.. so ..
			// .. yeah, that's gross

			// Save rounded temp value
			status.system.temperature = Math.round(system_temp.get('TC0D')+system_temp.get('TC0E'));
			break;
	}

	log.msg({
		src : module_name,
		msg : 'System temp: '+status.system.temperature+'c',
	});
}

// Refresh host data
function refresh() {
	refresh_temperature();

	status.system.up       = os.uptime();
	status.system.cpu.load = os.loadavg();

	status.system.memory.free  = os.freemem();
	status.system.memory.total = os.totalmem();

	status.system.memory.free_percent = parseFloat(((os.freemem()/os.totalmem()).toFixed(2))*100);

	return status.system;
}

// Send this host's data to WebSocket clients to update them
function send() {
	if (host_data.timeouts.send !== null) {
		clearTimeout(host_data.timeouts.send);
		host_data.timeouts.send = null;

		log.module({
			src : module_name,
			msg : 'Unset host data send timeout',
		});

		return;
	}

	if (host_data.timeouts.send === null) {
		log.module({
			src : module_name,
			msg : 'Set host data send timeout ('+config.system.host_data.refresh_interval+'ms)',
		});
	}

	socket.send('host-data', host_data.refresh());
	host_data.timeouts.send = setTimeout(send, config.system.host_data.refresh_interval);
}

module.exports = {
	check_result : null,
	type : null,

	timeouts : {
		send : null,
	},

	check   : () => { check();          },
	init    : () => { init();           },
	send    : () => { send();           },
	refresh : () => { return refresh(); },
};
