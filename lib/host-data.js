const module_name = __filename.slice(__dirname.length + 1, -3).replace('-', '_');

// Only load if configured as Raspberry Pi
if (config.system.pi === true) var pitemp = require('pi-temperature');


// Init all host data
function init() {
	status.system = {
		up : os.uptime(),
		temperature : refresh_temperature(),
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

	log.msg({
		src : module_name,
		msg : 'Initialized',
	});

	// return [module_name].data;
}

// Get+save RPi temp
function refresh_temperature() {
	if (config.system.pi !== true) {
		return 0;
	}

	pitemp.measure((error, temperature) => {
		if (error) {
			log.msg({
				src : module_name,
				msg : 'Pi temperature error : '+error,
			});

			return 0;
		}

		return parseFloat(temperature.toFixed(0));
	});
}

// Refresh host data
function refresh() {
	refresh_temperature();

	status.system.temperature  = refresh_temperature();
	status.system.up           = os.uptime();
	status.system.cpu.load     = os.loadavg();
	status.system.memory.free  = os.freemem();
	status.system.memory.total = os.totalmem();

	log.msg({
		src : module_name,
		msg : 'Refreshed',
	});

	return [module_name].data;
}


module.exports = {
	data : {},

	init    : () => { init();           },
	refresh : () => { return refresh(); },
};
