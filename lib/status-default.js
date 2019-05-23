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
		open   : null,
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

	engine : {
		ac_clutch     : false,
		ac_request    : null,
		aux_fan_speed : null,
		running       : false,
		speed         : null,

		atmospheric_pressure : {
			mbar : 0,
			mmhg : 0,
			psi  : 0,
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

		horsepower : {
			after_interventions  : 0,
			before_interventions : 0,

			loss   : 0,
			output : 0,
		},
	},

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

	obc : {
		arrival      : null,
		aux_heat_led : null,
		code         : null,
		date         : null,
		distance     : null,
		interim      : null,
		limit        : null,
		stopwatch    : null,
		time         : null,
		timer        : null,

		aux_heat_timer : {
			t1 : null,
			t2 : null,
		},

		average_speed : {
			kmh : 0,
			mph : 0,
		},

		consumption : {
			c1 : {
				l100 : 0,
				mpg  : 0,
			},

			c2 : {
				l100 : 0,
				mpg  : 0,
			},
		},

		range : {
			km : 0,
			mi : 0,
		},
	},

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

	system : {
		intf : app_intf || null,
		type : app_intf || null,

		up : 0,

		temperature : 0,

		cpu : {
			arch  : null,
			count : 0,

			load     : [ 0, 0, 0 ],
			load_pct : 0,

			model : null,
			speed : 0,
		},

		host : {
			full  : null,
			short : null,
		},

		memory : {
			free     : 0,
			free_pct : 0,

			total : 0,
		},

		os : {
			platform : null,
			release  : null,
			type     : null,
		},
	},

	szm : {
		ready : false,
		reset : true,

		button : {
			active : {
				backrest : {
					driver : {
						state : null,
					},

					passenger : {
						state : null,
					},
				},

				seat : {
					driver : {
						state : null,
					},

					passenger : {
						state : null,
					},
				},
			},

			pdc : {
				state : null,
			},

			rdc : {
				state : null,
			},
		},

		seats : {
			front : {
				driver : {
					active      : null,
					heating     : null,
					ventilation : null,
				},

				passenger : {
					active      : null,
					heating     : null,
					ventilation : null,
				},
			},

			rear : {
				driver : {
					active      : null,
					heating     : null,
					ventilation : null,
				},

				passenger : {
					active      : null,
					heating     : null,
					ventilation : null,
				},
			},
		},
	},

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

	temperature : {
		coolant : {
			c : 0,
			f : 0,
		},

		exhaust : {
			c : 0,
			f : 0,
		},

		exterior : {
			c : 0,
			f : 0,

			obc : {
				c : 0,
				f : 0,
			},
		},

		intake : {
			c : 0,
			f : 0,
		},

		oil : {
			c : 0,
			f : 0,
		},
	},

	vehicle : {
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
	},

	vid : require('status-vid-default').apply(),

	weather : {
		last_refresh : 0,
		latitude     : 0,
		longitude    : 0,
		offset       : 0,
		timezone     : null,

		currently : {
			apparentTemperature  : 0,
			cloudCover           : 0,
			dewPoint             : 0,
			humidity             : 0,
			icon                 : null,
			nearestStormBearing  : null,
			nearestStormDistance : 0,
			ozone                : null,
			precipIntensity      : 0,
			precipProbability    : 0,
			pressure             : 0,
			summary              : null,
			temperature          : 0,
			time                 : 0,
			uvIndex              : 0,
			visibility           : 0,
			windBearing          : null,
			windGust             : 0,
			windSpeed            : 0,
		},

		flags : {
			'isd-stations' : [],
			sources        : [],
			units          : null,
		},
	},

	windows : {
		front_left  : null,
		front_right : null,
		rear_left   : null,
		rear_right  : null,
		roof        : null,

		closed : null,
		open   : null,
	},
};

module.exports = status_object;
