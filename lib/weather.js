const weather = require('weather-js');

let weather_options = {
	search : '45039',
	degreeType: 'C',
};

let wo_json = JSON.stringify(weather_options, null, 2);

weather.find(weather_options, (error, result) => {
	let output = {
		options : weather_options,
	};

	if (error) {
		output.success = false;
		output.data    = error;

		let json = JSON.stringify(output, null, 2);
		console.log(json);
		return;
	}

	output.success = true;
	output.data    = result;

	let json = JSON.stringify(output, null, 2);
	console.log(json);
});
