const os = require('os');

let config_object = {
	api : {
		port : 3000,
	},

	canbus : {
		coolant  : false,
		exterior : false,
		ignition : false,
		rpm      : false,
		speed    : false,
		voltage  : false,
	},

	bmbt : {
		media          : false,
		vol_at_poweron : false,
	},

	chassis : {
		make  : 'bmw',
		model : 'e39',
		year  : 2002,
	},

	con : {
		can_intf : 'can1',

		mode : 'nbt',

		timeout : {
			rotation_mode : 2000,
		},
	},

	console : {
		output : false,
	},

	dme : {
		can_intf : 'can0',
	},

	dsc : {
		can_intf : 'can0',
	},

	emulate : {
		bmbt : false,
		cas  : false,
		cdc  : false,
		con  : false,
		dia  : true,
		dspc : false,
		fem  : false,
		mid  : false,
		nbt  : false,
		rad  : false,
	},

	engine : {
		torque_max : 400,
	},

	fem : {
		can_intf : 'can1',
	},

	fuel : {
		liters_max : 65,
	},

	gear_ratios : {
		g1 : 4.227,
		g2 : 2.528,
		g3 : 1.669,
		g4 : 1.226,
		g5 : 1,
		g6 : 0.828,

		final : 3.150,
	},

	gm : {
		text : {
			ike : false,
			mid : false,
		},
	},

	gpio : {
		enable : false,

		pins : {
			relay_0 : 23,
			relay_1 : 24,
		},

		timeout : {
			fan : {
				hysteresis : 30000,
				poweroff   : 60000,
				unlock     : 300000,
			},
		},
	},

	hud : {
		refresh_max : 500,

		layout : {
			left   : 'temp',
			center : 'time',
			right  : 'cons',
		},

		cons : {
			unit : 'mph',
		},

		speed : {
			unit : 'mph',
		},

		time : {
			format : '12h',
		},

		temp : {
			coolant : true,
			oil     : false,
		},

		volt : {
			threshold : 12.5,
		},
	},

	ike : {
		sweep : false,
	},

	intf : {
		can0 : { enabled : false },
		can1 : { enabled : false },
		dbus : { enabled : false },
		ibus : { enabled : false },
		kbus : { enabled : false },
	},

	json : {
		reset_on_poweroff    : false,
		write_on_gear_change : false,
		write_on_poweroff    : false,
		write_on_reset       : false,
		write_on_run         : false,
	},

	kombi : {
		can_intf : 'can1',
		sweep    : false,
	},

	lights : {
		auto : false,

		welcome_lights_sec : 60,

		comfort_turn : {
			cluster_msg : false,
			enable      : true,
			flashes     : 5,
		},

		dimmer : {
			lights_off : 255,
			lights_on  : 254,
		},

		police_lights : {
			delay : 50,
			limit : 10,
		},

		welcome_lights : {
			output_brake_rear_left   : false,
			output_brake_rear_middle : false,
			output_brake_rear_right  : false,

			output_fog_front_left   : false,
			output_fog_front_right  : false,
			output_fog_rear_left    : false,
			output_fog_rear_trailer : false,

			output_highbeam_front_left  : false,
			output_highbeam_front_right : false,

			output_led_switch_hazard : false,
			output_led_switch_light  : false,

			output_license_rear_left  : true,
			output_license_rear_right : true,

			output_lowbeam_front_left  : false,
			output_lowbeam_front_right : false,

			output_reverse_rear_left    : true,
			output_reverse_rear_right   : true,
			output_reverse_rear_trailer : false,

			output_standing_front_left       : true,
			output_standing_front_right      : true,
			output_standing_inner_rear_left  : true,
			output_standing_inner_rear_right : true,
			output_standing_rear_left        : true,
			output_standing_rear_right       : true,

			output_turn_front_left   : false,
			output_turn_front_right  : false,
			output_turn_rear_left    : false,
			output_turn_rear_right   : false,
			output_turn_trailer_left : false,
		},
	},

	location : {
		latitude  : 39,
		longitude : -84,
	},

	loopback : false,

	media : {
		mid : false,

		poweroff_delay : 300000,

		bluetooth : {
			enable     : false,
			device_num : 2,

			text : {
				ike : false,
				mid : false,
			},
		},

		dsp : {
			default_source : 'tuner/tape',

			eq : {
				memory    : 1,
				reverb    : 0,
				room_size : 0,

				band : {
					0 : 0,
					1 : 0,
					2 : 0,
					3 : 0,
					4 : 0,
					5 : 0,
					6 : 0,
				},
			},
		},

		hdmi : {
			cec : {
				enable         : false,
				manufacturer   : 0xF0,
				osd_string     : 'node-bmw',
				poweroff_delay : 1000,
			},

			rpi : {
				check_interval : 300001,
				enable         : false,
			},
		},

		kodi : {
			default_volume : 30,

			enable : false,
			host   : '127.0.0.1',
			port   : 9090,

			ignore : {
				con : {
					touch : true,
				},
			},

			text : {
				ike : false,
				mid : false,
			},

			timeout : {
				powerup : 5000,
			},
		},
	},

	mfl : {
		can_intf : 'can1',

		media  : false,
		voice  : false,
		volume : false,
	},

	nbt : {
		can_intf : 'can1',

		mode : 'nbt',

		reverse_camera : {
			enabled : false,
			input   : 'RFK',
		},
	},

	notification : {
		method : null,

		config : {
			pushover : {
				html     : false,
				title    : app_name,
				device   : null,
				priority : 'low',
				sound    : 'none',
				token    : null,
				user_id  : null,

				url : {
					string : 'http://' + os.hostname(),
					title  : app_name + ' webUI',
				},
			},
		},
	},

	options : {
		message_reverse : true,
		message_welcome : false,

		modules_refresh_on_start : false,
		obc_refresh_on_start     : true,
	},

	power : {
		timeout : 600000,
	},

	rad : {
		after_start_delay : 2000,
		power_on_volume   : 6,
	},

	retrofit : {
		con : false,
		nbt : false,
	},

	speedometer : {
		offset : 0.975,
	},

	system : {
		host_data : {
			refresh_interval : 5000,
		},

		temperature : {
			fan_enable : 65,
		},
	},

	szm : {
		can_intf : 'can1',
	},

	tires : {
		width    : 255,
		sidewall : 40,
		wheel    : 17,
	},

	translate : {
		ccm : false,
		dsc : false,
		dsp : false,
		gm  : false,

		kombi : {
			speed : false,
		},

		lcm : false,
		mfl : false,
		pdc : false,
	},

	vehicle : {
		steering_multiplier : 0.043393,
	},

	weather : {
		apikey : null,
		notify : false,

		refresh_interval : 600000,
	},

	socket : {
		can0 : {
			type : 'path',
			path : '/var/run/bmwi-can0.sock',
		},
		can1 : {
			type : 'path',
			path : '/var/run/bmwi-can1.sock',
		},
		dbus : {
			type : 'path',
			path : '/var/run/bmwi-dbus.sock',
		},
		ibus : {
			type : 'path',
			path : '/var/run/bmwi-ibus.sock',
		},
		kbus : {
			type : 'path',
			path : '/var/run/bmwi-kbus.sock',
		},
	},
};


module.exports = config_object;
