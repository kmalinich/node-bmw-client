function apply() {
	let status_auto = {
		active           : false,
		lowbeam          : false,
		night_percentage : 100,
		reason           : null,
	};

	if (typeof status === 'object') {
		if (typeof status.lights === 'object') {
			if (typeof status.lights.auto === 'object') {
				if (typeof status.lights.auto.lowbeam === 'boolean') status_auto.lowbeam = status.lights.auto.lowbeam;
				if (typeof status.lights.auto.reason  === 'string')  status_auto.reason  = status.lights.auto.reason;
			}
		}
	}

	return {
		all_off        : false,
		brake          : false,
		hazard         : false,
		highbeam       : false,
		interior       : false,
		lowbeam        : false,
		reverse        : false,
		welcome_lights : false,

		auto : status_auto,

		turn : {
			comfort_cool    : true,
			depress_elapsed : 0,

			fast : false,
			sync : false,

			left : {
				active  : false,
				comfort : false,
				depress : 0,
			},

			right : {
				active  : false,
				comfort : false,
				depress : 0,
			},
		},

		fog : {
			front : false,
			rear  : false,
		},

		standing : {
			front : false,
			rear  : false,
		},

		trailer : {
			fog      : false,
			reverse  : false,
			standing : false,
		},

		faulty : {
			all_ok        : false,
			highbeam      : false,
			license_plate : false,
			reverse       : false,
			trailer       : false,

			brake : {
				left  : false,
				right : false,
			},

			fog : {
				front : false,
				rear  : false,
			},

			lowbeam : {
				both  : false,
				left  : false,
				right : false,
			},

			standing : {
				front : false,

				rear : {
					left  : false,
					right : false,
				},
			},

			turn : {
				left  : false,
				right : false,
			},
		},
	};
}


module.exports = {
	apply : apply,
};
