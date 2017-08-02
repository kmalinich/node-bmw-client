const module_name = __filename.slice(__dirname.length + 1, -3);

const dark_sky = require('dark-sky');

const config = require('./../config.json'); // for testing
const status = require('./../status.json'); // for testing

const forecast = new dark_sky(config.weather.apikey);

forecast
	.latitude(config.location.latitude)
	.longitude(config.location.longitude)
	.exclude('minutely,hourly,daily')
	.extendHourly(false)
	.get()
	.then(result => {
		status.weather = result;
		// console.log(object_format(result));
	})
	.catch(error => {
		log.msg({ src : module_name, msg : 'Error: '+error });
	});
