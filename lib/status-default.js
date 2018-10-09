let status_object = {
	abg : {
		ready : false,
		reset : true,
	},

	ahl : {
		ready : false,
		reset : true,
	},

	anzv : {
		ready : false,
		reset : true,
	},

	asc : {
		ready : false,
		reset : true,
	},

	asst : {
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

	bluetooth : {
		adapter : {
			class        : null,
			discoverable : false,
			discovering  : false,
			name         : null,
			path         : null,
			powered      : false,
			service      : null,
		},

		device : {
			connected        : false,
			modalias         : null,
			name             : null,
			paired           : false,
			player           : null,
			position         : 0,
			rssi             : 0,
			service          : null,
			servicesresolved : false,
			status           : null,
			track            : null,
			trusted          : false,
			type             : null,

			paths : {
				main   : null,
				player : null,
			},
		},

		media : {
			album          : null,
			artist         : null,
			duration       : 0,
			genre          : null,
			item           : null,
			numberoftracks : null,
			title          : null,
			tracknumber    : 0,
		},
	},

	ccm : {
		ready : false,
		reset : true,
	},

	cdc : {
		ready : false,
		reset : true,
	},

	cdcd : {
		ready : false,
		reset : true,
	},

	cic1 : {
		ready        : false,
		request_sent : false,
		reset        : true,
	},

	cid : {
		ready : false,
		reset : true,
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

	con1 : {
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

	csu : {
		ready : false,
		reset : true,
	},

	cvm : {
		ready : false,
		reset : true,
	},

	dia : {
		ready : false,
		reset : true,
	},

	dme : {
		ready : false,
		reset : true,
	},

	dme1 : {
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

	dsp : {
		echo      : null,
		m_audio   : null,
		mode      : null,
		ready     : false,
		reset     : true,
		room_size : null,
		eq        : {
			band0 : null,
			band1 : null,
			band2 : null,
			band3 : null,
			band4 : null,
			band5 : null,
			band6 : null,
		},
	},

	dspc : {
		ready : false,
		reset : true,
	},

	egs : {
		ready : false,
		reset : true,
	},

	ehc : {
		ready : false,
		reset : true,
	},

	ekm : {
		ready : false,
		reset : true,
	},

	ekp : {
		ready : false,
		reset : true,
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
	},

	ews : {
		ready : false,
		reset : true,
	},

	fbzv : {
		ready : false,
		reset : true,
	},

	fem1 : {
		backlight : {
			real  : 253,
			value : 255,
		},
	},

	fhk : {
		ready : false,
		reset : true,
	},

	fid : {
		ready : false,
		reset : true,
	},

	fmbt : {
		ready : false,
		reset : true,
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

	gr : {
		ready : false,
		reset : true,
	},

	gt : {
		ready : false,
		reset : true,

		lcd : {
			aspect_ratio : null,
			on           : false,
			refresh_rate : 0,
			zoom         : false,
			source_name  : null,

			source : {
				gt   : false,
				navj : false,
				tv   : false,
			},
		},
	},

	gtf : {
		ready : false,
		reset : true,
	},

	hac : {
		ready : false,
		reset : true,
	},

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

	hkm : {
		ready : false,
		reset : true,
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

	iris : {
		ready : false,
		reset : true,
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

	lcm : {
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
			terminal_30        : 0,
			turn_signal_switch : 0,
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
	},

	lights : {
		all_off        : false,
		brake          : false,
		hazard         : false,
		highbeam       : false,
		interior       : false,
		lowbeam        : false,
		reverse        : false,
		welcome_lights : false,

		auto : {
			active           : false,
			lowbeam          : false,
			night_percentage : 100,
			reason           : null,
		},

		turn : {
			comfort_cool    : true,
			depress_elapsed : 0,
			fast            : false,
			sync            : false,

			left : {
				active  : false,
				comfort : false,
				depress : 0,
			},

			right : {
				active  : false,
				comfort : false,
				depress : 0,
			},
		},

		fog : {
			front : false,
			rear  : false,
		},

		standing : {
			front : false,
			rear  : false,
		},

		trailer : {
			fog      : false,
			reverse  : false,
			standing : false,
		},

		faulty : {
			all_ok        : false,
			highbeam      : false,
			license_plate : false,
			reverse       : false,
			trailer       : false,

			brake : {
				left  : false,
				right : false,
			},

			fog : {
				front : false,
				rear  : false,
			},

			lowbeam : {
				both  : false,
				left  : false,
				right : false,
			},

			standing : {
				front : false,

				rear : {
					left  : false,
					right : false,
				},
			},

			turn : {
				left  : false,
				right : false,
			},
		},
	},

	lws : {
		ready : false,
		reset : true,
	},

	mfl : {
		ready : false,
		reset : true,

		last : {
			action : null,
			button : null,
		},
	},

	mid : {
		ready : false,
		reset : true,

		text_left  : 'node-bmw',
		text_right : 'node-bmw',

		menu : {
			button_1  : 'Pair',
			button_2  : 'Unpa',
			button_3  : 'Conn',
			button_4  : 'Dscn',
			button_5  : 'Back',
			button_6  : 'Next',
			button_7  : 'Paus',
			button_8  : 'Play',
			button_9  : 'Rpt',
			button_10 : 'Shf',
			button_11 : 'AL-',
			button_12 : 'AL+',
		},
	},

	mid1 : {
		ready : false,
		reset : true,
	},

	mm3 : {
		ready : false,
		reset : true,
	},

	mml : {
		ready : false,
		reset : true,
	},

	mmr : {
		ready : false,
		reset : true,
	},

	nav : {
		ready : false,
		reset : true,
	},

	navc : {
		ready : false,
		reset : true,
	},

	nave : {
		ready : false,
		reset : true,
	},

	navj : {
		ready : false,
		reset : true,
	},

	nbt1 : {
		ready : false,
		reset : true,
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

	pic : {
		ready : false,
		reset : true,
	},

	power : {
		active : false,

		waiting : {
			doors : {
				closed : false,
				open   : false,
			},

			ignition : {
				off : false,
				on  : true,
			},
		},
	},

	rad : {
		ready : false,
		reset : true,

		balance : 0,
		bass    : 0,
		dsp0    : 0,
		dsp1    : 0,
		fader   : 0,
		treble  : 0,

		source      : 0,
		source_name : 'off',
	},

	rcc : {
		ready : false,
		reset : true,
	},

	rcsc : {
		ready : false,
		reset : true,
	},

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

	sdrs : {
		ready : false,
		reset : true,
	},

	server : {
		connected    : false,
		connecting   : false,
		latency      : 0,
		reconnecting : false,

		interfaces : {
			can0   : false,
			can1   : false,
			daemon : false,
			dbus   : false,
			ibus   : false,
			kbus   : false,
			lcd    : false,
		},
	},

	ses : {
		ready : false,
		reset : true,
	},

	shd : {
		ready : false,
		reset : true,
	},

	sm : {
		ready : false,
		reset : true,
	},

	smad : {
		ready : false,
		reset : true,
	},

	sor : {
		ready : false,
		reset : true,
	},

	sth : {
		ready : false,
		reset : true,
	},

	system : {
		intf : app_intf,
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

	tcu : {
		ready : false,
		reset : true,
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

	vid : {
		ready : false,
		reset : true,

		lcd : {
			aspect_ratio : null,
			on           : false,
			refresh_rate : 0,
			zoom         : false,

			source_name : null,
			source      : {
				gt   : false,
				navj : false,
				tv   : false,
			},
		},
	},

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
