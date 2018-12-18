function apply() {
	let status_voltage = {
		flash_to_pass      : 5,
		photo_cell         : 0,
		terminal_30        : 0,
		turn_signal_switch : 5,

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
	};

	if (typeof status === 'object') {
		if (typeof status.lcm === 'object') {
			if (typeof status.lcm.voltage === 'object') {
				if (typeof status.lcm.voltage.flash_to_pass      === 'number') status_voltage.flash_to_pass      = status.lcm.voltage.flash_to_pass;
				if (typeof status.lcm.voltage.photo_cell         === 'number') status_voltage.photo_cell         = status.lcm.voltage.photo_cell;
				if (typeof status.lcm.voltage.terminal_30        === 'number') status_voltage.terminal_30        = status.lcm.voltage.terminal_30;
				if (typeof status.lcm.voltage.turn_signal_switch === 'number') status_voltage.turn_signal_switch = status.lcm.voltage.turn_signal_switch;

				if (typeof status.lcm.voltage.lwr === 'object') {
					if (typeof status.lcm.voltage.lwr.front === 'object') {
						if (typeof status.lcm.voltage.lwr.front.current === 'number') status_voltage.lwr.front.current = status.lcm.voltage.lwr.front.current;
						if (typeof status.lcm.voltage.lwr.front.minimum === 'number') status_voltage.lwr.front.minimum = status.lcm.voltage.lwr.front.minimum;
						if (typeof status.lcm.voltage.lwr.front.maximum === 'number') status_voltage.lwr.front.maximum = status.lcm.voltage.lwr.front.maximum;
					}

					if (typeof status.lcm.voltage.lwr.rear === 'object') {
						if (typeof status.lcm.voltage.lwr.rear.current === 'number') status_voltage.lwr.rear.current = status.lcm.voltage.lwr.rear.current;
						if (typeof status.lcm.voltage.lwr.rear.minimum === 'number') status_voltage.lwr.rear.minimum = status.lcm.voltage.lwr.rear.minimum;
						if (typeof status.lcm.voltage.lwr.rear.maximum === 'number') status_voltage.lwr.rear.maximum = status.lcm.voltage.lwr.rear.maximum;
					}
				}

				if (typeof status.lcm.voltage.pot === 'object') {
					if (typeof status.lcm.voltage.pot.dimmer === 'object') {
						if (typeof status.lcm.voltage.pot.dimmer.current === 'number') status_voltage.pot.dimmer.current = status.lcm.voltage.pot.dimmer.current;
						if (typeof status.lcm.voltage.pot.dimmer.minimum === 'number') status_voltage.pot.dimmer.minimum = status.lcm.voltage.pot.dimmer.minimum;
						if (typeof status.lcm.voltage.pot.dimmer.maximum === 'number') status_voltage.pot.dimmer.maximum = status.lcm.voltage.pot.dimmer.maximum;
					}

					if (typeof status.lcm.voltage.pot.lwr === 'object') {
						if (typeof status.lcm.voltage.pot.lwr.current === 'number') status_voltage.pot.lwr.current = status.lcm.voltage.pot.lwr.current;
						if (typeof status.lcm.voltage.pot.lwr.minimum === 'number') status_voltage.pot.lwr.minimum = status.lcm.voltage.pot.lwr.minimum;
						if (typeof status.lcm.voltage.pot.lwr.maximum === 'number') status_voltage.pot.lwr.maximum = status.lcm.voltage.pot.lwr.maximum;
					}
				}
			}
		}
	}


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

		io : [
			0x81,
			0xC0,
			0x01,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0xA7,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0xE4,
			0x00,
			0x00,
			0x28,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0xFF,
			0xFF,
			0x00,
		],

		clamp : {
			c_15  : false,
			c_30a : false,
			c_30b : false,
			c_r   : false,
		},

		dimmer : {
			value_1 : 0,
			value_2 : 228,
		},

		input : {
			air_suspension            : false,
			armoured_door             : false,
			brake_fluid_level         : false,
			carb                      : false,
			engine_failsafe           : false,
			fire_extinguisher         : false,
			hold_up_alarm             : false,
			key_in_ignition           : false,
			kfn                       : false,
			preheating_fuel_injection : false,
			seat_belts_lock           : false,
			tire_defect               : false,
			vertical_aim              : false,
			washer_fluid_level        : false,
		},

		mode : {
			failsafe : false,
			sleep    : false,
		},

		output : {
			brake : {
				rear_left   : false,
				rear_middle : false,
				rear_right  : false,
			},

			fog : {
				front_left   : false,
				front_right  : false,
				rear_left    : false,
				rear_right   : false,
				rear_trailer : false,
			},

			highbeam : {
				front_left  : false,
				front_right : false,
			},

			led : {
				switch_hazard : false,
				switch_light  : false,
			},

			license : {
				rear_left  : false,
				rear_right : false,
			},

			lowbeam : {
				front_left  : false,
				front_right : false,
			},

			reverse : {
				rear_left    : false,
				rear_right   : false,
				rear_trailer : false,
			},

			standing : {
				front_left       : false,
				front_right      : false,
				inner_rear_left  : false,
				inner_rear_right : false,
				rear_left        : false,
				rear_right       : false,
			},

			turn : {
				front_left  : false,
				front_right : false,
				rear_left   : false,
				rear_right  : false,
			},
		},

		voltage : status_voltage,

		switch : {
			auto           : false,
			brake          : false,
			fog_front      : false,
			fog_rear       : false,
			hazard         : false,
			highbeam       : false,
			highbeam_flash : false,
			lowbeam_1      : false,
			lowbeam_2      : false,
			standing       : false,
			turn_left      : false,
			turn_right     : false,
		},
	};
}


module.exports = {
	apply : apply,
};
