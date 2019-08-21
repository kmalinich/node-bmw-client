function apply() {
	return {
		arrival      : null,
		aux_heat_led : null,
		code         : null,
		date         : null,
		distance     : null,
		interim      : null,
		limit        : null,
		stopwatch    : null,
		time         : null,
		timer        : null,

		aux_heat_timer : {
			t1 : null,
			t2 : null,
		},

		average_speed : {
			kmh : 0,
			mph : 0,
		},

		consumption : {
			c1 : {
				l100 : 0,
				mpg  : 0,
			},

			c2 : {
				l100 : 0,
				mpg  : 0,
			},
		},

		range : {
			km : 0,
			mi : 0,
		},
	};
}


module.exports = {
	apply : apply,
};
