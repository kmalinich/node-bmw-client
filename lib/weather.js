/* eslint no-console:0 */

const dark_sky = require('dark-sky');
let forecast;

function refresh() {
	// Bounce if we don't have config data
	if (typeof config                    === 'undefined') return;
	if (typeof config.location           === 'undefined') return;
	if (typeof config.location.longitude === 'undefined') return;
	if (typeof config.location.latitude  === 'undefined') return;

	forecast
		.latitude(config.location.latitude)
		.longitude(config.location.longitude)
		.exclude('minutely,hourly')
		.extendHourly(false)
		.get()
		.then(result => {
			status.weather = result;
			log.msg({ msg : 'Updated weather data' });
		})
		.catch(error => {
			log.msg({ msg : 'Error: ' + error });
		});
}

function init(init_callback = null) {
	forecast = new dark_sky(config.weather.apikey);

	if (weather.timeouts.refresh === null) {
		log.msg({
			msg : 'Set refresh timeout (' + config.weather.refresh_interval + 'ms)',
		});
	}

	// Trigger refresh
	refresh();

	// Set timeout
	weather.timeouts.refresh = setTimeout(refresh, config.weather.refresh_interval);

	log.msg({ msg : 'Initialized' });

	if (typeof init_callback === 'function') process.nextTick(init_callback);
	init_callback = undefined;
}

function term(term_callback = null) {
	if (weather.timeouts.refresh !== null) {
		clearTimeout(weather.timeouts.refresh);
		weather.timeouts.refresh = null;

		log.msg({ msg : 'Unset refresh timeout' });
	}

	log.msg({ msg : 'Terminated' });

	if (typeof term_callback === 'function') process.nextTick(term_callback);
	term_callback = undefined;
}

module.exports = {
	timeouts : {
		refresh : null,
	},

	refresh : refresh,
	init    : (init_cb) => { init(init_cb); },
	term    : (term_cb) => { term(term_cb); },
};
