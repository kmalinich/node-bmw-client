// Enable/disable aux heat/vent
function aux(data) {
	let cmd;

	// Set command base value based on type argument
	switch (data.type) {
		case 'heat' : cmd = [ 0x11 ]; break;
		case 'vent' : cmd = [ 0x13 ]; break;
	}

	// Add 1 if we're turning it on
	switch (data.action) {
		case true : cmd++;
	}

	bus.data.send({
		src : 'GT',
		dst : 'IKE',
		msg : [ 0x41, cmd ],
	});
}

// Toggle air recirculation
function recirc() {
	// Init variables
	let src = 'MFL';

	let cmds = {
		depress : [ 0x3A, 0x01, 0x34 ], // Recirc depressed
		release : [ 0x3A, 0x01, 0x35 ], // Recirc released
	};

	// Send depress command
	bus.data.send({
		src : src,
		msg : cmds.depress,
	});

	// Send release command after 200ms delay
	setTimeout(() => {
		bus.data.send({
			src : src,
			msg : cmds.release,
		}, 200);
	});
}


// Request various things from IHKA
function request(value) {
	// Init variables
	let src;
	let cmd;

	switch (value) {
		case 'io-status' :
			src = 'DIA';
			cmd = [ 0x0B, 0x04, 0x51 ]; // Get IO status
			// cmd = [0x0B, 0x00]; // Get IO status
			// cmd = [0x0B]; // Get IO status
			break;
	}

	bus.data.send({
		src : src,
		msg : cmd,
	});
}


// Parse data sent from IHKA module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x83 : { // Broadcast: AC compressor status
			update.status('ihka.ac', bitmask.test(data.msg[1], 0x80), false);

			data.command = 'bro';
			data.value   = 'AC compressor status ' + data.msg;
			break;
		}

		case 0x86 : { // Broadcast: Rear defroster status
			update.status('ihka.defroster', bitmask.test(data.msg[1], 0x01), false);

			data.command = 'bro';
			data.value   = 'defroster status ' + status.ihka.defroster;
			break;
		}

		case 0xA0 : { // Reply to DIA: success
			data.command = 'rep';
			data.value   = Buffer.from(data.msg);
			break;
		}

		case 0xB0 : { // Reply: Something else
			data.command = 'rep';
			data.value   = Buffer.from(data.msg);
			break;
		}
	}

	return data;
}


module.exports = {
	aux       : aux,
	parse_out : parse_out,
	recirc    : recirc,
	request   : request,
};
