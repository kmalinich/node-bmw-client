function apply() {
	return {
		dsc_ok      : null,
		maf_error   : null,
		running     : null,
		smg_present : null,

		start_time_last : Date.now(),

		rpm : 0,


		ac : {
			clutch  : null,
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
			active    : null,
			cut       : null,
			full_load : null,
		},

		lambda : {
			errorCode : null,
			lambda    : 0,
			status    : null,
			warmup    : 0,
		},

		throttle : {
			cruise : 0,
			pedal  : 0,
		},

		torque : {
			intervention : null,

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


export default {
	apply,
};
