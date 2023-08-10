/* eslint key-spacing :  */

const convert = require('node-unit-conversion');


// I should look into extending object classes and using Prototype for crap like this

// Celcius to Fahrenheit wrapped in Math.ceil()
function c2f(deg_c) {
	return Math.ceil(convert(deg_c).from('celsius').to('fahrenheit'));
}

// Horsepower = ((torque * RPM) / 5252)
function tq2hp(torque) {
	return Math.round((torque * status.engine.rpm) / 5252);
}


// This is dangerous and awesome if you can see what it does
function encode_316(rpm = 10000) {
	// Bounce if can0 is not enabled
	if (config.intf[config.dme.can_intf].enabled !== true) return;

	const rpm_orig = rpm;

	rpm = Math.floor(rpm * 6.4);

	const lsb = rpm        & 0xFF || 0; // LSB
	const msb = (rpm >> 8) & 0xFF || 0; // MSB

	const msg = Buffer.from([ 0x05, 0x16, lsb, msb, 0x16, 0x18, 0x00, 0x16 ]);

	const count = 500;

	// Send packets
	for (let i = 0; i < count; i++) {
		setTimeout(() => {
			bus.data.send({
				bus  : config.dme.can_intf,
				id   : 0x316,
				data : msg,
			});
		}, (i / 75));
	}

	log.module(`Sent ${count}x encoded CANBUS packets, ARBID 0x316, with RPM : ${rpm_orig}`);
}


// CAN ARBID 0x316 (DME1)
//
// byte 0, bit 0 : Something is pushed here, but I'm having a hard time tracing what it is. Appears it would always be 1 if everything is running normally
// byte 0, bit 1 : ??
// byte 0, bit 2 : 1 if DSC OK
// byte 0, bit 3 : 1 if SMG (on this DME, I guess MS45 is different)
// byte 0, bit 4 : md_st_eingriff (torque intervention status) bit 0
// byte 0, bit 5 : md_st_eingriff (torque intervention status) bit 1
// byte 0, bit 6 : AC clutch engaged
// byte 0, bit 7 : MAF error
//
// byte 1 : md_ind_ne_ist  - current engine torque after interventions (in %)
// byte 2 : engine RPM LSB
// byte 3 : engine RPM MSB
// byte 4 : md_ind_ist     - current engine torque before interventions (in %)
// byte 5 : md_reib        - engine torque loss of consumers (alternator, ac, oil pump, etc) (in %)
// byte 6 : ??
// byte 7 : md_ind_lm_ist  - theoretical engine torque from air mass, excluding ignition angle (in %)
//
// Now (pre) parsed by bmwi/lib/intf-can.js
function parse_316(data) {
	data.value = 'AC clutch/Throttle/RPM';

	// Key message examples seen:
	//                      [ 0 1 2 3 4 5 6 7 ]
	// data.msg[0] = 0x04 : [ - - T - - - - - ]
	// data.msg[0] = 0x05 : [ T - T - - - - - ]
	// data.msg[0] = 0x15 : [ T - T - T - - - ]

	// This is not actually factual
	// const parse = {
	// 	vehicle : {
	// 		key : {
	// 			off       :  mask_0.b8,
	// 			accessory : !mask_0.b0 && mask_0.b2 && !mask_0.b4,
	// 			run       :  mask_0.b0 && mask_0.b2 && !mask_0.b4,
	// 			start     :  mask_0.b0 && mask_0.b2 &&  mask_0.b4,
	// 		},
	// 	},
	// };
	//
	// This is not actually factual
	// update.status('vehicle.key.off',       parse.key.off,       false);
	// update.status('vehicle.key.accessory', parse.key.accessory, false);
	// update.status('vehicle.key.run',       parse.key.run,       false);
	// update.status('vehicle.key.start',     parse.key.start,     false);

	return data;
}

// CAN ARBID 0x329 (DME2)
//
// byte 0 : ??
// byte 1 : coolant temp
// byte 2 : atmospheric pressure
//
// byte 3, bit 0      : clutch switch (0 = engaged, 1 = disengage/neutral)
// byte 3, bit 2      : Hardcoded to 1 (on MSS54, could be used on other DMEs)
// byte 3, bit 4      : possibly motor status (0 = on, 1 = off)
// byte 3, bits 5+6+7 : tank evap duty cycle?
//
// byte 4 : driver desired torque, relative (0x00 - 0xFE)
// byte 5 : throttle position               (0x00 - 0xFE)
//
// byte 6, bit 2 : kickdown switch depressed
// byte 6, bit 1 : brake light switch error
// byte 6, bit 0 : brake pedal depressed
//
// byte 7 : ??
function parse_329(data) {
	data.value = 'Temp/Brake pedal depressed/Throttle position';

	const parse = {
		engine : {
			throttle : {
				cruise : num.round2(data.msg[4] / 2.54),
				pedal  : num.round2(data.msg[5] / 2.54),
			},

			atmospheric_pressure : {
				hpa  : (data.msg[2] * 2) + 597,
				mmhg : null,
				psi  : null,
			},
		},

		// Skipping due to 0x720 ARBID broadcast
		// TODO: Add config value for this
		// temperature : {
		// 	coolant : {
		// 		c : Math.floor((data.msg[1] * 0.75) - 48),
		// 	},
		// },

		vehicle : {
			brake    : bitmask.test(data.msg[6], 0x01),
			clutch   : bitmask.test(data.msg[3], 0x01),
			kickdown : bitmask.test(data.msg[6], 0x04),

			cruise : {
				button : {
					// Something that forcibly disengages the cruise control (like pressing brake or clutch)
					deactivator : bitmask.test(data.msg[3], 0x01),

					minus  : !bitmask.test(data.msg[3], 0x20) &&  bitmask.test(data.msg[3], 0x40),
					onoff  :  bitmask.test(data.msg[3], 0x80),
					plus   :  bitmask.test(data.msg[3], 0x20) && !bitmask.test(data.msg[3], 0x40),
					resume :  bitmask.test(data.msg[3], 0x20) &&  bitmask.test(data.msg[3], 0x40),
				},

				status : {
					activating : bitmask.test(data.msg[6], 0x20),
					active     : bitmask.test(data.msg[6], 0x08),
					resume     : bitmask.test(data.msg[6], 0x10),
					unk1       : bitmask.test(data.msg[6], 0x01),
				},
			},

			sport : {
				active : bitmask.test(data.msg[5], 0x02),
			},
		},
	};

	// Update status object
	update.status('engine.atmospheric_pressure.hpa', parse.engine.atmospheric_pressure.hpa);

	update.status('vehicle.cruise.button.deactivator', parse.vehicle.cruise.button.deactivator, false);
	update.status('vehicle.cruise.button.minus',       parse.vehicle.cruise.button.minus,       false);
	update.status('vehicle.cruise.button.onoff',       parse.vehicle.cruise.button.onoff,       false);
	update.status('vehicle.cruise.button.plus',        parse.vehicle.cruise.button.plus,        false);
	update.status('vehicle.cruise.button.resume',      parse.vehicle.cruise.button.resume,      false);

	update.status('vehicle.cruise.status.activating', parse.vehicle.cruise.status.activating, false);
	update.status('vehicle.cruise.status.active',     parse.vehicle.cruise.status.active,     false);
	update.status('vehicle.cruise.status.resume',     parse.vehicle.cruise.status.resume,     false);
	update.status('vehicle.cruise.status.unk1',       parse.vehicle.cruise.status.unk1,       false);

	update.status('engine.throttle.cruise', parse.engine.throttle.cruise);
	update.status('engine.throttle.pedal',  parse.engine.throttle.pedal);

	// update.status('vehicle.sport.active', parse.vehicle.sport.active, false);

	// Skipping due to 0x720 ARBID broadcast
	// TODO: Add config value for this
	// update.status('temperature.coolant.c', parse.temperature.coolant.c, false);

	update.status('vehicle.brake', parse.vehicle.brake, false);

	if (update.status('vehicle.clutch', parse.vehicle.clutch, false)) {
		if (parse.vehicle.clutch === false && status.engine.running === true) {
			update.status('vehicle.clutch_count', parseFloat((status.vehicle.clutch_count + 1)), false);
		}
	}

	return data;
}


// CAN ARBID 0x338
// MS45/MSD80/MSV80 only
//
// byte2, bit 0 : Sport on (request by SMG transmission)
// byte2, bit 1 : Sport off
// byte2, bit 2 : Sport on
// byte2, bit 3 : Sport error
function parse_338(data) {
	data.value = 'Sport mode status';

	// let parse = {
	// 	msg     : '0x338',
	// 	vehicle : {
	// 		sport : {
	// 			active : ((data.msg[2] === 0x00 || data.msg[2] === 0x02) && (data.msg[2] !== 0x01 && data.msg[2] !== 0x03)),
	// 			error  : data.msg[2] === 0x03,
	// 		},
	// 	},
	// };

	// update.status('vehicle.sport.active', parse.vehicle.sport.active, false);
	// update.status('vehicle.sport.error',  parse.vehicle.sport.error,  false);

	return data;
}

// CAN ARBID 0x545 (DME4)
//
// byte 0, bit 1 : Check engine
// byte 0, bit 3 : Cruise
// byte 0, bit 4 : EML
// byte 0, bit 7 : Check gas cap
//
// byte 1 : Fuel consumption LSB
// byte 2 : Fuel consumption MSB
//
// byte 3, bit 0 : Oil level error, if motortype = S62
// byte 3, bit 1 : Oil level warning (yellow)
// byte 3, bit 2 : Oil level error   (red)
// byte 3, bit 3 : Coolant overtemperature light

// byte 3, bit 4 : M3/M5 tachometer light
// byte 3, bit 5 : M3/M5 tachometer light
// byte 3, bit 6 : M3/M5 tachometer light

// byte 4 : Oil temperature (ºC = X - 48)
//
// byte 5, bit 0 : Oil pressure light off
// byte 5, bit 1 :
// byte 5, bit 2 :
// byte 5, bit 3 : A/C switch
// byte 5, bit 4 : Alternator/battery light off
// byte 5, bit 5 :
// byte 5, bit 6 :
// byte 5, bit 7 :
//
// byte 6 : CSL oil level (format unclear)
//
// byte 7 : Possibly MSS54 TPM trigger
//
// Now partially (pre) parsed by bmwi/lib/intf-can.js
function parse_545(data) {
	data.value = 'CEL/Fuel cons/Overheat/Oil temp/Charging/Brake light switch/Cruise control';

	// TODO: Fuel consumption still eludes me

	// The amount of fuel being consumed isn't a flat number
	// It's the difference between two numbers factoring in the time between the time both numbers were received

	const consumption_current = (data.msg[2] << 8) + data.msg[1];

	const parse = {
		fuel : {
			consumption : consumption_current - DME.consumption.last.msg,
		},

		// Skipping due to 0x720 ARBID broadcast
		// TODO: Add config value for this
		// temperature : {
		// 	oil : {
		// 		c : data.msg[4] - 48,
		// 	},
		// },
	};

	// Update status object

	// Skipping due to 0x720 ARBID broadcast
	// TODO: Add config value for this
	// update.status('temperature.oil.c', parse.temperature.oil.c, false);

	// Update fuel consumption value if consumption process flag is true
	// if (process_consumption === true) update.status('fuel.consumption', Math.round((parse.fuel.consumption + status.fuel.consumption) / 2));
	if (consumption_current !== DME.consumption.last.msg) {
		update.status('fuel.consumption', parse.fuel.consumption);
	}

	// Store 'last' fuel consumption value for comparison the next go-around
	DME.consumption.last.msg   = consumption_current;
	DME.consumption.last.value = parse.fuel.consumption;

	return data;
}

function parse_610(data) {
	data.value = 'VIN/info';

	return data;
}


// byte 0 : Odometer LSB
// byte 1 : Odometer MSB
// byte 2 : Fuel level
// byte 3 : Running clock LSB
// byte 4 : Running clock MSB
//
// Running clock = minutes since last time battery power was lost
//
// This is actually sent by IKE
function parse_613(data) {
	data.value = 'Odometer/Running clock/Fuel level [0x615 ACK]';

	const parse = {
		vehicle : {
			odometer : {
				km : ((data.msg[1] << 8) + data.msg[0]) * 10,
			},

			running_clock : ((data.msg[4] << 8) + data.msg[3]),
		},

		// Looks bad, I should feel bad
		fuel : {
			level  : null,
			liters : (data.msg[2] >= 0x80) && data.msg[2] - 0x80 || data.msg[2],
		},
	};


	// Calculate fuel level
	parse.fuel.level = Math.floor((parse.fuel.liters / config.fuel.liters_max) * 100);
	if (parse.fuel.level < 0)   parse.fuel.level = 0;
	if (parse.fuel.level > 100) parse.fuel.level = 100;

	// Update status object
	update.status('fuel.level',  parse.fuel.level, false);
	update.status('fuel.liters', parse.fuel.liters);

	update.status('vehicle.odometer.km', parse.vehicle.odometer.km);

	update.status('vehicle.running_clock', parse.vehicle.running_clock, false);

	return data;
}

// ARBID: 0x615 sent from the instrument cluster
function parse_615(data) {
	data.value = 'A/C request/Outside air temp/Parking brake/door contacts';

	// byte 0 : AC signal, 0x80 when on, AC torque in bits 0-4 (value can be between 0x00 and 0x1F; unit is Nm). Bits 5 and 6 are unknown
	//
	// byte 1, bit 0 : ??
	// byte 1, bit 1 : ??
	// byte 1, bit 2 : headlights/parking lights on
	// byte 1, bit 3 : ??
	// byte 1, bit 4 : AC Fan-speed request
	// byte 1, bit 5 : AC Fan-speed request
	// byte 1, bit 6 : AC Fan-speed request
	// byte 1, bit 7 : AC Fan-speed request
	//
	// byte 3 : Outside air temperature
	//
	// byte 4, bit 0 : Driver door opened
	// byte 4, bit 1 : Handbrake engaged
	// byte 4, bit 2 : ??
	// byte 4, bit 3 : ??
	// byte 4, bit 4 : ??
	// byte 4, bit 5 : ??
	// byte 4, bit 6 : ??
	// byte 4, bit 7 : ??
	//
	// byte 5, bit 0 : ??
	// byte 5, bit 1 : Left turn signal
	// byte 5, bit 2 : Right turn signal
	// byte 5, bit 3 : CAN_EKP_CRASH
	// byte 5, bit 4 : CAN_EKP_CRASH
	// byte 5, bit 5 : ??
	// byte 5, bit 6 : ??
	// byte 5, bit 7 : ??
	//
	// byte 6, bit 0 : ??
	// byte 6, bit 1 : ??
	// byte 6, bit 2 : ??
	// byte 6, bit 3 : ??
	// byte 6, bit 4 : ??
	// byte 6, bit 5 : ??
	// byte 6, bit 6 : ??
	// byte 6, bit 7 : ??
	//
	// byte 7, bit 0 : ??
	// byte 7, bit 1 : Key information available
	// byte 7, bit 2 : Key number (00 = Key 1, 01 = Key 2, 10 = Key 3, 11 = Key 4)
	// byte 7, bit 3 : Key number (00 = Key 1, 01 = Key 2, 10 = Key 3, 11 = Key 4)
	// byte 7, bit 4 : ??
	// byte 7, bit 5 : ??
	// byte 7, bit 6 : ??
	// byte 7, bit 7 : ??

	const parse = {
		ac : {
			request : data.msg[0],
			torque  : (data.msg[0] >= 0x80) && data.msg[0] - 0x80 || data.msg[0],
		},

		temperature : {
			exterior : {
				c : (data.msg[3] >= 0x80) && data.msg[3] - 0x80 || data.msg[3],
			},
		},

		vehicle : {
			handbrake : bitmask.test(data.msg[4], 0x02),
		},
	};

	// Round temperature values
	parse.temperature.exterior.c = num.round2(parse.temperature.exterior.c, 1);

	// Update status object
	update.status('engine.ac.request', parse.ac.request, false);
	update.status('engine.ac.torque',  parse.ac.torque,  false);

	update.status('temperature.exterior.c', parse.temperature.exterior.c, false);

	update.status('vehicle.handbrake', parse.vehicle.handbrake, false);

	return data;
}


// ARBID: 0x710 sent from MSS5x on secondary CANBUS - connector X60002 at pins 21 (low) and 22 (high)
//
// bit0 bit1 bit2 bit3 bit4 bit5 bit6 bit7
// 0x01 0x02 0x04 0x08 0x10 0x20 0x40 0x80
//
//
// byte 0 : engine RPM LSB
// byte 1 : engine RPM MSB
// byte 2 : ??
// byte 3 : ??
// byte 4 - throttle pedal?
// byte 5 - throttle pedal?
//
// byte 6, bit 0 - 0x01 - when key in run position, before starting
// byte 6, bit 1 - 0x02 - ?
// byte 6, bit 2 - 0x04 - running, in fuel cut
// byte 6, bit 3 - 0x08 - running, fueling active
// byte 6, bit 4 - 0x10 - running, WOT or near WOT
// byte 6, bit 5 - 0x20 - when key switched to acc or off, after being in run
// byte 6, bit 6 - 0x40 - right before full shutdown, after key switched to off for ~10 sec
//
// byte 7 - throttle actual? something additional too
//
// Example : [ 0x2B, 0x47, 0x1D, 0x00, 0x07, 0x04, 0x00, 0x37 ]
function parse_710(data) {
	// Now (pre) parsed by bmwi/lib/intf-can.js
	data.value = 'RPM/fueling/WOT/throttle';
	return data;
}


// ARBID: 0x720 sent from MSS5x on secondary CANBUS - connector X60002 at pins 21 (low) and 22 (high)
// byte 0 : coolant temp
// byte 1 : intake temp
// byte 2 : exhaust gas temp
// byte 3 : oil temp
// byte 4 : voltage * 10
// byte 5 : vehicle speed MSB[??]
// byte 6 : vehicle speed LSB[??]
// byte 7 : fuel pump duty cycle
//
// Example : [ 0x40, 0x4A, 0x03, 0x3E, 0x7C, 0x00, 0x00, 0x00 ]
function parse_720(data) {
	// Now (pre) parsed by bmwi/lib/intf-can.js
	data.value = 'Coolant temp/Intake air temp/Exhaust gas temp/Oil temp/Voltage/Vehicle speed/Fuel pump duty';
	return data;
}


function parse_out_low(data) {
	if (data.dst === null || typeof data.dst === 'undefined') {
		data.dst = {
			id   : 0x12,
			name : 'DME',
		};
	}

	if (data.msg[0] === null || typeof data.msg[0] === 'undefined') {
		data.msg = [ 0xFF ];
	}

	return data;
}


// Parse data sent from module
function parse_out(data) {
	data.command = 'bro';

	// DBUS/IBUS/KBUS data - not CAN
	switch (data.bus) {
		case 'ibus' :
		case 'dbus' :
		case 'kbus' : return parse_out_low(data);
	}

	// CAN data
	switch (data.src.id) {
		case 0x316 : return parse_316(data);
		case 0x329 : return parse_329(data);
		case 0x338 : return parse_338(data);
		case 0x545 : return parse_545(data);
		case 0x610 : return parse_610(data);
		case 0x613 : return parse_613(data);
		case 0x615 : return parse_615(data);
		case 0x710 : return parse_710(data);
		case 0x720 : return parse_720(data);

		default : data.value = data.src.id.toString(16);
	}

	return data;
}

// Request various things from DME
function request(value) {
	// Init variables
	let src;
	let cmd;

	switch (value) {
		case 'motor-values' : {
			src = 'DIA';
			cmd = [ 0xB8, 0x12, 0xF1, 0x03, 0x22, 0x40, 0x00 ];
			break;
		}

		default : return;
	}

	bus.data.send({
		src,
		dst : 'DME',
		msg : cmd,
	});
}


function init_listeners() {
	log.module('Initializing listeners');

	// If configured, send RPM 10000 on 0x316 on ignition in run
	update.on('status.engine.running', data => {
		switch (data.new) {
			case true : {
				// If the engine is newly running
				if (config.ike.sweep === true) encode_316(10000);
				update.status('engine.start_time_last', Date.now(), false);
			}
		}
	});

	// Reset torque output values when ignition not in run
	update.on('status.vehicle.ignition', data => {
		if (data.new === 'run') return;

		// Reset torque values
		const keys = [ 'after_interventions', 'before_interventions', 'loss', 'output' ];
		for (const key of keys) update.status(`engine.torque.${key}`, 0);
	});


	// Update purely calculated values when original value changes
	update.on('status.temperature.coolant.c',  data => { update.status('temperature.coolant.f',  c2f(data.new)); });
	update.on('status.temperature.exhaust.c',  data => { update.status('temperature.exhaust.f',  c2f(data.new)); });
	update.on('status.temperature.exterior.c', data => { update.status('temperature.exterior.f', c2f(data.new)); });
	update.on('status.temperature.intake.c',   data => { update.status('temperature.intake.f',   c2f(data.new)); });
	update.on('status.temperature.oil.c',      data => { update.status('temperature.oil.f',      c2f(data.new)); });


	// Update fuel pump % value when fuel pump duty value changes
	update.on('status.fuel.pump.duty', data => {
		update.status('fuel.pump.percent', num.floor2(data.new / 2.55));
	});

	// Calculate and update mmhg and psi atmospheric pressure values from hpa
	update.on('status.engine.atmospheric_pressure.hpa', data => {
		update.status('engine.atmospheric_pressure.mmhg', num.round2(data.new * 0.75006157818041));
		update.status('engine.atmospheric_pressure.psi',  num.round2(data.new * 0.01450377380072));
	});

	// Calculate and update odometer value in miles
	update.on('status.vehicle.odometer.km', data => {
		update.status('vehicle.odometer.mi', Math.floor(convert(data.new).from('kilometre').to('us mile')), false);
	});

	// Calculate and update torque value
	update.on('status.engine.torque.after_interventions', data => {
		update.status('engine.torque_value.after_interventions', Math.round(config.engine.torque_max * (data.new / 100)));
	});
	update.on('status.engine.torque.before_interventions', data => {
		update.status('engine.torque_value.before_interventions', Math.round(config.engine.torque_max * (data.new / 100)));
	});
	update.on('status.engine.torque.loss', data => {
		update.status('engine.torque_value.loss', Math.round(config.engine.torque_max * (data.new / 100)));
	});
	update.on('status.engine.torque.output', data => {
		update.status('engine.torque_value.output', Math.round(config.engine.torque_max * (data.new / 100)));
	});

	// Calculate and update horsepower value
	// Horsepower = (torque * RPM)/5252
	update.on('status.engine.torque_value.after_interventions', data => {
		update.status('engine.horsepower.after_interventions', tq2hp(data.new));
	});
	update.on('status.engine.torque_value.before_interventions', data => {
		update.status('engine.horsepower.before_interventions', tq2hp(data.new));
	});
	update.on('status.engine.torque_value.loss', data => {
		update.status('engine.horsepower.loss', tq2hp(data.new));
	});
	update.on('status.engine.torque_value.output', data => {
		update.status('engine.horsepower.output', tq2hp(data.new));
	});


	log.module('Initialized listeners');
}


module.exports = {
	// Variables
	consumption : {
		last : {
			msg   : 0,
			value : 0,
		},
	},

	// Functions
	encode_316,

	init_listeners,
	parse_out,
	request,
};
