function apply() {
	return {
		ready : false,
		reset : true,

		police_lights : {
			ok : false,
			on : false,

			counts : {
				loop : 0,
				main : 0,
			},
		},

		io : [],

		clamp : {
			c_15  : null,
			c_30a : null,
			c_30b : null,
			c_r   : null,
		},

		dimmer : {
			value_1 : 0,
			value_2 : 0,
		},

		input : {
			air_suspension            : null,
			armoured_door             : null,
			brake_fluid_level         : null,
			carb                      : null,
			engine_failsafe           : null,
			fire_extinguisher         : null,
			hold_up_alarm             : null,
			key_in_ignition           : null,
			kfn                       : null,
			preheating_fuel_injection : null,
			seat_belts_lock           : null,
			tire_defect               : null,
			vertical_aim              : null,
			washer_fluid_level        : null,
		},

		mode : {
			failsafe : null,
			sleep    : null,
		},

		output : {
			brake : {
				rear_left   : null,
				rear_middle : null,
				rear_right  : null,
			},

			fog : {
				front_left  : null,
				front_right : null,
				rear_left   : null,
			},

			highbeam : {
				front_left  : null,
				front_right : null,
			},

			led : {
				switch_hazard : null,
				switch_light  : null,
			},

			license : {
				rear_left  : null,
				rear_right : null,
			},

			lowbeam : {
				front_left  : null,
				front_right : null,
			},

			reverse : {
				rear_left    : null,
				rear_right   : null,
				rear_trailer : null,
			},

			standing : {
				front_left       : null,
				front_right      : null,
				inner_rear_left  : null,
				inner_rear_right : null,
				rear_left        : null,
				rear_right       : null,
			},

			turn : {
				front_left  : null,
				front_right : null,
				rear_left   : null,
				rear_right  : null,
			},
		},

		voltage : {
			flash_to_pass      : 0,
			photo_cell         : 0,
			terminal_30        : 0,
			turn_signal_switch : 0,

			lwr : {
				front : {
					current : 2.5,
					minimum : 5,
					maximum : 0,
				},

				rear : {
					current : 2.5,
					minimum : 5,
					maximum : 0,
				},
			},

			pot : {
				dimmer : {
					current : 2.5,
					minimum : 5,
					maximum : 0,
				},

				lwr : {
					current : 2.5,
					minimum : 5,
					maximum : 0,
				},
			},
		},

		switch : {
			auto           : null,
			brake          : null,
			fog_front      : null,
			fog_rear       : null,
			hazard         : null,
			highbeam       : null,
			highbeam_flash : null,
			lowbeam_1      : null,
			lowbeam_2      : null,
			standing       : null,
			turn_left      : null,
			turn_right     : null,
		},
	};
}


module.exports = {
	apply : apply,
};
