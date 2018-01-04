// Array of all DSP modes
let dsp_modes = {
	0 : 'concert hall',
	1 : 'jazz club',
	2 : 'cathedral',
	3 : 'memory 1',
	4 : 'memory 2',
	5 : 'memory 3',
	6 : 'DSP off',
};


// Select DSP mode
function dsp_mode(mode) {
	log.module({ msg : 'DSP mode set to \'' + mode + '\'' });

	let cmd;

	switch (mode) {
		case 'concert-hall' : cmd = [ 0x34, 0x09 ]; break;
		case 'jazz-club'    : cmd = [ 0x34, 0x0A ]; break;
		case 'cathedral'    : cmd = [ 0x34, 0x0B ]; break;
		case 'memory-1'     : cmd = [ 0x34, 0x0C ]; break;
		case 'memory-2'     : cmd = [ 0x34, 0x0D ]; break;
		case 'memory-3'     : cmd = [ 0x34, 0x0E ]; break;
		case 'off'          : cmd = [ 0x34, 0x0F ]; break;
	}

	bus.data.send({
		src : 'GT',
		msg : cmd,
	});
}

// Parse message from DSP amp
function eq_decode(data) {
	let dsp_mode = data[1] - 1;

	let reverb = data[2] & 0x0F;
	if (bitmask.test(data[2], bitmask.b[4])) {
		reverb *= -1;
	}

	let room_size = data[3] & 0x0F;
	if (bitmask.test(data[3], bitmask.b[4])) {
		room_size *= -1;
	}

	let band = [];
	let n;

	for (n = 0; n < 7; n++) {
		band[n] = data[4 + n] & 0x0F;

		if (bitmask.test(data[n + 4], bitmask.b[4])) {
			band[n] *= -1;
		}
	}

	// Insert parsed data into status
	update.status('dsp.mode',      dsp_modes[dsp_mode]);
	update.status('dsp.reverb',    reverb);
	update.status('dsp.room_size', room_size);
	update.status('dsp.eq.band0',  band[0]);
	update.status('dsp.eq.band1',  band[1]);
	update.status('dsp.eq.band2',  band[2]);
	update.status('dsp.eq.band3',  band[3]);
	update.status('dsp.eq.band4',  band[4]);
	update.status('dsp.eq.band5',  band[5]);
	update.status('dsp.eq.band6',  band[6]);

	log.module({ msg : 'DSP EQ decoded' });
}

// let dsp_data = {
//   memory    : 2,
//   reverb    : 10,
//   room_size : 10,
//   band      : {
//     0 : 10,
//     1 : 5,
//     2 : -3,
//     3 : -4,
//     4 : -3,
//     5 : 5,
//     6 : 9,
//   },
// };

function eq_encode(data) {
	let reverb_out = [ 0x34, 0x94 + data.memory, data.reverb & 0x0F ];
	eq_send(reverb_out);

	let room_size_out = [ 0x34, 0x94 + data.memory, (data.room_size & 0x0F) | 0x20 ];
	eq_send(room_size_out);

	for (let band_num = 0; band_num < 7; band_num++) {
		// ... Don't look at me...
		let band_out = [ 0x34, 0x14 + data.memory, (((band_num * 2) << 4) & 0xF0) | ((data.band[band_num] < 0 ? (0x10 | (Math.abs(data.band[band_num]) & 0x0F)) : (data.band[band_num] & 0x0F))) ];
		eq_send(band_out);
	}

	log.module({ msg : 'DSP EQ encoded' });
}

// Speaker test
// Start : 3F 6A 32
// End   : 3F 6A 33

// Send EQ data to DSP
function eq_send(msg) {
	bus.data.send({
		src : 'DSPC',
		msg : msg,
	});

	log.module({ msg : 'DSP EQ sent' });
}

// Set M-Audio on/off
function m_audio(value) {
	log.module({ msg : 'Setting M-Audio to \'' + value + '\'' });

	let cmd;

	switch (value) {
		case 'on'  : cmd = [ 0x34, 0x91, 0x00 ]; break;
		case 'off' : cmd = [ 0x34, 0x90, 0x00 ]; break;
		default    : return;
	}

	bus.data.send({
		src : 'GT',
		msg : cmd,
	});
}

// Parse data sent from DSP module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x35: // Broadcast: DSP memory
			data.command = 'bro';
			data.value   = 'DSP memory';
			eq_decode(data.msg);
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
	}

	log.bus(data);
}

// Request various things from DSP
function request(value) {
	let src;
	let cmd;

	log.module({ msg : 'Requesting \'' + value + '\'' });

	switch (value) {
		case 'io-status' :
			src = 'DIA';
			cmd = [ 0x0B, 0x00 ]; // Get IO status
			break;
		case 'memory' :
			src = 'RAD';
			cmd = [ 0x34, 0x08 ]; // Get DSP memory
	}

	bus.data.send({
		src : src,
		msg : cmd,
	});
}


module.exports = {
	dsp_mode  : dsp_mode,
	eq_decode : eq_decode,
	eq_encode : eq_encode,
	eq_send   : eq_send,
	m_audio   : m_audio,
	parse_out : parse_out,
	request   : request,
};
