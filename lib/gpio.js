const gpio = require('pi-gpio');

let pin = 17;

console.log('['+pin+'] Open for output');
gpio.open(pin, 'output', (err) => { // Open pin for output
	console.log('['+pin+'] Set high');
	gpio.write(pin, 1, () => { // Set pin high (1)
		console.log('['+pin+'] Close');
		gpio.close(pin); // Close pin
	});
});
