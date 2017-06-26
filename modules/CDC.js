var module_name = __filename.slice(__dirname.length + 1, -3);

// Parse data sent to CDC module
function parse_in(data) {
	// Init variables
	switch (data.msg[0]) {
		case 0x38: // Control: CD
			// Command
			switch (data.msg[1]) {
				case 0x00 : data.value = 'status';       break;
				case 0x01 : data.value = 'stop';         break;
				case 0x02 : data.value = 'pause';        break;
				case 0x03 : data.value = 'play';         break;
				case 0x04 : data.value = 'fast-forward'; break;
				case 0x05 : data.value = 'fast-reverse'; break;
				case 0x06 : data.value = 'scan-off';     break;
				case 0x07 : data.value = 'end';          break;
				case 0x08 : data.value = 'random-off';   break;
			}

			// Do CDC->LOC CD status play
			send_cd_status(data.value);
			break;
	}
}

// Parse data sent from CDC module
function parse_out(data) {
	// Init variables
	switch (data.msg[0]) {
		case 0x39: // Broadcast: CD status
			data.command = 'sta';
			data.value   = 'CD - ';

			// Command
			switch (data.msg[1]) {
				case 0x00 : data.value += 'stop';         break;
				case 0x01 : data.value += 'pause';        break;
				case 0x02 : data.value += 'play';         break;
				case 0x03 : data.value += 'fast-forward'; break;
				case 0x04 : data.value += 'fast-reverse'; break;
				case 0x07 : data.value += 'end';          break;
				case 0x08 : data.value += 'loading';      break;
			}
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
	}

	log.bus(data);
}

// CDC->RAD CD status
function send_cd_status(value) {
  var bit;

	switch (value) {
		case 'status':
      // Send play or stop status based on vehicle ignition
			bit = (status.vehicle.ignition_level > 0) && 0x02 || 0x00;
			break;

		case 'stop'  : bit = 0x00; break;
		case 'pause' : bit = 0x01; break;
		case 'play'  : bit = 0x02; break;

		case 'fast-forward' : bit = 0x03; break;
		case 'fast-reverse' : bit = 0x04; break;

		case 'end' : bit = 0x00; break;

		case 'scan-off'   : bit = 0x02; break;
		case 'random-off' : bit = 0x02; break;
	}

	socket.data_send({
		src: module_name,
		dst: 'RAD',
		msg: [0x39, bit, 0x00, 0x00, 0x01, 0x00, 0x01, 0x01],
	});
}

module.exports = {
	parse_in       : (data)   => { parse_in(data);        },
	parse_out      : (data)   => { parse_out(data);       },
	send_cd_status : (status) => { send_cd_status(status) },
};
