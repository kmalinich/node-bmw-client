// Color terminal output
var clc  = require('cli-color');
var wait = require('wait.for');

// Libraries
var ibus_interface = require('../ibus-interface.js');
var bus_modules   = require('../bus-modules.js');

// Serial device path
var device = '/dev/tty.SLAB_USBtoUART';

// IBUS connection handle
var ibus_connection = new ibus_interface(device);

// Run shutdown() on SIGINT
process.on('SIGINT', shutdown);

// Bitmasks in hex
var bit_0 = 0x01;
var bit_1 = 0x02;
var bit_2 = 0x04;
var bit_3 = 0x08;
var bit_4 = 0x10;
var bit_5 = 0x20;
var bit_6 = 0x40;
var bit_7 = 0x80;

// Startup function
function startup() {
	// Open serial port
	ibus_connection.startup();
}

// Shutdown function
function shutdown() {
	// Terminate connection
	ibus_connection.shutdown(() => {
		process.exit();
	});
}

function bit_test(num, bit) {
	if ((num & bit) != 0) {
		return true;
	}
	else {
		return false;
	}
}

// Set a bit in a bitmask
function bit_set(num, bit) {
	num |= bit;
	return num;
}

function print_header() {
	var header_dec = '          |001|002|004|008|016|032|064|128 || 001|002|004|008|016|032|064|128';
	var header     = 'Descriptn | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7  ||  0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 ';
	var line       = '------------------------------------------ || -------------------------------';

	console.log(clc.yellow(header_dec));
	console.log(clc.magenta(header));
	console.log(line);
}

function gm_bitmask_display(dsc, hex) {
	var bit_0_test_0 = bit_test(hex[0], bit_0);
	var bit_1_test_0 = bit_test(hex[0], bit_1);
	var bit_2_test_0 = bit_test(hex[0], bit_2);
	var bit_3_test_0 = bit_test(hex[0], bit_3);
	var bit_4_test_0 = bit_test(hex[0], bit_4);
	var bit_5_test_0 = bit_test(hex[0], bit_5);
	var bit_6_test_0 = bit_test(hex[0], bit_6);
	var bit_7_test_0 = bit_test(hex[0], bit_7);

	var bit_0_test_1 = bit_test(hex[1], bit_0);
	var bit_1_test_1 = bit_test(hex[1], bit_1);
	var bit_2_test_1 = bit_test(hex[1], bit_2);
	var bit_3_test_1 = bit_test(hex[1], bit_3);
	var bit_4_test_1 = bit_test(hex[1], bit_4);
	var bit_5_test_1 = bit_test(hex[1], bit_5);
	var bit_6_test_1 = bit_test(hex[1], bit_6);
	var bit_7_test_1 = bit_test(hex[1], bit_7);

	var string = dsc+'|'+bit_0_test_0+'|'+bit_1_test_0+'|'+bit_2_test_0+'|'+bit_3_test_0+'|'+bit_4_test_0+'|'+bit_5_test_0+'|'+bit_6_test_0+'|'+bit_7_test_0+' || '+bit_0_test_1+'|'+bit_1_test_1+'|'+bit_2_test_1+'|'+bit_3_test_1+'|'+bit_4_test_1+'|'+bit_5_test_1+'|'+bit_6_test_1+'|'+bit_7_test_1;
	string     = string.replace(/true/g,  clc.green('TRU'));
	string     = string.replace(/false/g, clc.red('FAL'));
	console.log(string);
}

function bit_sample(dsc, packet, callback) {
	setTimeout(() => {
		// Display the bitmask for the two array positions
		gm_bitmask_display(dsc, packet);

		omnibus.ibus.send({
			src: 'DIA',
			dst: 'GM',
			msg: [0x0C, packet],
		});

		callback(null, 'message sent');
	}, 100);
}

function do_sample() {
	var result = wait.for(bit_sample, '0x00, 0x00', [0x00, 0x00]);
	var result = wait.for(bit_sample, '0x00, 0x01', [0x01, 0x00]);
	var result = wait.for(bit_sample, '0x00, 0x02', [0x02, 0x00]);
	var result = wait.for(bit_sample, '0x00, 0x04', [0x04, 0x00]);
	var result = wait.for(bit_sample, '0x00, 0x08', [0x08, 0x00]);
	var result = wait.for(bit_sample, '0x00, 0x10', [0x10, 0x00]);
	var result = wait.for(bit_sample, '0x00, 0x20', [0x20, 0x00]);
	var result = wait.for(bit_sample, '0x00, 0x40', [0x40, 0x00]);
	var result = wait.for(bit_sample, '0x00, 0x80', [0x80, 0x00]);
	var result = wait.for(bit_sample, '0x01, 0x00', [0x00, 0x01]);
	var result = wait.for(bit_sample, '0x02, 0x00', [0x00, 0x02]);
	var result = wait.for(bit_sample, '0x04, 0x00', [0x00, 0x04]);
	var result = wait.for(bit_sample, '0x08, 0x00', [0x00, 0x08]);
	var result = wait.for(bit_sample, '0x10, 0x00', [0x00, 0x10]);
	var result = wait.for(bit_sample, '0x20, 0x00', [0x00, 0x20]);
	var result = wait.for(bit_sample, '0x40, 0x00', [0x00, 0x40]);
	var result = wait.for(bit_sample, '0x80, 0x00', [0x00, 0x80]);
}

function go() {
	wait.launchFiber(do_sample);
}

//startup();
//ibus_connection.on('port_open', go);

print_header();
go();

//shutdown();
