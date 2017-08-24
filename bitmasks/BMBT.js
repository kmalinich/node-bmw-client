var clc = require('cli-color');

// This below is unfinished work, but it shows bitmask testing for BMBT.
// This would be much more useful for things like LCM & GM modules.


// Bitmasks in hex
var bit_0 = 0x01; // 1
var bit_1 = 0x02; // 2
var bit_2 = 0x04; // 4
var bit_3 = 0x08; // 8
var bit_4 = 0x10; // 16
var bit_5 = 0x20; // 32
var bit_6 = 0x40; // 64
var bit_7 = 0x80; // 128

// Bitmask constants
var hold    = bit_6;
var release = bit_7;

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

function bit_sample(dsc, hex) {
	var bit_0_test = bit_test(hex, bit_0);
	var bit_1_test = bit_test(hex, bit_1);
	var bit_2_test = bit_test(hex, bit_2);
	var bit_3_test = bit_test(hex, bit_3);
	var bit_4_test = bit_test(hex, bit_4);
	var bit_5_test = bit_test(hex, bit_5);
	var bit_6_test = bit_test(hex, bit_6);
	var bit_7_test = bit_test(hex, bit_7);

	var string = clc.magenta(dsc)+'|'+clc.yellow(pad(hex, 3))+'|'+bit_0_test+'|'+bit_1_test+'|'+bit_2_test+'|'+bit_3_test+'|'+bit_4_test+'|'+bit_5_test+'|'+bit_6_test+'|'+bit_7_test;
	string = string.replace(/true/g,  clc.green('TRU'));
	string = string.replace(/false/g, clc.red('FAL'));

	console.log(string);
}

function bmbt_bitmask_decode(value) {

	// Determine button


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
var line   = '------------------------------------------';
var header = '           001|002|004|008|016|032|064|128';
console.log(clc.yellow(header));
var header = 'Descr |Val| 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 ';
console.log(clc.magenta(header));
console.log(line);

bit_sample('>   dn', 0x00);
bit_sample('2   dn', 0x01);
bit_sample('4   dn', 0x02);
bit_sample('6   dn', 0x03);
bit_sample('tne dn', 0x04);
bit_sample('nav dn', 0x05);
bit_sample('pwr dn', 0x06);
bit_sample('pwr hd', 0x46);
bit_sample('pwr up', 0x86);
bit_sample('fan dn', 0x07);
bit_sample('phn dn', 0x08);
bit_sample('<   dn', 0x10);
bit_sample('1   dn', 0x11);
bit_sample('3   dn', 0x12);
bit_sample('5   dn', 0x13);
bit_sample('<>  dn', 0x14);
bit_sample('sel dn', 0x20);
bit_sample('am  dn', 0x21);
bit_sample('rds dn', 0x22);
bit_sample('mde dn', 0x23);
bit_sample('^   dn', 0x24);
bit_sample('Rmn dn', 0x30);
bit_sample('fm  dn', 0x31);
bit_sample('pty dn', 0x32);
bit_sample('dby dn', 0x33);
bit_sample('Nmn dn', 0x34);
bit_sample(' test ', 0x1B);
bit_sample(' 0xFF ', 0xFF);
bit_sample(' 0xFD ', 0xFD);
bit_sample(' 0x4E ', 0x4E);


// bit_sample('Pwr hd', 0x46);
// console.log(line);

// bit_sample('fm  hd', 0x71);
// bit_sample('am  hd', 0x61);
// bit_sample('pty hd', 0x72);
// bit_sample('rds hd', 0x62);
// bit_sample('dby hd', 0x73);
// bit_sample('mde hd', 0x63);
// console.log(line);

// bit_sample('1   up', 0x91);
// bit_sample('2   up', 0x81);
// bit_sample('3   up', 0x92);
// bit_sample('4   up', 0x82);
// bit_sample('5   up', 0x93);
// bit_sample('6   up', 0x83);
// console.log(line);
//
// bit_sample('Pwr up', 0x86);
// console.log(line);
//
// bit_sample('fm  up', 0xb1);
// bit_sample('am  up', 0xa1);
// bit_sample('pty up', 0xb2);
// bit_sample('rds up', 0xa2);
// bit_sample('dby up', 0xb3);
// bit_sample('mde up', 0xa3);

bmbt_bitmask_decode(0x32);
bmbt_bitmask_decode(0x72);
bmbt_bitmask_decode(0xB2);
