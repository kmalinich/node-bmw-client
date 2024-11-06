function apply() {
	return {
		brake : null,

		clutch       : null,
		clutch_count : 0,

		handbrake : null,
		reverse   : null,

		ignition       : 'off',
		ignition_level : 0,

		locked : null,
		sealed : null,

		vin : null,

		cruise : {
			button : {
				deactivator : null,

				minus  : null,
				onoff  : null,
				plus   : null,
				resume : null,
			},

			status : {
				activating : null,
				active     : null,
				resume     : null,
				unk1       : null,
			},
		},

		dsc : {
			active : null,

			brake_pressure : {
				front : 0,
				pedal : 0,
				rear  : 0,
			},

			torque_intervention_asc    : 0,
			torque_intervention_asc_lm : 0,
			torque_intervention_msr    : 0,
		},

		key : {
			off       : null,
			accessory : null,
			run       : null,
			start     : null,
		},

		odometer : {
			km : 0,
			mi : 0,
		},

		running_clock : 0,

		speed : {
			kmh    : 0,
			mph    : 0,
			pulses : 0,
		},

		sport : {
			active : null,
			error  : null,
		},

		steering : {
			angle    : 0,
			velocity : 0,
		},

		wheel_speed : {
			front : {
				left  : 0,
				right : 0,
			},

			rear : {
				left  : 0,
				right : 0,
			},
		},
	};
}


module.exports = {
	apply,
};
