function apply() {
	return {
		auto : {
			active  : false,
			lowbeam : status.lights.auto.lowbeam,
			reason  : status.lights.auto.reason,
		},

		turn : {
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

			comfort_cool    : true,
			depress_elapsed : 0,

			fast : false,
			sync : false,
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
		all_off        : false,
		brake          : false,
		hazard         : false,
		highbeam       : false,
		interior       : false,
		lowbeam        : false,
		reverse        : false,
		welcome_lights : false,
		faulty         : {
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
				rear : {
					left  : false,
					right : false,
				},
				front : false,
			},
			turn : {
				left  : false,
				right : false,
			},
			all_ok        : false,
			highbeam      : false,
			license_plate : false,
			reverse       : false,
			trailer       : false,
		},
	};
}

module.exports = {
	apply : apply,
};
