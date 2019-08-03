function apply() {
	return {
		last_refresh : 0,
		latitude     : 0,
		longitude    : 0,
		offset       : 0,
		timezone     : null,

		currently : {
			apparentTemperature  : 0,
			cloudCover           : 0,
			dewPoint             : 0,
			humidity             : 0,
			icon                 : null,
			nearestStormBearing  : null,
			nearestStormDistance : 0,
			ozone                : null,
			precipIntensity      : 0,
			precipProbability    : 0,
			pressure             : 0,
			summary              : null,
			temperature          : 0,
			time                 : 0,
			uvIndex              : 0,
			visibility           : 0,
			windBearing          : null,
			windGust             : 0,
			windSpeed            : 0,
		},

		flags : {
			'isd-stations' : [],
			sources        : [],
			units          : null,
		},
	};
}


module.exports = {
	apply : apply,
};
