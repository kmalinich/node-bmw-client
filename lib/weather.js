/* eslint require-atomic-updates : 0 */

const dark_sky = require('dark-sky');
const moment   = require('moment');

let forecast;

async function refresh() {
	// Bounce if we don't have config data
	if (typeof config                    === 'undefined') return;
	if (typeof config.location           === 'undefined') return;
	if (typeof config.location.longitude === 'undefined') return;
	if (typeof config.location.latitude  === 'undefined') return;

	if (config.weather.apikey === null) return;

	try {
		const result = await forecast.latitude(config.location.latitude).longitude(config.location.longitude).exclude('minutely,hourly').extendHourly(false).get();

		status.weather = result;
		log.lib('Updated weather data');

		if (config.weather.notify === true) {
			if (typeof notify !== 'undefined' && notify) {
				notify.notify('Updated weather data @ ' + moment().format('MMMM Do YYYY, h:mm:ss a'));
			}
		}
	}
	catch (error) {
		log.error(error);

		if (config.weather.notify === true) {
			if (typeof notify !== 'undefined' && notify) {
				notify.notify('FAILED updating weather data @ ' + moment().format('MMMM Do YYYY, h:mm:ss a'));
			}
		}
	}

	// Re-set timeout
	weather.timeout.refresh = await setTimeout(refresh, config.weather.refresh_interval);
} // async refresh()

async function init() {
	if (config.weather.apikey === null) return;

	forecast = await new dark_sky(config.weather.apikey);

	if (weather.timeout.refresh === null) {
		log.lib('Set refresh timeout (' + config.weather.refresh_interval + 'ms)');
	}

	// Trigger refresh
	await refresh();

	// Set timeout
	// eslint require-atomic-updates
	weather.timeout.refresh = await setTimeout(refresh, config.weather.refresh_interval);

	log.lib('Initialized');
} // async init()

async function term() {
	if (weather.timeout.refresh !== null) {
		await clearTimeout(weather.timeout.refresh);
		weather.timeout.refresh = null;

		log.lib('Unset refresh timeout');
	}

	log.lib('Terminated');
} // async term()


module.exports = {
	timeout : {
		refresh : null,
	},

	init,
	term,

	refresh,
};
