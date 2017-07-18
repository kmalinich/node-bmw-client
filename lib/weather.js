const config = require('config.json'); // for testing
const status = require('status.json'); // for testing

const object_format = require('object-format');
const dark_sky = require('dark-sky');

const forecast = new dark_sky(config.weather.apikey);

forecast
  .latitude(status.location.latitude)
  .longitude(status.location.longitude)
  .exclude('minutely,hourly,daily')
  .extendHourly(false)
  .get()
  .then(result => {
    console.log(object_format(result));
  })
  .catch(error => { console.log(object_format(error));  });
