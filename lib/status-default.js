/* eslint no-console       : 0 */
/* eslint no-global-assign : 0 */

app_intf = 'client';


let status_object = {
	abg : {
		ready : false,
		reset : true,
	},

	bmbt : {
		ready : false,
		reset : true,

		last : {
			action : null,
			button : null,
		},
	},

	bluetooth : require('status-bluetooth-default').apply(),

	ccm : {
		ready : false,
		reset : true,
	},

	cdc : {
		ready : false,
		reset : true,
	},

	cic : {
		ready        : false,
		request_sent : false,
		reset        : true,
	},

	coding : {
		network  : null,
		language : null,

		since_service : {
			days   : 0,
			liters : 0,
		},

		unit : {
			cons     : null,
			distance : null,
			speed    : null,
			temp     : null,
			time     : null,
		},
	},

	cas : {
		keyfob : {
			button  : null,
			buttons : {
				lock   : false,
				unlock : false,
				trunk  : false,
				none   : false,
			},
		},
	},

	con : {
		rotation : {
			absolute   : 0,
			direction  : null,
			horizontal : false,
			last_msg   : 0,
			relative   : 0xFF,
			volume     : false,
		},

		last : {
			event  : null,
			string : null,

			button : {
				button : null,
			},

		},

		touch : {
			count     : 0,
			direction : null,

			x : 0,
			y : 0,
		},
	},

	dia : {
		ready : false,
		reset : true,
	},

	dme : {
		ready : false,
		reset : true,

		status : {
			check_engine  : false,
			check_gas_cap : false,
			cruise        : false,
			eml           : false,
		},

		voltage : 0,
	},

	doors : {
		hood  : null,
		trunk : null,

		front_left  : null,
		front_right : null,
		rear_left   : null,
		rear_right  : null,

		closed : null,
		opened : null,
		sealed : null,
	},

	dsp : require('status-dsp-default').apply(),

	dspc : {
		ready : false,
		reset : true,
	},

	egs : {
		gear : null,
	},

	engine : require('status-engine-default').apply(),

	ews : {
		ready : false,
		reset : true,
	},

	fem : {
		backlight : {
			real  : 253,
			value : 255,
		},
	},

	fuel : {
		consumption : 0,
		level       : 0,
		liters      : 0,

		pump : {
			duty    : 0,
			percent : 0,
		},
	},

	gm : {
		ready : false,
		reset : true,

		keyfob : {
			low_batt : false,

			button  : null,
			buttons : {
				lock   : false,
				unlock : false,
				trunk  : false,
				none   : false,
			},

			key  : 0,
			keys : {
				key0 : false,
				key1 : false,
				key2 : false,
				key3 : false,
			},
		},

		wipers : {
			speed       : 'off',
			sensitivity : 0,
		},
	},

	gpio : {
		relay_0 : false,
		relay_1 : false,
	},

	gt : require('status-vid-default').apply(),

	hdmi : {
		cec : {
			active_source : null,
			client_ready  : false,
			osd_name      : null,
			physical_addr : null,
			power_status  : null,

			routing : {
				new : 0,
				old : 0,
			},
		},

		rpi : {
			group          : null,
			mode           : null,
			power          : null,
			power_override : false,
			progressive    : null,
			ratio          : null,
			refreshrate    : 0,
			resolution     : null,
			state          : null,
			tty            : 0,
		},
	},

	hud : {
		refresh_last : 0,
		string       : '',
	},

	ihka : {
		ac        : null,
		defroster : null,
		ready     : false,
		reset     : true,
	},

	ike : {
		alarm_siren_on        : null,
		aux_heat_on           : null,
		aux_vent_on           : null,
		gear_p                : null,
		gear_r                : null,
		handbrake_on          : null,
		immobilizer_on        : null,
		motor_running         : null,
		oil_pressure_low      : null,
		ready                 : false,
		reset                 : true,
		reverse_not_plausible : null,
		temp_f                : null,
		vehicle_driving       : null,
	},

	immobilizer : {
		immobilized : null,
		key_number  : 0,
		key_present : null,
	},

	kodi : {
		volume : {
			level : 0,
			muted : null,
		},

		player : {
			status : null,
			album  : null,
			artist : null,
			id     : null,
			title  : null,
			type   : null,

			time : {
				minutes : 0,
				seconds : 0,
			},
		},
	},

	lcm    : require('status-lcm-default').apply(),
	lights : require('status-lights-default').apply(),

	mfl : {
		ready : false,
		reset : true,

		last : {
			action : null,
			button : null,
		},
	},

	mid : require('status-mid-default').apply(),

	nav : {
		ready : false,
		reset : true,
	},

	nave : {
		ready : false,
		reset : true,
	},

	nbt : {
		cid : {
			brightness : null,
		},

		video : {
			source : null,
		},
	},

	obc : require('status-obc-default').apply(),

	pdc : {
		ready : false,
		reset : true,
	},

	power : require('status-power-default').apply(),
	rad   : require('status-rad-default').apply(),

	rdc : {
		ready : false,
		reset : true,
	},

	rls : {
		ready : false,
		reset : true,

		wiper_status : null,

		interval : {
			wipe : {
				headlight : {
					v1 : 0,
					v2 : 0,
				},
			},
		},

		light : {
			intensity : 0,
			lights    : null,
			reason    : null,
		},
	},

	server : {
		connected    : false,
		connecting   : false,
		latency      : 0,
		reconnecting : false,

		interfaces : {
			can0 : false,
			can1 : false,
			dbus : false,
			ibus : false,
			kbus : false,
		},
	},

	system : require('status-system-default').apply(),
	szm    : require('status-szm-default').apply(),

	tel : {
		ready : false,
		reset : true,

		led : {
			green : {
				flash : false,
				solid : false,
			},

			red : {
				flash : false,
				solid : false,
			},

			yellow : {
				flash : false,
				solid : false,
			},
		},
	},

	temperature : require('status-temperature-default').apply(),
	vehicle     : require('status-vehicle-default').apply(),
	vid         : require('status-vid-default').apply(),
	weather     : require('status-weather-default').apply(),

	windows : {
		front_left  : null,
		front_right : null,
		rear_left   : null,
		rear_right  : null,
		roof        : null,

		closed : null,
		opened : null,
	},
};


module.exports = status_object;
