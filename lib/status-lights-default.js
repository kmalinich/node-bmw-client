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
				depress : null,
			},
			right : {
				active  : false,
				comfort : false,
				depress : null,
			},
			comfort_cool    : true,
			depress_elapsed : null,
			fast            : null,
			sync            : null,
		},
		fog : {
			front : null,
			rear  : null,
		},
		standing : {
			front : null,
			rear  : null,
		},
		trailer : {
			fog      : null,
			reverse  : null,
			standing : null,
		},
		faulty : {
			brake : {
				left  : null,
				right : null,
			},
			fog : {
				front : null,
				rear  : null,
			},
			lowbeam : {
				left  : null,
				right : null,
			},
			standing : {
				rear : {
					left  : null,
					right : null,
				},
				front : null,
			},
			turn : {
				left  : null,
				right : null,
			},
			all_ok        : null,
			highbeam      : null,
			license_plate : null,
			reverse       : null,
			trailer       : null,
		},
		all_off        : null,
		brake          : null,
		hazard         : null,
		highbeam       : null,
		interior       : null,
		lowbeam        : null,
		reverse        : null,
		welcome_lights : false,
	};
}

module.exports = {
	apply : apply,
};
