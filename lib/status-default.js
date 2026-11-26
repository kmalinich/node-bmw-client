/* eslint no-console       : 0 */
/* eslint no-global-assign : 0 */

const path = require('node:path');

app_intf = 'client';

const statusBluetoothDefault   = require(path.join(__dirname, 'status-bluetooth-default.js'));
const statusDSPDefault         = require(path.join(__dirname, 'status-dsp-default.js'));
const statusEngineDefault      = require(path.join(__dirname, 'status-engine-default.js'));
const statusLCMDefault         = require(path.join(__dirname, 'status-lcm-default.js'));
const statusLightsDefault      = require(path.join(__dirname, 'status-lights-default.js'));
const statusMIDDefault         = require(path.join(__dirname, 'status-mid-default.js'));
const statusOBCDefault         = require(path.join(__dirname, 'status-obc-default.js'));
const statusPowerDefault       = require(path.join(__dirname, 'status-power-default.js'));
const statusRADDefault         = require(path.join(__dirname, 'status-rad-default.js'));
const statusSZMDefault         = require(path.join(__dirname, 'status-szm-default.js'));
const statusServerDefault      = require(path.join(__dirname, 'status-server-default.js'));
const statusSystemDefault      = require(path.join(__dirname, 'status-system-default.js'));
const statusTemperatureDefault = require(path.join(__dirname, 'status-temperature-default.js'));
const statusVIDDefault         = require(path.join(__dirname, 'status-vid-default.js'));
const statusVehicleDefault     = require(path.join(__dirname, 'status-vehicle-default.js'));


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

	bluetooth : statusBluetoothDefault.apply(),

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
			ac_switch                     : false,
			battery_light                 : false,
			check_engine                  : false,
			check_fuel_cap                : false,
			coolant_overtemperature_light : false,
			cruise                        : false,
			eml                           : false,
			oil_level_error               : false,
			oil_level_error_s62           : false,
			oil_level_warning             : false,
			oil_pressure_light            : false,
			tachometer_light_0            : false,
			tachometer_light_1            : false,
			tachometer_light_2            : false,
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

	dsp : statusDSPDefault.apply(),

	dspc : {
		ready : false,
		reset : true,
	},

	egs : {
		gear : null,
	},

	engine : statusEngineDefault.apply(),

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

	gt : statusVIDDefault.apply(),

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

	lcm    : statusLCMDefault.apply(),
	lights : statusLightsDefault.apply(),

	mfl : {
		ready : false,
		reset : true,

		last : {
			action : null,
			button : null,
		},
	},

	mid : statusMIDDefault.apply(),

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

	obc : statusOBCDefault.apply(),

	pdc : {
		ready : false,
		reset : true,
	},

	power : statusPowerDefault.apply(),
	rad   : statusRADDefault.apply(),

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

	server : statusServerDefault.apply(),
	system : statusSystemDefault.apply(),
	szm    : statusSZMDefault.apply(),

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

	temperature : statusTemperatureDefault.apply(),
	vehicle     : statusVehicleDefault.apply(),
	vid         : statusVIDDefault.apply(),

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
