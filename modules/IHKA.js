var module_name = __filename.slice(__dirname.length + 1, -3);

// Parse data sent from IHKA module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x82: // Broadcast: Rear defroster status
      status.ihka.defroster = bitmask.bit_test(data.msg[1], 0x01);
			data.command = 'bro';
			data.value   = 'defroster status '+status.ihka.defroster;
			break;

		case 0x83: // Broadcast: AC compressor status
			data.command = 'bro';
			data.value   = 'AC compressor status '+data.msg;
      status.ihka.ac = bitmask.bit_test(data.msg[1], 0x80);
			break;

		case 0xA0: // Broadcast: Diagnostic command reply
			data.command = 'diagnostic command';
			data.value   = 'acknowledged: '+data.msg;
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
	}

	log.out(data);
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

  omnibus.data_send.send({
    src: 'GT',
    dst: 'IKE',
    msg: [0x41, cmd],
  });
}

module.exports = {
	aux                : (type, action) => { aux(type, action); },
	parse_out          : (data)         => { parse_out(data); },
	send_device_status : (module_name)  => { bus_commands.send_device_status(module_name); },
};
