const gpio = require('pi-gpio');

gpio.open(17, 'output', (err) => { // Open pin 17 for output
	gpio.write(17, 1, () => { // Set pin 17 high (1)
		gpio.close(17); // Close pin 17
	});
});
