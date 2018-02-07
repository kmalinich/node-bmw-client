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
		last : {
			action : null,
			button : null,
		},
		ready : false,
		reset : true,
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
			connected : false,
			modalias  : null,
			name      : null,
			paired    : false,
			paths     : {
				main   : null,
				player : null,
			},
			player           : null,
			position         : null,
			rssi             : null,
			service          : null,
			servicesresolved : false,
			status           : null,
			track            : null,
			trusted          : false,
			type             : null,
		},
		media : {
			album          : null,
			artist         : null,
			duration       : null,
			genre          : null,
			item           : null,
			numberoftracks : null,
			title          : null,
			tracknumber    : null,
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
		network       : null,
		language      : null,
		since_service : {
			days   : null,
			liters : null,
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
			absolute   : null,
			direction  : null,
			horizontal : false,
			last_msg   : null,
			relative   : 0xFF,
			volume     : false,
		},
		last : {
			heartbeat : null,
			button    : {
				button : null,
			},
			string : null,
		},
		backlight      : 255,
		backlight_real : 253,
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
		ready  : false,
		reset  : true,
		status : {
			check_engine  : false,
			check_gas_cap : false,
			cruise        : false,
			eml           : false,
		},
	},
	doors : {
		hood        : null,
		trunk       : null,
		front_left  : null,
		front_right : null,
		rear_left   : null,
		rear_right  : null,
		sealed      : false,
	},
	dsp : {
		m_audio   : null,
		mode      : null,
		ready     : false,
		reset     : true,
		reverb    : null,
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
		ac_request           : null,
		ac_clutch            : false,
		atmospheric_pressure : {
			mbar : null,
			mmhg : null,
			psi  : null,
		},
		aux_fan_speed : null,
		running       : false,
		speed         : null,
		throttle      : {
			cruise : null,
			pedal  : null,
		},
		torque : {
			after_interventions  : null,
			before_interventions : null,
			loss                 : null,
			output               : null,
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
	},
	gm : {
		ready  : false,
		reset  : true,
		wipers : {
			speed       : null,
			sensitivity : null,
		},
	},
	gpio : {
		relay_1 : 1,
		relay_2 : 1,
	},
	gr : {
		ready : false,
		reset : true,
	},
	gt : {
		ready : false,
		reset : true,
		lcd   : {
			aspect_ratio : null,
			on           : false,
			refresh_rate : null,
			zoom         : false,
			source_name  : null,
			source       : {
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
			routing       : {
				new : null,
				old : null,
			},
		},
		rpi : {
			group          : null,
			mode           : null,
			power          : null,
			power_override : false,
			progressive    : null,
			ratio          : null,
			refreshrate    : null,
			resolution     : null,
			state          : null,
			tty            : null,
		},
	},
	hkm : {
		ready : false,
		reset : true,
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
		immobiliser_on        : null,
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
		key_number  : null,
		key_present : null,
	},
	iris : {
		ready : false,
		reset : true,
	},
	kodi : {
		volume : {
			level : null,
			muted : null,
		},
		player : {
			status : null,
			album  : null,
			artist : null,
			id     : null,
			title  : null,
			type   : null,
			time   : {
				minutes : null,
				seconds : null,
			},
		},
	},
	lcm : {
		ready         : false,
		reset         : true,
		police_lights : {
			ok     : false,
			on     : false,
			counts : {
				loop : 0,
				main : 0,
			},
		},
		io    : [],
		clamp : {
			c_15  : null,
			c_30a : null,
			c_30b : null,
			c_r   : null,
		},
		dimmer : {
			value_1 : null,
			value_2 : null,
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
			flash_to_pass      : null,
			terminal_30        : null,
			turn_signal_switch : null,
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
		auto : {
			active  : false,
			lowbeam : false,
			reason  : null,
		},
		turn : {
			left : {
				active  : false,
				comfort : false,
				depress : null,
			},
			right : {
				active  : false,
				comfort : false,
				depress : null,
			},
			comfort_cool    : true,
			depress_elapsed : null,
			fast            : false,
			sync            : false,
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
		all_off        : false,
		brake          : false,
		hazard         : false,
		highbeam       : false,
		interior       : false,
		lowbeam        : false,
		reverse        : false,
		welcome_lights : false,
		faulty         : {
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
				rear : {
					left  : false,
					right : false,
				},
				front : false,
			},
			turn : {
				left  : false,
				right : false,
			},
			all_ok        : false,
			highbeam      : false,
			license_plate : false,
			reverse       : false,
			trailer       : false,
		},
	},
	lws : {
		ready : false,
		reset : true,
	},
	mfl : {
		last : {
			action : null,
			button : null,
		},
		ready : false,
		reset : true,
	},
	mid : {
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
		ready      : false,
		reset      : true,
		text_left  : 'node-bmw',
		text_right : 'node-bmw',
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
	obc : {
		arrival        : null,
		aux_heat_led   : null,
		code           : null,
		date           : null,
		distance       : null,
		interim        : null,
		limit          : null,
		stopwatch      : null,
		time           : null,
		timer          : null,
		aux_heat_timer : {
			t1 : null,
			t2 : null,
		},
		average_speed : {
			kmh : null,
			mph : null,
		},
		consumption : {
			c1 : {
				l100 : null,
				mpg  : null,
			},
			c2 : {
				l100 : null,
				mpg  : null,
			},
		},
		range : {
			km : null,
			mi : null,
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
	rad : {
		balance     : 0,
		bass        : 0,
		dsp0        : 0,
		dsp1        : 0,
		fader       : 0,
		ready       : false,
		reset       : true,
		source      : 0,
		source_name : 'off',
		treble      : 0,
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
		interval : {
			wipe : {
				headlight : {
					v1 : null,
					v2 : null,
				},
			},
		},
		light : {
			intensity : null,
			lights    : null,
			reason    : null,
		},
		ready        : false,
		reset        : true,
		wiper_status : null,
	},
	sdrs : {
		ready : false,
		reset : true,
	},
	server : {
		connected  : false,
		connecting : false,
		interfaces : {
			can0   : false,
			can1   : false,
			daemon : false,
			dbus   : false,
			ibus   : false,
			kbus   : false,
			lcd    : false,
		},
		latency      : 0,
		reconnecting : false,
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
		temperature : null,
		intf        : null,
		up          : null,
		host        : {
			full  : null,
			short : null,
		},
		cpu : {
			arch  : null,
			load  : null,
			model : null,
			speed : null,
		},
		memory : {
			free  : null,
			total : null,
		},
		os : {
			platform : null,
			type     : null,
			release  : null,
		},
	},
	tcu : {
		ready : false,
		reset : true,
	},
	tel : {
		ready : false,
		reset : true,
		led   : {
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
			c : null,
			f : null,
		},
		exterior : {
			c   : null,
			f   : null,
			obc : {
				c : null,
				f : null,
			},
		},
		intake : {
			c : null,
			f : null,
		},
		oil : {
			c : null,
			f : null,
		},
	},
	vehicle : {
		brake  : false,
		clutch : false,
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
			active             : true,
			torque_reduction_1 : null,
			torque_reduction_2 : null,
		},
		handbrake      : false,
		ignition       : 'off',
		ignition_level : 0,
		locked         : null,
		odometer       : {
			km : null,
			mi : null,
		},
		reverse : false,
		sealed  : false,
		speed   : {
			kmh : null,
			mph : null,
		},
		sport : {
			active : false,
			error  : false,
		},
		steering : {
			angle    : null,
			velocity : null,
		},
		vin         : null,
		wheel_speed : {
			front : {
				left  : null,
				right : null,
			},
			rear : {
				left  : null,
				right : null,
			},
		},
	},
	vid : {
		ready : false,
		reset : true,
		lcd   : {
			aspect_ratio : null,
			on           : false,
			refresh_rate : null,
			zoom         : false,
			source_name  : null,
			source       : {
				gt   : false,
				navj : false,
				tv   : false,
			},
		},
	},
	weather : {
		currently : {
			apparentTemperature  : null,
			cloudCover           : null,
			dewPoint             : null,
			humidity             : null,
			icon                 : null,
			nearestStormBearing  : null,
			nearestStormDistance : null,
			ozone                : null,
			precipIntensity      : null,
			precipProbability    : null,
			pressure             : null,
			summary              : null,
			temperature          : null,
			time                 : null,
			uvIndex              : null,
			visibility           : null,
			windBearing          : null,
			windGust             : null,
			windSpeed            : null,
		},
		flags : {
			'isd-stations' : [],
			sources        : [],
			units          : null,
		},
		last_refresh : null,
		latitude     : null,
		longitude    : null,
		offset       : null,
		timezone     : null,
	},
	windows : {
		front_left  : null,
		front_right : null,
		rear_left   : null,
		rear_right  : null,
		roof        : null,
		sealed      : false,
	},
};

module.exports = status_object;
