const module_name = __filename.slice(__dirname.length + 1, -3);

function parse_1f0(data) {
	let wheel_speed = {
		front : {
			left  : (data.msg[0]+parseInt('0x'+data.msg[1].toString(16).slice(-1))*256)/16,
			right : (data.msg[2]+parseInt('0x'+data.msg[3].toString(16).slice(-1))*256)/16,
		},
		rear : {
			left  : (data.msg[4]+parseInt('0x'+data.msg[5].toString(16).slice(-1))*256)/16,
			right : (data.msg[6]+parseInt('0x'+data.msg[7].toString(16).slice(-1))*256)/16,
		},
	};

	update.status('vehicle.wheel_speed.front.left',  wheel_speed.front.left);
	update.status('vehicle.wheel_speed.front.right', wheel_speed.front.right);
	update.status('vehicle.wheel_speed.rear.left',   wheel_speed.rear.left);
	update.status('vehicle.wheel_speed.rear.right',  wheel_speed.rear.right);
}

function parse_1f5(data) {
	let angle = 0;
	if (data.msg[1] > 127) {
		angle = -1*(((data.msg[1]-128)*256)+data.msg[0]);
	}
	else {
		angle = (data.msg[1]*256)+data.msg[0];
	}

	let velocity = 0;
	if (data.msg[3] > 127) {
		velocity = -1*(((data.msg[3]-128)*256)+data.msg[2]);
	}
	else {
		velocity = (data.msg[3]*256)+data.msg[2];
	}

	let steering = {
		angle    : parseInt((angle*0.045).toFixed(4)),
		velocity : parseInt((velocity*0.045).toFixed(4)),
	};

	update.status('vehicle.steering.angle', steering.angle);
	update.status('vehicle.steering.velocity', steering.velocity);
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
