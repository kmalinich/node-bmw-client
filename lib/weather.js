/* eslint no-console:0 */

const dark_sky = require('dark-sky');

const config = require('./../config.json'); // for testing
const status = require('./../status.json'); // for testing

const forecast = new dark_sky(config.weather.apikey);

forecast
	.latitude(config.location.latitude)
	.longitude(config.location.longitude)
	// .exclude('minutely,hourly,daily')
	.extendHourly(false)
	.get()
	.then(result => {
		status.weather = result;
		console.dir(result);
	})
	.catch(error => {
		log.msg({ msg : 'Error: '+error });
	});
