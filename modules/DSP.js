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
	let cmd;

	switch (mode) {
		case 'concert-hall' : cmd = [ 0x34, 0x09 ]; break;
		case 'jazz-club'    : cmd = [ 0x34, 0x0A ]; break;
		case 'cathedral'    : cmd = [ 0x34, 0x0B ]; break;
		case 'memory-1'     : cmd = [ 0x34, 0x0C ]; break;
		case 'memory-2'     : cmd = [ 0x34, 0x0D ]; break;
		case 'memory-3'     : cmd = [ 0x34, 0x0E ]; break;
		case 'off'          : cmd = [ 0x34, 0x0F ]; break;

		default : return;
	}

	log.module('Setting DSP mode set to \'' + mode + '\'');

	bus.data.send({
		src : 'RAD',
		msg : cmd,
	});
}

// Broadcast: DSP memory
// Parse message from DSP amp
function eq_decode(data) {
	data.command = 'bro';
	data.value   = 'DSP memory';

	let dsp_mode = data.msg[1] - 1;

	let echo = data.msg[2] & 0x0F;
	if (bitmask.test(data.msg[2], bitmask.b[4])) {
		echo *= -1;
	}

	let room_size = data.msg[3] & 0x0F;
	if (bitmask.test(data.msg[3], bitmask.b[4])) {
		room_size *= -1;
	}

	let band = [];
	let n;

	for (n = 0; n < 7; n++) {
		band[n] = data.msg[4 + n] & 0x0F;

		if (bitmask.test(data.msg[n + 4], bitmask.b[4])) {
			band[n] *= -1;
		}
	}

	// Insert parsed data into status
	update.status('dsp.mode', dsp_modes[dsp_mode], false);

	update.status('dsp.echo',      echo,      false);
	update.status('dsp.room_size', room_size, false);

	update.status('dsp.eq.band0',  band[0], false);
	update.status('dsp.eq.band1',  band[1], false);
	update.status('dsp.eq.band2',  band[2], false);
	update.status('dsp.eq.band3',  band[3], false);
	update.status('dsp.eq.band4',  band[4], false);
	update.status('dsp.eq.band5',  band[5], false);
	update.status('dsp.eq.band6',  band[6], false);

	log.module('DSP EQ decoded');

	return data;
}

// Send EQ delta-update to DSP
function eq_delta(band, value) {
	value = parseInt(value);

	// Save original integer value for log message
	let value_orig = value;

	// Ensure band is string type and lowercase
	band = band.toString().toLowerCase();

	// Check if negative number
	let minus = (Math.sign(value) === -1);

	// Get absolute value
	value = Math.abs(value);

	// Negative value sets 0x10 bit
	if (minus === true) value += 0x10;

	let msg;
	switch (band) {
		case 'room-size' : msg = [ 0x95, value ]; break;

		case 'echo' : value += 0x20; msg = [ 0x95, value ]; break;

		case '1'    :
		case '80'   :
		case '80hz' : msg = [ 0x95, 0x15, value ]; break;

		case '2'     :
		case '200'   :
		case '200hz' : value += 0x20; msg = [ 0x95, 0x15, value ]; break;

		case '3'     :
		case '500'   :
		case '500hz' : value += 0x40; msg = [ 0x95, 0x15, value ]; break;

		case '4'    :
		case '1000' :
		case '1khz' : value += 0x60; msg = [ 0x95, 0x15, value ]; break;

		case '5'    :
		case '2000' :
		case '2khz' : value += 0x80; msg = [ 0x95, 0x15, value ]; break;

		case '6'    :
		case '5000' :
		case '5khz' : value += 0xA0; msg = [ 0x95, 0x15, value ]; break;

		case '7'     :
		case '12000' :
		case '12khz' : value += 0xC0; msg = [ 0x95, 0x15, value ]; break;

		default : return;
	}

	bus.data.send({
		src : 'GT',
		msg : msg,
	});

	log.module('DSP EQ delta update sent, band: \'' + band + '\', minus: ' + minus + ' value: ' + value_orig + ' (0x' + value.toString(16).padStart(2, '0').toUpperCase() + ')');
}

// let dsp_data = {
//   echo      : 10,
//   memory    : 2,
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
	let echo_out = [ 0x34, 0x94 + data.memory, data.echo & 0x0F ];
	eq_send(echo_out);
	log.module('DSP EQ echo encoded');

	let room_size_out = [ 0x34, 0x94 + data.memory, (data.room_size & 0x0F) | 0x20 ];
	eq_send(room_size_out);
	log.module('DSP EQ room size encoded');

	for (let band_num = 0; band_num < 7; band_num++) {
		// ... Don't look at me
		let band_out = [ 0x34, 0x14 + data.memory, (((band_num * 2) << 4) & 0xF0) | ((data.band[band_num] < 0 ? (0x10 | (Math.abs(data.band[band_num]) & 0x0F)) : (data.band[band_num] & 0x0F))) ];

		// Send each EQ band update with a small delay
		setTimeout(() => {
			eq_send(band_out);

			log.module('DSP EQ band ' + band_num + ' encoded');
		}, (band_num * 200));
	}
}

// Send EQ data to DSP
function eq_send(msg) {
	bus.data.send({
		src : 'DSPC',
		msg : msg,
	});

	// log.module('DSP EQ sent');
}

// Set M-Audio on/off
function m_audio(value) {
	log.module('Setting M-Audio to \'' + value + '\'');

	let cmd;

	switch (value) {
		case 1     :
		case true  :
		case 'on'  : cmd = [ 0x34, 0x91, 0x00 ]; break;

		case 0     :
		case false :
		case 'off' : cmd = [ 0x34, 0x90, 0x00 ]; break;

		default : return;
	}

	bus.data.send({
		src : 'GT',
		msg : cmd,
	});
}

// Start/stop speaker test function
function speaker_test(command) {
	let msg;
	switch (command) {
		case 'start' :
		case 1       :
		case true    : {
			command = 'start';
			msg     = 0x32;
			break;
		}

		case 'stop' :
		case 0      :
		case false  : {
			command = 'stop';
			msg     = 0x33;
		}
	}

	log.module('Sending \'' + command + '\' speaker test command');

	bus.data.send({
		src : 'DIA',
		msg : msg,
	});
}

function loudness(state = true) {
	// Cast state to boolean
	switch (state) {
		case 'on'   :
		case 'true' :
		case 1      : state = 0x01; break;

		case 'off'   :
		case 'false' :
		case 0       : state = 0x00; break;

		default : return;
	}

	bus.data.send({
		src : 'DIA',
		msg : [ 0x1C, 0x01, 0x03, state ],
	});

	log.module('Set loudness to state: ' + (state === 0x01));
}

// Request various things from DSP
function request(value) {
	let src;
	let cmd;

	log.module('Requesting \'' + value + '\'');

	switch (value) {
		case 'io-status' : {
			src = 'DIA';
			cmd = [ 0x0B, 0x00 ]; // Get IO status
			break;
		}

		case 'memory' : {
			src = 'RAD';
			cmd = [ 0x34, 0x08 ]; // Get DSP memory
		}
	}

	bus.data.send({
		src : src,
		msg : cmd,
	});
}


// Parse data sent from DSP module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x35 : return eq_decode(data);
	}

	return data;
}


module.exports = {
	dsp_mode : dsp_mode,

	eq_decode : eq_decode,
	eq_delta  : eq_delta,
	eq_encode : eq_encode,
	eq_send   : eq_send,

	m_audio : m_audio,

	loudness : loudness,

	parse_out : parse_out,

	request : request,

	speaker_test : speaker_test,
};
