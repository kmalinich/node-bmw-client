const module_name = __filename.slice(__dirname.length + 1, -3).replace('-', '_');

// Only load if configured as Raspberry Pi
if (config.system.pi === true && process.arch == 'arm') {
	const pi_gpio = require('pigpio').Gpio;
}

const options = {
	alert      : true,
	edge       : pi_gpio.EITHER_EDGE,
	mode       : pi_gpio.OUTPUT,
	pullUpDown : pi_gpio.PUD_DOWN,
	timeout    : 0,
};

const pins = {
	k1 : 23,
	k2 : 24,
};

let states = {
	k1 : 1,
	k2 : 0,
};

function pinlog1(str) {
	console.log('[K1] ['+pins.k1+'] %s', str);
}
function pinlog2(str) {
	console.log('[K2] ['+pins.k2+'] %s', str);
}

pinlog1('Open');
let k1 = new pi_gpio(pins.k1, options);

pinlog2('Open');
let k2 = new pi_gpio(pins.k2, options);


k1.on('Alert', (level, tick) => { pinlog1('alert - level: '+level); });
k2.on('Event', (level)       => { pinlog2('event - level: '+level); });

function toggle_pins() {
	pinlog1('Write - level: '+states.k1);
	k1.digitalWrite(states.k1);

	switch (states.k1) {
		case 0: states.k1++; break;
		case 1: states.k1--; break;
	}

	pinlog2('Write - level: '+states.k2);
	k2.digitalWrite(states.k2);

	switch (states.k2) {
		case 0: states.k2++; break;
		case 1: states.k2--; break;
	}
}

toggle_pins();
setInterval(() => { toggle_pins(); }, 5000);
