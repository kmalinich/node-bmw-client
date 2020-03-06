const dark_sky = require('dark-sky');


function refresh() {
	// Clear timeout
	clearTimeout(weather.timeout.refresh);

	// Bounce if we don't have config data
	if (typeof config                    === 'undefined') return;
	if (typeof config.location           === 'undefined') return;
	if (typeof config.location.longitude === 'undefined') return;
	if (typeof config.location.latitude  === 'undefined') return;

	if (config.weather.apikey === null) return;

	// Catch uncorrected config.weather.refresh_interval
	if (config.weather.refresh_interval > 1000) {
		log.lib('Weather refresh interval not valid, setting to default');
		update.config('weather.refresh_interval', 60, false);
	}

	weather
		.forecast
		.latitude(config.location.latitude)
		.longitude(config.location.longitude)
		.exclude('minutely,hourly')
		.extendHourly(false)
		.get()
		.then(response => {
			status.weather = response;
			log.lib('Updated weather data');
		})
		.catch(error => {
			log.error(error);
		});

	// Re-set timeout
	if (weather.timeout.refresh === null) log.lib('Set refresh timeout (' + config.weather.refresh_interval + ' minutes)');
	weather.timeout.refresh = setTimeout(refresh, (config.weather.refresh_interval * 60) * 1000);
} // refresh()

function init() {
	if (config.weather.apikey === null) return;

	weather.forecast = new dark_sky(config.weather.apikey);

	// Trigger refresh
	refresh();

	log.lib('Initialized');
} // init()

function term() {
	if (weather.timeout.refresh !== null) {
		clearTimeout(weather.timeout.refresh);
		weather.timeout.refresh = null;

		log.lib('Unset refresh timeout');
	}

	log.lib('Terminated');
} // term()


module.exports = {
	forecast : null,

	timeout : {
		refresh : null,
	},

	init,
	term,

	refresh,
};
