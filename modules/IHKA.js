var module_name = __filename.slice(__dirname.length + 1, -3);

// Parse data sent from IHKA module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x83: // Broadcast: AC compressor status
      status.ihka.ac = bitmask.test(data.msg[1], 0x80);
			data.command = 'bro';
			data.value   = 'AC compressor status '+data.msg;
			break;

		case 0x86: // Broadcast: Rear defroster status
      status.ihka.defroster = bitmask.test(data.msg[1], 0x01);
			data.command = 'bro';
			data.value   = 'defroster status '+status.ihka.defroster;
			break;

		case 0xA0: // Broadcast: Diagnostic command reply
			data.command = 'rep';
			data.value   = 'diagnostic command acknowledged: '+data.msg;
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
	}

	log.bus(data);
}

// Enable/disable aux heat/vent
function aux(type, action) {
  var cmd;

  // Set command base value based on type argument
  switch (type) {
    case 'heat' : cmd = [0x11]; break;
    case 'vent' : cmd = [0x13]; break;
  }

  // Add 1 if we're turning it on
  switch (action) {
    case true : cmd++; break;
  }

  socket.data_send({
    src: 'GT',
    dst: 'IKE',
    msg: [0x41, cmd],
  });
}

// Request various things from IHKA
function request(value) {
	// Init variables
	var src;
	var cmd;

	switch (value) {
		case 'io-status':
			src = 'DIA';
			cmd = [0x0B, 0x04, 0x51]; // Get IO status
			break;
	}

	socket.data_send({
		src : src,
		dst : module_name,
		msg : cmd,
	});
}

module.exports = {
	aux       : (type, action) => { aux(type, action); },
	parse_out : (data)         => { parse_out(data);   },
	request   : (value)        => { request(value);    },
};
