const module_name = __filename.slice(__dirname.length + 1, -3);

// Parse data sent from RAD module
function parse_out(data) {
	// Device status
	switch (data.msg[0]) {
		case 0x34: // DSP control
			data.command = 'con';
			data.value   = 'DSP - ';

			switch (data.msg[1]) {
				case 0x08 : data.value += 'memory get';                break;
				case 0x09 : data.value += 'EQ button: concert hall';   break;
				case 0x0A : data.value += 'EQ button: jazz club';      break;
				case 0x0B : data.value += 'EQ button: cathedral';      break;
				case 0x0C : data.value += 'EQ button: memory 1';       break;
				case 0x0D : data.value += 'EQ button: memory 2';       break;
				case 0x0E : data.value += 'EQ button: memory 3';       break;
				case 0x0F : data.value += 'EQ button: DSP off';        break;
				case 0x28 : data.value += 'EQ button: unknown (0x28)'; break;

				case 0x90:
					data.value += 'EQ button: M-Audio off';
					// Not really the right place to set this var
					// It should be in the status from DSP itself
					status.dsp.m_audio = true;
					break;

				case 0x91:
					data.value += 'EQ button: M-Audio on';
					status.dsp.m_audio = false;
					break;

				case 0x95:
					data.value += 'memory set';
					status.dsp.m_audio = false;
					break;

				default:
					data.value = Buffer.from(data.msg);
			}
			break;

		case 0x36: // Audio control (i.e. source)
			data.command = 'con';
			data.value   = 'audio ';

			switch (data.msg[1]) {
				case 0xAF:
					data.value += 'off';
					status.rad.audio_control = data.value;
					break;

				case 0xA1:
					data.value += 'tuner/tape';
					status.rad.audio_control = data.value;
					break;

				default:
					data.value += data.msg;
					status.rad.audio_control = data.value;
			}
			break;

		case 0x38: // Control: CD
			data.command = 'con';
			data.value   = 'CD - ';

			// Command
			switch (data.msg[1]) {
				case 0x00: data.value += 'status';       break;
				case 0x01: data.value += 'stop';         break;
				case 0x02: data.value += 'pause';        break;
				case 0x03: data.value += 'play';         break;
				case 0x04: data.value += 'fast-forward'; break;
				case 0x05: data.value += 'fast-reverse'; break;
				case 0x06: data.value += 'scan-off';     break;
				case 0x07: data.value += 'end';          break;
				case 0x08: data.value += 'random-off';   break;
			}
			break;

		case 0x4A: // Control: Cassette
			BMBT.send_cassette_status(data.msg[1]);

			data.command = 'con';
			data.value   = 'cassette: ';

			switch (data.msg[1]) {
				case 0x00:
					data.value += 'power off';
					break;
				case 0xFF:
					data.value += 'power on';
					break;
				default:
					data.value += 'unknown 0x' + data.msg[1].toString(16);
			}
			break;

		case 0x46: // Control: LCD
			data.command = 'con';
			data.value   = 'LCD: ';

			switch (data.msg[1]) {
				case 0x0E:
					data.value += 'off';
					break;

				default:
					data.value += data.msg[1];
			}
			break;

		case 0xA5: // Control: Screen text
			data.command = 'con';
			data.value   = 'screen text TODO';
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
	}

	log.bus(data);
}

function send_audio_control(source) {
	let msg_tunertape = [ 0x36, 0xA1 ];
	let msg_cd        = [ 0x36, 0xA0 ];
	let msg;

	switch (source) {
		case 'cd'         : msg = msg_cd;        break;
		case 'tuner/tape' : msg = msg_tunertape; break;
	}

	log.module({ msg : 'Sending audio control: ' + source });

	bus.data.send({
		src : module_name,
		dst : 'LOC',
		msg : msg,
	});
}

module.exports = {
	parse_out          : (data)   => { parse_out(data);            },
	send_audio_control : (source) => { send_audio_control(source); },
};
