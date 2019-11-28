import DarkSky from 'dark-sky';
import moment  from 'moment';


let forecast;

function refresh() {
	// Bounce if we don't have config data
	if (typeof config                    === 'undefined') return;
	if (typeof config.location           === 'undefined') return;
	if (typeof config.location.longitude === 'undefined') return;
	if (typeof config.location.latitude  === 'undefined') return;

	if (config.weather.apikey === null) return;

	forecast
		.latitude(config.location.latitude)
		.longitude(config.location.longitude)
		.exclude('minutely,hourly')
		.extendHourly(false)
		.get()
		.then(result => {
			status.weather = result;
			log.lib('Updated weather data');

			if (config.weather.notify === true) {
				if (typeof notify !== 'undefined' && notify) {
					notify.notify('Updated weather data @ ' + moment().format('MMMM Do YYYY, h:mm:ss a'));
				}
			}
		})
		.catch(error => {
			log.lib('Error: ' + error);

			if (config.weather.notify === true) {
				if (typeof notify !== 'undefined' && notify) {
					notify.notify('FAILED updating weather data @ ' + moment().format('MMMM Do YYYY, h:mm:ss a'));
				}
			}
		});

	// Re-set timeout
	weather.timeout.refresh = setTimeout(refresh, config.weather.refresh_interval);
}

function init(init_cb = null) {
	if (config.weather.apikey === null) {
		typeof init_cb === 'function' && process.nextTick(init_cb);
		init_cb = undefined;
		return;
	}

	forecast = new DarkSky(config.weather.apikey);

	if (weather.timeout.refresh === null) {
		log.lib('Set refresh timeout (' + config.weather.refresh_interval + 'ms)');
	}

	// Trigger refresh
	refresh();

	// Set timeout
	weather.timeout.refresh = setTimeout(refresh, config.weather.refresh_interval);

	log.lib('Initialized');

	typeof init_cb === 'function' && process.nextTick(init_cb);
	init_cb = undefined;
}

function term(term_cb = null) {
	if (weather.timeout.refresh !== null) {
		clearTimeout(weather.timeout.refresh);
		weather.timeout.refresh = null;

		log.lib('Unset refresh timeout');
	}

	log.lib('Terminated');

	typeof term_cb === 'function' && process.nextTick(term_cb);
	term_cb = undefined;
}


export default {
	timeout : {
		refresh : null,
	},

	init,
	term,

	refresh,
};
