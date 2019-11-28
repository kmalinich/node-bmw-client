function get_status_auto() {
	const auto = {
		active           : false,
		lowbeam          : false,
		night_percentage : 100,
		reason           : null,
	};

	if (typeof status          !== 'object') return auto;
	if (typeof status.lcm      !== 'object') return auto;
	if (typeof status.lcm.auto !== 'object') return auto;

	if (typeof status.lcm.auto.lowbeam === 'boolean') auto.lowbeam = status.lcm.auto.lowbeam;
	if (typeof status.lcm.auto.reason  === 'string')  auto.reason  = status.lcm.auto.reason;

	return auto;
}


const voltage_default = {
	current : 2.5,
	minimum : 5,
	maximum : 0,
};

const voltage_default_lwr = {
	front : voltage_default,
	rear  : voltage_default,
};

const voltage_default_pot = {
	dimmer : voltage_default,
	lwr    : voltage_default,
};


function get_status_voltage_lwr_front() {
	const voltage = voltage_default;

	if (typeof status.lcm.voltage.lwr.front !== 'object') return voltage;

	if (typeof status.lcm.voltage.lwr.front.current === 'number') voltage.lwr.front.current = status.lcm.voltage.lwr.front.current;
	if (typeof status.lcm.voltage.lwr.front.minimum === 'number') voltage.lwr.front.minimum = status.lcm.voltage.lwr.front.minimum;
	if (typeof status.lcm.voltage.lwr.front.maximum === 'number') voltage.lwr.front.maximum = status.lcm.voltage.lwr.front.maximum;

	return voltage;
}

function get_status_voltage_lwr_rear() {
	const voltage = voltage_default;

	if (typeof status.lcm.voltage.lwr.rear !== 'object') return voltage;

	if (typeof status.lcm.voltage.lwr.rear.current === 'number') voltage.lwr.rear.current = status.lcm.voltage.lwr.rear.current;
	if (typeof status.lcm.voltage.lwr.rear.minimum === 'number') voltage.lwr.rear.minimum = status.lcm.voltage.lwr.rear.minimum;
	if (typeof status.lcm.voltage.lwr.rear.maximum === 'number') voltage.lwr.rear.maximum = status.lcm.voltage.lwr.rear.maximum;

	return voltage;
}


function get_status_voltage_pot_dimmer() {
	const voltage = voltage_default;

	if (typeof status.lcm.voltage.pot.dimmer !== 'object') return voltage;

	if (typeof status.lcm.voltage.pot.dimmer.current === 'number') voltage.pot.dimmer.current = status.lcm.voltage.pot.dimmer.current;
	if (typeof status.lcm.voltage.pot.dimmer.minimum === 'number') voltage.pot.dimmer.minimum = status.lcm.voltage.pot.dimmer.minimum;
	if (typeof status.lcm.voltage.pot.dimmer.maximum === 'number') voltage.pot.dimmer.maximum = status.lcm.voltage.pot.dimmer.maximum;

	return voltage;
}

function get_status_voltage_pot_lwr() {
	const voltage = voltage_default;

	if (typeof status.lcm.voltage.pot.lwr !== 'object') return voltage;

	if (typeof status.lcm.voltage.pot.lwr.current === 'number') voltage.pot.lwr.current = status.lcm.voltage.pot.lwr.current;
	if (typeof status.lcm.voltage.pot.lwr.minimum === 'number') voltage.pot.lwr.minimum = status.lcm.voltage.pot.lwr.minimum;
	if (typeof status.lcm.voltage.pot.lwr.maximum === 'number') voltage.pot.lwr.maximum = status.lcm.voltage.pot.lwr.maximum;

	return voltage;
}


function get_status_voltage_lwr() {
	const voltage = voltage_default_lwr;

	if (typeof status.lcm.voltage.lwr !== 'object') return voltage;

	voltage.front = get_status_voltage_lwr_front();
	voltage.rear  = get_status_voltage_lwr_rear();

	return voltage;
}

function get_status_voltage_pot() {
	const voltage = voltage_default_pot;

	if (typeof status.lcm.voltage.pot !== 'object') return voltage;

	voltage.dimmer = get_status_voltage_pot_dimmer();
	voltage.lwr    = get_status_voltage_pot_lwr();

	return voltage;
}


function get_status_voltage() {
	const voltage = {
		lwr : voltage_default_lwr,
		pot : voltage_default_pot,

		flash_to_pass      : 5,
		photo_cell         : 0,
		terminal_30        : 0,
		turn_signal_switch : 5,
	};

	if (typeof status             !== 'object') return voltage;
	if (typeof status.lcm         !== 'object') return voltage;
	if (typeof status.lcm.voltage !== 'object') return voltage;

	voltage.lwr = get_status_voltage_lwr();
	voltage.pot = get_status_voltage_pot();

	if (status.lcm.voltage.flash_to_pass      === 'number') voltage.flash_to_pass      = status.lcm.voltage.flash_to_pass;
	if (status.lcm.voltage.photo_cell         === 'number') voltage.photo_cell         = status.lcm.voltage.photo_cell;
	if (status.lcm.voltage.terminal_30        === 'number') voltage.terminal_30        = status.lcm.voltage.terminal_30;
	if (status.lcm.voltage.turn_signal_switch === 'number') voltage.turn_signal_switch = status.lcm.voltage.turn_signal_switch;
}


function apply() {
	const status_auto    = get_status_auto();
	const status_voltage = get_status_voltage();

	const layouts = [
		{ front : false, rear : false },
		{ left : false, right : false },
		{ left : false, right : false, both : false },
	];

	const layouts_front = [
		{ front_left : false, front_right : false },
	];

	const layouts_rear = [
		{ rear_left : false, rear_right : false },
	];


	const status_lcm_turn_side = {
		active  : false,
		comfort : false,
		depress : 0,
	};

	const status_lcm_turn = {
		comfort_cool    : true,
		depress_elapsed : 0,

		fast : false,
		sync : false,

		left  : status_lcm_turn_side,
		right : status_lcm_turn_side,
	};


	const status_lcm = {
		ready : false,
		reset : true,

		auto : status_auto,

		all_off  : false,
		brake    : false,
		hazard   : false,
		highbeam : false,
		lowbeam  : false,
		reverse  : false,
		welcome  : false,

		turn : status_lcm_turn,

		fog : layouts[0],

		standing : layouts[0],

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

			brake   : layouts[1],
			fog     : layouts[0],
			lowbeam : layouts[2],
			turn    : layouts[1],

			standing : {
				front : false,
				rear  : layouts[1],
			},
		},

		io : [
			0x81, 0xC0, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0xA7, 0x00, 0x00, 0x00, 0x00, 0x00, 0xE4,
			0x00, 0x00, 0x28, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00,
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

			highbeam : layouts_front[0],
			lowbeam  : layouts_front[0],

			led : {
				switch_hazard : false,
				switch_light  : false,
			},

			license : {
				rear_left  : false,
				rear_right : false,
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

		police : {
			ok : false,
			on : false,

			counts : {
				loop : 0,
				main : 0,
			},
		},

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

		voltage : status_voltage,
	};

	return status_lcm;
}


export default { apply };
