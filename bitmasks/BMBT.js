/* eslint no-console       : 0 */
/* eslint no-global-assign : 0 */

/* global bitmask clc hex pad */

bitmask = require('../share/bitmask');
clc     = require('cli-color');
hex     = require('../share/hex');
pad     = require('pad');


// This below is unfinished work, but it shows bitmask testing for BMBT
// This would be much more useful for things like LCM & GM modules


// Bitmasks in hex
// let bit_0 = 0x01; // 1
// let bit_1 = 0x02; // 2
// let bit_2 = 0x04; // 4
// let bit_3 = 0x08; // 8
// let bit_4 = 0x10; // 16
// let bit_5 = 0x20; // 32
// let bit_6 = 0x40; // 64
// let bit_7 = 0x80; // 128

// Bitmask constants
// let hold    = bit_6;
// let release = bit_7;

function pad_hex(n) {
	let width = 2;

	n = n.toString(16);
	n = n.toString();

	let output = n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;

	return '0x' + output.toUpperCase();
}

function button_sample(hex) {
	let mask = bitmask.check(hex).mask;

	let string = button_decode(hex) + ' |' + clc.yellow(pad_hex(hex)) + '|' + mask.b0 + '|' + mask.b1 + '|' + mask.b2 + '|' + mask.b3 + '|' + mask.b4 + '|' + mask.b5 + '|' + mask.b6 + '|' + mask.b7;

	string = string.replace(/true/g,  clc.green('TRU'));
	string = string.replace(/false/g, clc.black('FAL'));

	console.log(string);

	// if (!mask.b6 && !mask.b7) {
	// 	button_sample(hex + 0x40);
	// 	button_sample(hex + 0x80);
	// }
}

function button_decode(value) {
	let action = clc.yellow('⬇');
	let button;

	// Determine action
	let mask = bitmask.check(value).mask;
	switch (mask.b6) {
		case true : {
			switch (mask.b7) {
				case true  : break;
				case false : {
					action = clc.red('⬅');
				}
			}
			break;
		}

		case false : {
			switch (mask.b7) {
				case false : break;
				case true  : {
					action = clc.green('⬆');
				}
			}
		}
	}

	// Remove hold and release bits from button value
	value = bitmask.unset(value, bitmask.b[6]);
	value = bitmask.unset(value, bitmask.b[7]);

	// Determine button
	switch (value) {
		case 0x00 : button = '>';        break;
		case 0x01 : button = '2';        break;
		case 0x02 : button = '4';        break;
		case 0x03 : button = '6';        break;
		case 0x04 : button = 'Tone';     break;
		case 0x05 : button = 'Knob';     break;
		case 0x06 : button = 'Power';    break;
		case 0x07 : button = 'Clock';    break;
		case 0x08 : button = 'Phone';    break;
		case 0x10 : button = '<';        break;
		case 0x11 : button = '1';        break;
		case 0x12 : button = '3';        break;
		case 0x13 : button = '5';        break;
		case 0x14 : button = '<>';       break;
		case 0x20 : button = 'Select';   break;
		case 0x21 : button = 'AM';       break;
		case 0x22 : button = 'RDS';      break;
		case 0x23 : button = 'Mode';     break;
		case 0x24 : button = 'Eject';    break;
		case 0x30 : button = 'RAD menu'; break;
		case 0x31 : button = 'FM';       break;
		case 0x32 : button = 'PTY/TP';   break;
		case 0x33 : button = 'Dolby';    break;
		case 0x34 : button = 'GT menu';  break;
		case 0x38 : button = 'Info';     break;
		default   : button = 'Unknown';
	}

	return action + '  |' + clc.magenta(pad(button, 8));
}

let header;
let line = '-------------------------------------------';

header = '                    1 | 2 | 4 | 8 | 10| 20| 40| 80';
console.log(clc.yellow(header));
header = 'Dir|Button   |Val | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 ';

console.log(clc.magenta(header));
console.log(line);

button_sample(0x00);
button_sample(0x01);
button_sample(0x02);
button_sample(0x03);
button_sample(0x04);
button_sample(0x05);
button_sample(0x06);
button_sample(0x07);
button_sample(0x08);
button_sample(0x10);
button_sample(0x11);
button_sample(0x12);
button_sample(0x13);
button_sample(0x14);
button_sample(0x20);
button_sample(0x21);
button_sample(0x22);
button_sample(0x23);
button_sample(0x24);
button_sample(0x30);
button_sample(0x31);
button_sample(0x32);
button_sample(0x33);
button_sample(0x34);
button_sample(0x38);
button_sample(0x40);
button_sample(0x41);
button_sample(0x42);
button_sample(0x43);
button_sample(0x44);
button_sample(0x45);
button_sample(0x46);
button_sample(0x47);
button_sample(0x48);
button_sample(0x50);
button_sample(0x51);
button_sample(0x52);
button_sample(0x53);
button_sample(0x54);
button_sample(0x60);
button_sample(0x61);
button_sample(0x62);
button_sample(0x63);
button_sample(0x64);
button_sample(0x70);
button_sample(0x71);
button_sample(0x72);
button_sample(0x73);
button_sample(0x74);
button_sample(0x78);
button_sample(0x80);
button_sample(0x81);
button_sample(0x82);
button_sample(0x83);
button_sample(0x84);
button_sample(0x85);
button_sample(0x86);
button_sample(0x87);
button_sample(0x88);
button_sample(0x90);
button_sample(0x91);
button_sample(0x92);
button_sample(0x93);
button_sample(0x94);
button_sample(0xA0);
button_sample(0xA1);
button_sample(0xA2);
button_sample(0xA3);
button_sample(0xA4);
button_sample(0xB0);
button_sample(0xB1);
button_sample(0xB2);
button_sample(0xB3);
button_sample(0xB4);
button_sample(0xB8);
