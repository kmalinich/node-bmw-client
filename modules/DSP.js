// Array of all DSP modes
const dsp_modes = {
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

	log.module(`Setting DSP mode set to '${mode}'`);

	bus.data.send({
		src : 'DSPC',
		msg : cmd,
	});
}

// Broadcast: DSP memory
// Parse message from DSP amp
function eq_decode(data) {
	data.command = 'bro';
	data.value   = 'DSP memory';

	const dsp_mode = data.msg[1] - 1;

	let echo = data.msg[2] & 0x0F;
	if (bitmask.test(data.msg[2], bitmask.b[4])) {
		echo *= -1;
	}

	let room_size = data.msg[3] & 0x0F;
	if (bitmask.test(data.msg[3], bitmask.b[4])) {
		room_size *= -1;
	}

	const band = [];
	let n;

	for (n = 0; n < 7; n++) {
		band[n] = data.msg[4 + n] & 0x0F;

		if (bitmask.test(data.msg[n + 4], bitmask.b[4])) {
			band[n] *= -1;
		}
	}

	// Insert parsed data into status
	update.status('dsp.mode', dsp_modes[dsp_mode], false);

	update.status('dsp.eq.echo',      echo,      false);
	update.status('dsp.eq.room_size', room_size, false);

	update.status('dsp.eq.band.0',  band[0], false);
	update.status('dsp.eq.band.1',  band[1], false);
	update.status('dsp.eq.band.2',  band[2], false);
	update.status('dsp.eq.band.3',  band[3], false);
	update.status('dsp.eq.band.4',  band[4], false);
	update.status('dsp.eq.band.5',  band[5], false);
	update.status('dsp.eq.band.6',  band[6], false);

	log.module('DSP EQ decoded');

	return data;
}

// Send EQ delta-update to DSP
function eq_delta(band, value) {
	// Save original integer value for log message
	const value_orig = parseInt(value);

	value = parseInt(value);

	// Ensure band is string type and lowercase
	band = band.toString().toLowerCase();

	// Check if negative number
	const minus = (Math.sign(value) === -1);

	// Get absolute value
	value = Math.abs(value);

	// Negative value sets 0x10 bit
	if (minus === true) value += 0x10;

	const cmd = 0x95;

	let msg;
	switch (band) {
		case 'echo'      : value += 0x20; msg = [ cmd, value ]; break;
		case 'room-size' :                msg = [ cmd, value ]; break;

		case '0'    :
		case '80'   :
		case '80hz' : {
			band = '80Hz';
			msg  = [ cmd, 0x15, value ];
			break;
		}

		case '1'     :
		case '200'   :
		case '200hz' : {
			band   = '200Hz';
			value += 0x20;
			msg    = [ cmd, 0x15, value ];
			break;
		}

		case '2'     :
		case '500'   :
		case '500hz' : {
			band   = '500Hz';
			value += 0x40;
			msg    = [ cmd, 0x15, value ];
			break;
		}

		case '3'    :
		case '1000' :
		case '1khz' : {
			band   = '1kHz';
			value += 0x60;
			msg    = [ cmd, 0x15, value ];
			break;
		}

		case '4'    :
		case '2000' :
		case '2khz' : {
			band   = '2kHz';
			value += 0x80;
			msg    = [ cmd, 0x15, value ];
			break;
		}

		case '5'    :
		case '5000' :
		case '5khz' : {
			band   = '5kHz';
			value += 0xA0;
			msg    = [ cmd, 0x15, value ];
			break;
		}

		case '6'     :
		case '12000' :
		case '12khz' : {
			band   = '12kHz';
			value += 0xC0;
			msg    = [ cmd, 0x15, value ];
			break;
		}

		default : return;
	}

	bus.data.send({
		src : 'RAD', // Might also be one of BMBT, DSPC, GT, RAD..
		msg,
	});

	log.module(`DSP EQ delta update sent, band: '${band}', minus: '${minus}', value: ${value_orig} (0x${value.toString(16).padStart(2, '0').toUpperCase()}`);
}

// let dsp_data = {
//   band      : [ 10, 5, -3, -4, -3, 5, 9 ],
//   echo      : 10,
//   memory    : 2,
//   room_size : 10,
// };

async function eq_encode(data = config.media.dsp.eq) {
	const echo_out = [ 0x34, 0x94 + data.memory, data.echo & 0x0F ];
	eq_send(echo_out);
	log.module(`Sent DSP EQ echo value ${data.echo} for memory ${data.memory}`);

	await new Promise(resolve => setTimeout(resolve, 250));

	const room_size_out = [ 0x34, 0x94 + data.memory, (data.room_size & 0x0F) | 0x20 ];
	eq_send(room_size_out);
	log.module(`Sent DSP EQ room size value ${data.room_size} for memory ${data.memory}`);
	await new Promise(resolve => setTimeout(resolve, 250));

	// TODO: Workaround for `for await (const eqBand of eqBands)` loop
	const eqBands = [ 0, 1, 2, 3, 4, 5, 6 ];

	for await (const eqBand of eqBands) {
		// ... Don't look at me
		const band_out = [
			0x34,
			0x14 + (data.memory - 1),
			(((eqBand * 2) << 4) & 0xF0) | ((data.band[eqBand] < 0 ? (0x10 | (Math.abs(data.band[eqBand]) & 0x0F)) : (data.band[eqBand] & 0x0F))),
		];

		eq_send(band_out);

		log.module(`Sent DSP EQ band ${eqBand} value ${data.band[eqBand]} for memory ${data.memory}`);
		await new Promise(resolve => setTimeout(resolve, 100));
	}

	await new Promise(resolve => setTimeout(resolve, 250));
	dsp_mode(`memory-${data.memory}`);
} // async eq_encode(data)

// Send EQ data to DSP
function eq_send(msg) {
	bus.data.send({
		src : 'DSPC',
		msg,
	});

	// log.module('DSP EQ sent');
}

// Set M-Audio on/off
function m_audio(value) {
	log.module(`Setting M-Audio to '${value}'`);

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
		msg,
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

	switch (value) {
		case 'io-status' : { // Get IO status
			src = 'DIA';
			cmd = [ 0x0B, 0x00 ];
			break;
		}

		case 'memory' : { // Get DSP memory
			src = 'RAD';
			cmd = [ 0x34, 0x08 ];
			break;
		}

		default : {
			log.module(`Invalid value '${value}', cannot request`);
			return;
		}
	}

	log.module(`Requesting '${value}'`);

	bus.data.send({
		src,
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
	dsp_mode,

	eq_decode,
	eq_delta,
	eq_encode,
	eq_send,

	m_audio,

	loudness,

	parse_out,

	request,

	speaker_test,
};
