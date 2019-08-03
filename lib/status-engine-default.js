function apply() {
	return {
		dsc_error           : true,
		maf_error           : true,
		rpm                 : 0,
		running             : false,
		start_time_last     : Date.now(),
		status_ok           : false,
		torque_intervention : false,


		ac : {
			clutch  : false,
			request : null,
			torque  : null,
		},

		atmospheric_pressure : {
			mbar : 0,
			mmhg : 0,
			psi  : 0,
		},

		horsepower : {
			after_interventions  : 0,
			before_interventions : 0,

			loss   : 0,
			output : 0,
		},

		throttle : {
			cruise : 0,
			pedal  : 0,
		},

		torque : {
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
	apply : apply,
};
