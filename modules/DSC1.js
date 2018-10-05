const convert = require('node-unit-conversion');

// Send 0x1A1 KCAN2 message for vehicle speed
// BE DE 4A 12 91
// - or -
// 00 00 4A 12 00
//
// B2 : Speed LSB
// B3 : Speed MSB

// Example:
// 124A (hex) = 4682 (dec) / 100 = 46.82 MPH
//
// (((18 * 256) + 74) / 100) = 46.82 MPH
//
// Input is in MPH
function encode_1a1(speed = 0) {
	speed = speed * 100;

	let lsb = speed        & 0xFF || 0; // LSB
	let msb = (speed >> 8) & 0xFF || 0; // MSB

	let msg = [ 0x00, 0x00, lsb, msb, 0x00 ];

	// Send packet
	bus.data.send({
		bus  : config.dsc1.can_intf,
		id   : 0x1A1,
		data : Buffer.from(msg),
	});
}

function parse_153(data) {
	// DSC off (DSC light on) (b0/b1)
	// 04 61 01 FF 00 FE FF 0
	// DSC on (DSC light off) (b0/b1)
	// 00 60 01 FF 00 FE FF 0C
	// ~5 sec on initial key in run
	// A4 61 01 FF 00 FE FF 0B
	//
	// B3 and B6 change during torque reduction
	let parse = {
		vehicle : {
			brake : bitmask.test(data.msg[1], 0x10),

			dsc : {
				active : !bitmask.test(data.msg[1], 0x01),

				torque_reduction_1 : data.msg[3] / 2.54,
				torque_reduction_2 : data.msg[6] / 2.54,
			},
		},
	};

	// Clean up torque reduction figures a bit
	if (parse.vehicle.dsc.torque_reduction_1 > 100) parse.vehicle.dsc.torque_reduction_1 = 100;
	if (parse.vehicle.dsc.torque_reduction_2 > 100) parse.vehicle.dsc.torque_reduction_2 = 100;
	if (parse.vehicle.dsc.torque_reduction_1 < 0)   parse.vehicle.dsc.torque_reduction_1 = 0;
	if (parse.vehicle.dsc.torque_reduction_2 < 0)   parse.vehicle.dsc.torque_reduction_2 = 0;

	// Apply maths
	parse.vehicle.dsc.torque_reduction_1 = parseFloat((100 - parse.vehicle.dsc.torque_reduction_1).toFixed(1));
	parse.vehicle.dsc.torque_reduction_2 = parseFloat((100 - parse.vehicle.dsc.torque_reduction_2).toFixed(1));

	// update.status('vehicle.brake',                  parse.vehicle.brake);
	update.status('vehicle.dsc.active',             parse.vehicle.dsc.active);
	update.status('vehicle.dsc.torque_reduction_1', parse.vehicle.dsc.torque_reduction_1);
	update.status('vehicle.dsc.torque_reduction_2', parse.vehicle.dsc.torque_reduction_2);
}

// Parse wheel speed LSB and MSB into kph value
function parse_wheel(byte0, byte1) {
	return (((byte0 & 0xFF) | ((byte1 & 0x0F) << 8)) / 16) - 2.75;
}

function parse_1f0(data) {
	let wheel_speed = {
		front : {
			left  : parse_wheel(data.msg[0], data.msg[1]),
			right : parse_wheel(data.msg[2], data.msg[3]),
		},

		rear : {
			left  : parse_wheel(data.msg[4], data.msg[5]),
			right : parse_wheel(data.msg[6], data.msg[7]),
		},
	};

	update.status('vehicle.wheel_speed.front.left',  wheel_speed.front.left,  false);
	update.status('vehicle.wheel_speed.front.right', wheel_speed.front.right, false);
	update.status('vehicle.wheel_speed.rear.left',   wheel_speed.rear.left,   false);
	update.status('vehicle.wheel_speed.rear.right',  wheel_speed.rear.right,  false);

	// Calculate vehicle speed from average of all 4 sensors
	let vehicle_speed_total = wheel_speed.front.left + wheel_speed.front.right + wheel_speed.rear.left + wheel_speed.rear.right;

	// Average all wheel speeds together and include accuracy offset multiplier
	// let vehicle_speed_kmh = Math.round((vehicle_speed_total / 4) * config.speedometer.offset);
	let vehicle_speed_kmh = Math.round(vehicle_speed_total / 4);

	// Calculate vehicle speed value in MPH
	let vehicle_speed_mph = Math.round(convert(vehicle_speed_kmh).from('kilometre').to('us mile'));

	if (update.status('vehicle.speed.kmh', vehicle_speed_kmh, false)) {
		if (config.translate.dsc === true) {
			// Forward this to CAN1
			encode_1a1(vehicle_speed_mph);
		}
	}

	update.status('vehicle.speed.mph', vehicle_speed_mph, false);
}

function parse_1f5(data) {
	let angle = 0;
	if (data.msg[1] > 127) {
		angle = -1 * (((data.msg[1] - 128) * 256) + data.msg[0]);
	}
	else {
		angle = (data.msg[1] * 256) + data.msg[0];
	}

	let velocity = 0;
	if (data.msg[3] > 127) {
		velocity = -1 * (((data.msg[3] - 128) * 256) + data.msg[2]);
	}
	else {
		velocity = (data.msg[3] * 256) + data.msg[2];
	}

	// 0.043393 : 3.75 turns, lock to lock (1350 degrees of total rotation)
	let steering_multiplier = 0.043393;

	let steering = {
		angle    : Math.round(angle    * steering_multiplier) * -1, // Thanks babe
		velocity : Math.round(velocity * steering_multiplier) * -1,
	};

	update.status('vehicle.steering.angle',    steering.angle,    false);
	update.status('vehicle.steering.velocity', steering.velocity, false);
}

// Parse data sent from module
function parse_out(data) {
	data.command = 'bro';

	switch (data.src.id) {
		case 0x153 : parse_153(data); data.value = 'Speed/DSC light'; break;
		case 0x1F0 : parse_1f0(data); data.value = 'Wheel speeds';    break;

		// 00 00 05 FF 39 7D 5D 00
		// byte2 bit3 : brake applied
		case 0x1F3 :                  data.value = 'Transverse acceleration'; break;
		case 0x1F5 : parse_1f5(data); data.value = 'Steering angle';          break;

		case 0x1F8:
			// Brake pressure messages observed in 2002 E39 M5
			//
			//       B0 B1 B2 B3 B4 B5 B6 B7
			// 077F  14 14 00 00 00 00 82 01
			//
			// B6 : Pedal pressure LSB
			// B7 : Pedal pressure MSB
			//
			//       XX XX    XX          XX
			// 07B5  30 30 00 30 00 00 00 42
			//
			//
			//
			// 0xB8 = DME? KWP2000 protocol
			// Status sensors (21 06):
			// Positive pressure:
			// B8 29 F1 02 21 06 45
			//                               XX XX XX XX
			// B8 F1 29 0F 61 06 00 00 C3 DC 14 8F 14 A4 00 00 00 00 11 06
			//
			// BrakeLinePressureFront = hex2dec('148F')/100 = 52.63 [bar]
			// BrakeLinePressureRear  = hex2dec('14A4')/100 = 52.84 [bar]
			//
			// BrakeLinePressureFront = hex2dec('1D31')/100 = 74.73 [bar]
			// BrakeLinePressureRear  = hex2dec('1D1C')/100 = 74.52 [bar]
			//
			// Neg. pressure by twos complement:
			// B8 29 F1 02 21 06 45
			// B8 F1 29 0F 61 06 00 00 C3 DC F7 ED F7 83 00 00 00 00 11 06
			//
			// BrakeLinePressureFront = (hex2dec('F7ED')-65536)/100 = -20.67 [bar]
			// BrakeLinePressureRear  = (hex2dec('F783')-65536)/100 = -21.73 [bar]
			// BrakeLinePressureFront = (hex2dec('FFA5')-65536)/100 = -0.91 [bar]
			//
			//
			// Status sensor offset (21 02):
			// B8 29 F1 02 21 02 41
			// B8 F1 29 0C 61 02 FA89 FF18 1E81 FE5D 0000 A7
			//
			// B8 F1 29 0C 61 02 xxxx yyyy 1E81 FE5D 0000 A7
			// xxxx = hex value in telegram of Offset Front
			// yyyy = hex value in telegram of Offset Rear
			// BrakeLinePressureFrontOffset = 0.000625*x + 2.3315e-15
			// BrakeLinePressureRearOffset  = 0.000625*y + 2.3315e-15
			//
			// where x is twos complement of xxxx (or yyyy)
			// if neg value in xxxx (or yyyy) (msb set), otherwise pos value of xxxx (or yyyy)
			//
			// Example: 0xFA89 => neg value since msb=1
			// Twos complement of 0xFA89 = -1399 => -0.87438 [bar]
			data.value = 'Brake pressure';
			break;

		default : data.value = data.src.id.toString(16);
	}

	// log.bus(data);
}


function init_listeners() {
	// Send vehicle speed 0 to CAN1 on power module events
	// This is because vehicle speed isn't received via CAN0 when key is in accessory
	update.on('status.power.active', () => {
		setTimeout(() => {
			encode_1a1(0);
		}, 250);
	});

	log.msg('Initialized listeners');
}


module.exports = {
	init_listeners : init_listeners,

	encode_1a1 : encode_1a1,

	parse_out : parse_out,
};
