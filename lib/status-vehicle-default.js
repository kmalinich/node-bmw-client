function apply() {
	return {
		brake : false,

		clutch       : false,
		clutch_count : 0,

		handbrake : false,
		reverse   : false,

		ignition       : 'off',
		ignition_level : 0,

		locked : null,
		sealed : false,

		vin : null,

		cruise : {
			button : {
				minus : false,
				onoff : false,
				plus  : false,
				unk1  : false,
			},

			status : {
				activating : false,
				active     : false,
				resume     : false,
				unk1       : false,
			},
		},

		dsc : {
			active : true,

			brake_pressure : {
				front : 0,
				pedal : 0,
				rear  : 0,
			},

			torque_reduction_1 : 0,
			torque_reduction_2 : 0,
		},

		key : {
			off       : false,
			accessory : false,
			run       : false,
			start     : false,
		},

		odometer : {
			km : 0,
			mi : 0,
		},

		running_clock : 0,

		speed : {
			kmh : 0,
			mph : 0,
		},

		sport : {
			active : false,
			error  : false,
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
	apply : apply,
};
