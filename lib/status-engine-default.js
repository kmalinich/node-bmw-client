function apply() {
	return {
		dsc_ok      : true,
		maf_error   : true,
		running     : false,
		smg_present : false,

		start_time_last : Date.now(),

		rpm : 0,


		ac : {
			clutch  : false,
			request : null,
			torque  : null,
		},

		atmospheric_pressure : {
			hpa  : 0,
			mmhg : 0,
			psi  : 0,
		},

		horsepower : {
			after_interventions  : 0,
			before_interventions : 0,

			loss   : 0,
			output : 0,
		},

		fueling : {
			active    : false,
			cut       : false,
			full_load : false,
		},

		throttle : {
			cruise : 0,
			pedal  : 0,
		},

		torque : {
			intervention : false,

			after_interventions  : 0,
			before_interventions : 0,

			loss   : 0,
			output : 0,
		},

		torque_value : {
			after_interventions  : 0,
			before_interventions : 0,

			loss   : 0,
			output : 0,
		},
	};
}


module.exports = {
	apply,
};
