/* eslint no-console       : 0 */
/* eslint no-global-assign : 0 */

import bluetooth   from './status-bluetooth-default.js';
import dsp         from './status-dsp-default.js';
import engine      from './status-engine-default.js';
import lcm         from './status-lcm-default.js';
import mid         from './status-mid-default.js';
import obc         from './status-obc-default.js';
import power       from './status-power-default.js';
import rad         from './status-rad-default.js';
import server      from './status-server-default.js';
import system      from './status-system-default.js';
import szm         from './status-szm-default.js';
import temperature from './status-temperature-default.js';
import vehicle     from './status-vehicle-default.js';
import vid         from './status-vid-default.js';


const status_object = {
	abg : {
		ready : false,
		reset : true,
	},

	bmbt : {
		ready : false,
		reset : true,

		status : {
			cassette : 'off',
		},

		last : {
			action : null,
			button : null,
		},
	},

	bluetooth : bluetooth.apply(),

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
			ac_switch          : false,
			battery_light      : false,
			check_engine       : false,
			check_fuel_cap     : false,
			cruise             : false,
			eml                : false,
			oil_pressure_light : false,
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

	dsp : dsp.apply(),

	dspc : {
		ready : false,
		reset : true,
	},

	egs : {
		gear : null,
	},

	engine : engine.apply(),

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

		interior_lights : false,

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

	gt : {},

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
		ac_compressor : null,
		defroster     : null,

		ready : false,
		reset : true,
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

	lcm : lcm.apply(),

	mfl : {
		ready : false,
		reset : true,

		last : {
			action : null,
			button : null,
		},
	},

	mid : mid.apply(),

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

	obc : obc.apply(),

	pdc : {
		ready : false,
		reset : true,
	},

	power : power.apply(),
	rad   : rad.apply(),

	rdc : {
		ready : false,
		reset : true,
	},

	rls : {
		ready : false,
		reset : true,

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

<<<<<<< HEAD
	server : {
		sockets : {
			can0 : {
				connected    : false,
				connecting   : false,
				reconnecting : false,
			},
			can1 : {
				connected    : false,
				connecting   : false,
				reconnecting : false,
			},
			dbus : {
				connected    : false,
				connecting   : false,
				reconnecting : false,
			},
			ibus : {
				connected    : false,
				connecting   : false,
				reconnecting : false,
			},
			kbus : {
				connected    : false,
				connecting   : false,
				reconnecting : false,
			},
		},

		interfaces : {
			can0 : false,
			can1 : false,
			dbus : false,
			ibus : false,
			kbus : false,
		},
	},

	server : server.apply(),
	system : system.apply(),
	szm    : szm.apply(),

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

	temperature : temperature.apply(),
	vehicle     : vehicle.apply(),
	vid         : vid.apply(),

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

// Duplicate GT => VID (they have the same status layout)
status_object.gt = status_object.vid;


export default status_object;
