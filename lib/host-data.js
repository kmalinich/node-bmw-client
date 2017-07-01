const module_name = __filename.slice(__dirname.length + 1, -3).replace('-', '_');

// Only load if configured as Raspberry Pi
if (config.system.pi === true) var pitemp = require('pi-temperature');


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
	if (config.system.pi !== true) {
		status.system.temperature = 0;
		return false;
	}

	pitemp.measure((error, temperature) => {
		if (error) {
			log.msg({
				src : module_name,
				msg : 'Pi temperature error : '+error,
			});

			status.system.temperature = 0;
			return false;
		}

		status.system.temperature = temperature;
		return true;
	});
}

// Refresh host data
function refresh() {
	refresh_temperature();
	console.log('status.system.temperature : \'%s\'', status.system.temperature);
	status.system.up           = os.uptime();
	status.system.cpu.load     = os.loadavg();
	status.system.memory.free  = os.freemem();
	status.system.memory.total = os.totalmem();

	log.msg({
		src : module_name,
		msg : 'Refreshed',
	});

	return status.system;
}


module.exports = {
	data : {},

	init    : () => { init();           },
	refresh : () => { return refresh(); },
};
