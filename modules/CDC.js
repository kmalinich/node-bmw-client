// Parse data sent to CDC module
function parse_in(data) {
	// Bounce if emulation isn't enabled
	if (config.emulate.cdc !== true) return;

	// Init variables
	switch (data.msg[0]) {
		case 0x38 : { // Control: CD
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
				case 0x08 : data.value = 'random-off';
			}

			// Do CDC->LOC CD status play
			cd_status(data.value);
		}
	}
}

// Parse data sent from CDC module
function parse_out(data) {
	// Init variables
	switch (data.msg[0]) {
		case 0x39 : { // Broadcast: CD status
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
				case 0x08 : data.value += 'loading';
			}
		}
	}

	return data;
}

// CDC->RAD CD status
function cd_status(value) {
	// Bounce if emulation isn't enabled
	if (config.emulate.cdc !== true) return;

	let bit;
	switch (value) {
		case 'status' : {
			// Send play or stop status based on vehicle ignition
			bit = (status.vehicle.ignition_level > 0) && 0x02 || 0x00;
			break;
		}

		case 'stop'  : bit = 0x00; break;
		case 'pause' : bit = 0x01; break;
		case 'play'  : bit = 0x02; break;

		case 'fast-forward' : bit = 0x03; break;
		case 'fast-reverse' : bit = 0x04; break;

		case 'end' : bit = 0x00; break;

		case 'scan-off'   : bit = 0x02; break;
		case 'random-off' : bit = 0x02;
	}

	log.module('Sending CD status: ' + value);

	bus.data.send({
		src : 'CDC',
		dst : 'RAD',
		msg : [ 0x39, bit, 0x00, 0x00, 0x01, 0x00, 0x01, 0x01 ],
	});
}


module.exports = {
	cd_status : cd_status,

	parse_in  : parse_in,
	parse_out : parse_out,
};
