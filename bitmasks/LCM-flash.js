// Libraries
var clc  = require('cli-color');
var wait = require('wait.for');

// Bitmasks in hex
var bit_0 = 0x01;
var bit_1 = 0x02;
var bit_2 = 0x04;
var bit_3 = 0x08;
var bit_4 = 0x10;
var bit_5 = 0x20;
var bit_6 = 0x40;
var bit_7 = 0x80;

// Bitmask constants
var hazard  = bit_1;
var beam_lo = bit_2;
var fade    = bit_3;
var beam_hi = bit_4;

function bit_test(num, bit) {
	if ((num & bit) != 0) {
		return true;
	}
	else {
		return false;
	}
}

function pad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

// Not really a thing (yet)
function lcm_flash_bitmask_decode(value) {
	// Determine action
	if (bit_test(value, hold)) {
		var action = clc.yellow('hold');
	}
	else if (bit_test(value, release)) {
		var action = clc.red('release');
	}
	else {
		var action = clc.green('press');
	}

	console.log(action);
}

function offoff() {
	var bit_0_test = bit_test(hex, bit_0);
	var bit_1_test = bit_test(hex, bit_1);
	var bit_2_test = bit_test(hex, bit_2);
	var bit_3_test = bit_test(hex, bit_3);
	var bit_4_test = bit_test(hex, bit_4);
	var bit_5_test = bit_test(hex, bit_5);
	var bit_6_test = bit_test(hex, bit_6);
	var bit_7_test = bit_test(hex, bit_7);
	var dsc ='superoff';
	var hex = 0x00;

	var string = dsc+'|'+clc.yellow(pad(hex, 3))+'|'+bit_0_test+'|'+bit_1_test+'|'+bit_2_test+'|'+bit_3_test+'|'+bit_4_test+'|'+bit_5_test+'|'+bit_6_test+'|'+bit_7_test;
	string     = string.replace(/true/g,  clc.green('TRU'));
	string     = string.replace(/false/g, clc.red('FAL'));

	console.log(string);

	var src = 0x00; // GM
	var dst = 0xBF; // GLO
	var msg = Buffer.from([0x76, hex]);
}

function bit_sample(dsc, hex, callback) {
	setTimeout(() => {
		var bit_0_test = bit_test(hex, bit_0);
		var bit_1_test = bit_test(hex, bit_1);
		var bit_2_test = bit_test(hex, bit_2);
		var bit_3_test = bit_test(hex, bit_3);
		var bit_4_test = bit_test(hex, bit_4);
		var bit_5_test = bit_test(hex, bit_5);
		var bit_6_test = bit_test(hex, bit_6);
		var bit_7_test = bit_test(hex, bit_7);

		var string = dsc+'|'+clc.yellow(pad(hex, 3))+'|'+bit_0_test+'|'+bit_1_test+'|'+bit_2_test+'|'+bit_3_test+'|'+bit_4_test+'|'+bit_5_test+'|'+bit_6_test+'|'+bit_7_test;
		string     = string.replace(/true/g,  clc.green('TRU'));
		string     = string.replace(/false/g, clc.red('FAL'));

		console.log(string);

		var src = 0x00; // GM
		var dst = 0xBF; // GLO
		var msg = Buffer.from([0x76, hex]);

		var ibus_packet = {
			src: src,
			dst: dst,
			msg: msg,
		}

		callback(null, 'message sent');
	}, 2000);
}

function do_sample() {
	offoff();
	var line       = '--------------------------------------------';
	var header_dec = '             001|002|004|008|016|032|064|128';
	var header     = 'Descr   |Val|IKE|Hzd|Low|Hig| 4 | 5 | 6 | 7 ';

	console.log(clc.yellow(header_dec));
	console.log(clc.magenta(header));
	console.log(line);

	var result = wait.for(bit_sample, 'Off     ', 0x00);
	var result = wait.for(bit_sample, 'Hazards ', 0x02);
	// var result = wait.for(bit_sample, 'Lo beams', 0x04);
	var result = wait.for(bit_sample, 'Hi beams', 0x08);
	var result = wait.for(bit_sample, 'Hi+Hazrd', 0x0a);
	var result = wait.for(bit_sample, 'Off     ', 0x00);

	// var result = wait.for(bit_sample, 'Lo +Warn', 0x06);
	// var result = wait.for(bit_sample, 'Hi+Warn ', 0x0A);
	// var result = wait.for(bit_sample, 'Lo+Hi+Wr', 0x0E);
	// var result = wait.for(bit_sample, 'Test1 ',   0x11);
	// var result = wait.for(bit_sample, 'IKE     ', 0x01);
}

function go() {
	wait.launchFiber(do_sample);
}

go();

// lcm_flash_bitmask_decode(0x32);
// lcm_flash_bitmask_decode(0x72);
// lcm_flash_bitmask_decode(0xB2);

//shutdown();
