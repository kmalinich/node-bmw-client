const os = require('os');

let config_object = {
	canbus : {
		coolant : false,
		exterior : false,
		rpm : false,
		speed : false,
	},
	emulate : {
		bmbt : true,
		cdc : false,
		dspc : true,
		mid : false,
	},
	gpio : {
		enable : false,
		pins : {
			relay_1 : 23,
			relay_2 : 24,
		},
	},
	json : {
		reset_on_poweroff : false,
		write_on_poweroff : false,
		write_on_reset : false,
		write_on_run : false,
	},
	lights : {
		auto : true,
		comfort_turn : {
			cluster_msg : true,
			enable : true,
			flashes : 5,
		},
		dimmer : {
			lights_off : 255,
			lights_on : 254,
		},
		welcome_lights : {
			output_brake_rear_left : false,
			output_brake_rear_middle : false,
			output_brake_rear_right : false,
			output_fog_front_left : false,
			output_fog_front_right : false,
			output_fog_rear_left : false,
			output_fog_rear_trailer : false,
			output_highbeam_front_left : false,
			output_highbeam_front_right : false,
			output_led_switch_hazard : false,
			output_led_switch_light : false,
			output_license_rear_left : false,
			output_license_rear_right : true,
			output_lowbeam_front_left : false,
			output_lowbeam_front_right : false,
			output_reverse_rear_left : true,
			output_reverse_rear_right : true,
			output_reverse_rear_trailer : false,
			output_standing_front_left : true,
			output_standing_front_right : true,
			output_standing_inner_rear_left : true,
			output_standing_inner_rear_right : true,
			output_standing_rear_left : true,
			output_standing_rear_right : true,
			output_turn_front_left : false,
			output_turn_front_right : false,
			output_turn_rear_left : false,
			output_turn_rear_right : false,
			output_turn_trailer_left : false,
		},
		welcome_lights_sec : 60,
	},
	location : {
		latitude : 39,
		longitude : -84,
	},
	media : {
		bluetooth : false,
		hdmi : {
			enable : false,
			manufacturer : 0xF0,
			osd_string : 'node-bmw',
			poweroff_delay : 1000,
		},
		kodi : {
			default_volume : 40,
			enable : false,
			host : '127.0.0.1',
			mfl_volume : true,
			port : 9090,
		},
		mid : false,
	},
	notification : {
		config : {
			pushover : {
				html : false,
				title : app_name,
				device : null,
				priority : 'low',
				sound : 'none',
				token : null,
				url : {
					string : 'http://'+os.hostname(),
					title : app_name+' webUI',
				},
				user_id : null,
			},
		},
		method : null,
	},
	options : {
		message_reverse : false,
		message_welcome : false,
		modules_refresh_on_start : false,
		obc_refresh_on_start : true,
	},
	system : {
		host_data : {
			refresh_interval : 30000,
		},
	},
	weather : {
		apikey : null,
	},
	zeromq : {
		host: '*',
		port: 4001,
		proto: 'tcp',
	},
};

module.exports = config_object;
