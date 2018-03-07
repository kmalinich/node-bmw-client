#!/usr/bin/env node

/* eslint key-spacing      : 0 */
/* eslint no-console       : 0 */
/* eslint no-global-assign : 0 */

hex     = require('./share/hex');
bitmask = require('./share/bitmask');


function check_data(data_msg) {
	let mask = bitmask.check(data_msg).mask;

	let dsp_memory = {
		negative     : mask.bit4,
		negative_str : 'negative: ' + mask.bit4,

		band     : null,
		band_str : null,
		bands    : {
			'80Hz'  : !mask.b5 && !mask.b6 && !mask.b7 &&  mask.b8,
			'200Hz' :  mask.b5 && !mask.b6 && !mask.b7 && !mask.b8,
			'500Hz' : !mask.b5 &&  mask.b6 && !mask.b7 && !mask.b8,
			'1kHz'  :  mask.b5 &&  mask.b6 && !mask.b7 && !mask.b8,
			'2kHz'  : !mask.b5 && !mask.b6 &&  mask.b7 && !mask.b8,
			'5kHz'  :  mask.b5 && !mask.b6 &&  mask.b7 && !mask.b8,
			'12kHz' : !mask.b5 &&  mask.b6 &&  mask.b7 && !mask.b8,
		},
	};

	// Loop band object to populate log string
	for (let band in dsp_memory.bands) {
		if (dsp_memory.bands[band] === true) {
			dsp_memory.band     = band;
			dsp_memory.band_str = 'band: ' + band;
			break;
		}
	}

	console.log(JSON.stringify({
		value : data_msg,
		band  : dsp_memory.band,
		neg   : dsp_memory.negative,
	}));
}

check_data(process.argv[2]);
