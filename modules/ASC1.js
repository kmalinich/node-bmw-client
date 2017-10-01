const convert = require('node-unit-conversion');

function parse_1f0(data) {
	let wheel_speed = {
		front : {
			left  : Math.round((data.msg[0] + parseInt('0x' + data.msg[1].toString(16).slice(-1)) * 256) / 16),
			right : Math.round((data.msg[2] + parseInt('0x' + data.msg[3].toString(16).slice(-1)) * 256) / 16),
		},
		rear : {
			left  : Math.round((data.msg[4] + parseInt('0x' + data.msg[5].toString(16).slice(-1)) * 256) / 16),
			right : Math.round((data.msg[6] + parseInt('0x' + data.msg[7].toString(16).slice(-1)) * 256) / 16),
		},
	};

	// Calculated data bottoms out at 2.75, let's address that
	// (lol, this is the same way the E38/E39/E53 cluster works - you can see it in the 'secret' menu)
	if (wheel_speed.front.left  <= 3) wheel_speed.front.left  = 0;
	if (wheel_speed.front.right <= 3) wheel_speed.front.right = 0;
	if (wheel_speed.rear.left   <= 3) wheel_speed.rear.left   = 0;
	if (wheel_speed.rear.right  <= 3) wheel_speed.rear.right  = 0;

	update.status('vehicle.wheel_speed.front.left',  wheel_speed.front.left,  false);
	update.status('vehicle.wheel_speed.front.right', wheel_speed.front.right, false);
	update.status('vehicle.wheel_speed.rear.left',   wheel_speed.rear.left,   false);
	update.status('vehicle.wheel_speed.rear.right',  wheel_speed.rear.right,  false);

	// Calculate vehicle speed from rear left wheel speed sensor
	// This is identical to the actual speedometer signal on E39
	// update.status('vehicle.speed.kmh', wheel_speed.rear.left, false);
	// let vehicle_speed_mph = Math.round(convert(status.vehicle.wheel_speed.rear.left).from('kilometre').to('us mile'));

	// Calculate vehicle speed from average of all 4 sensors
	let vehicle_speed_total = wheel_speed.front.left + wheel_speed.front.right + wheel_speed.rear.left + wheel_speed.rear.right;

	// Average all wheel speeds together and include accuracy offset multiplier
	let vehicle_speed_kmh = Math.round((vehicle_speed_total / 4) * config.speedometer.offset);

	// Calculate vehicle speed value in MPH
	let vehicle_speed_mph = Math.round(convert(vehicle_speed_kmh).from('kilometre').to('us mile'));

	// Trigger IKE speedometer refresh on value change
	// This should really be event based, but fuck it, you write this shit
	if (update.status('vehicle.speed.mph', vehicle_speed_mph)) IKE.hud_refresh();

	update.status('vehicle.speed.kmh', vehicle_speed_kmh);
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

	let steering = {
		angle    : parseInt((angle * 0.045).toFixed(4)),
		velocity : parseInt((velocity * 0.045).toFixed(4)),
	};

	update.status('vehicle.steering.angle',    steering.angle);
	update.status('vehicle.steering.velocity', steering.velocity, false);
}


// Parse data sent from module
function parse_out(data) {
	data.command = 'bro';

	switch (data.src.id) {
		case 0x153:
			// DSC off (DSC light on) (b0/b1)
			// 04 61 01 FF 00 FE FF 0
			// DSC on (DSC light off) (b0/b1)
			// 00 60 01 FF 00 FE FF 0C
			// Brake pedal depressed, also when key off (b0)
			// 10 60 01 FF 00 FE FF 09
			// ~5 sec on initial key in run
			// A4 61 01 FF 00 FE FF 0B
			data.value = 'Speed/DSC light';
			break;

		case 0x1F0:
			parse_1f0(data);
			data.value = 'Wheel speeds';
			break;

		case 0x1F3:
			data.value = 'Transverse acceleration';
			break;

		case 0x1F5:
			parse_1f5(data);
			data.value = 'Steering angle';
			break;

		case 0x1F8:
			data.value = 'Brake pressure';
			break;

		default:
			data.value = data.src.id.toString(16);
	}

	// log.bus(data);
}

module.exports = {
	parse_out : (data) => { parse_out(data); },
};
