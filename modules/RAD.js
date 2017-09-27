/* eslint no-console: 0 */

const module_name = __filename.slice(__dirname.length + 1, -3);

// Decode type of audio control command
function decode_audio_control_command(data) {
	// Base units
	// 0x30 - dsp0
	// 0x40 - balance
	// 0x60 - bass
	// 0x80 - fader
	// 0xA0 - source
	// 0xC0 - treble
	// 0xE0 - dsp1+

	let mask = bitmask.check(data.msg[1]).mask;

	// Bounce if bit8 (no bits set) is true
	if (mask.bit8) {
		data.value += 'empty value';
		return;
	}

	let command;
	switch (mask.bit7) {
		case true: { // 7T
			switch (mask.bit6) {
				case true: { // 7T.6T
					switch (mask.bit5) {
						case true: { // 7T.6T.5T
							switch (mask.bit4) {
								case true : // 7T.6T.5T.4T
									break;

								case false : // 7T.6T.5T.4F
									command = 'dsp1';
									break;
							}
							break;
						}

						case false: { // 7T.6T.5F
							switch (mask.bit4) {
								case true : // 7T.6T.5F.4T
									break;

								case false : // 7T.6T.5F.4F
									command = 'treble';
									break;
							}
						} // 7T.6T.5F
					}
					break;
				} // 7T.6T

				case false: { // 7T.6F
					switch (mask.bit5) {
						case true: { // 7T.6F.5T
							switch (mask.bit4) {
								case true : // 7T.6F.5T.4T
									break;

								case false : // 7T.6F.5T.4F
									command = 'source';
									break;
							}
							break;
						}

						case false: { // 7T.6F.5F
							switch (mask.bit4) {
								case true : // 7T.6F.5F.4T
									break;

								case false : // 7T.6F.5F.4F
									command = 'fader';
									break;
							}
						} // 7T.6F.5F
					}
				} // 7T.6F
			}
			break;
		} // 7T

		case false: { // 7F
			switch (mask.bit6) {
				case true: { // 7F.6T
					switch (mask.bit5) {
						case true: { // 7F.6T.5T
							switch (mask.bit4) {
								case true : // 7F.6T.5T.4T
									command = 'bass';
									break;

								case false : // 7F.6T.5T.4F
									break;
							}
							break;
						}

						case false: { // 7F.6T.5F
							switch (mask.bit4) {
								case true : // 7F.6T.5F.4T
									command = 'balance';
									break;

								case false : // 7F.6T.5F.4F
									break;
							}
						} // 7F.6T.5F
					}
					break;
				} // 7F.6T

				case false: { // 7F.6F
					switch (mask.bit5) {
						case true: { // 7F.6F.5T
							switch (mask.bit4) {
								case true : // 7F.6F.5T.4T
									command = 'dsp0';
									break;

								case false : // 7F.6F.5T.4F
									break;
							}
							break;
						}

						case false: { // 7F.6F.5F
							switch (mask.bit4) {
								case true : // 7F.6F.5F.4T
									break;

								case false : // 7F.6F.5F.4F
									break;
							}
						} // 7F.6F.5F
					}
				} // 7F.6F
			}
		} // 7F
	}

	return command;
}

// Decode various audio control/DSP/EQ commands
function decode_audio_control(data) {
	data.command = 'con';
	data.value   = 'audio ';

	// Base units
	// 0x30 - dsp0
	// 0x40 - balance
	// 0x50 - balance?
	// 0x60 - bass
	// 0x80 - fader
	// 0xA0 - source
	// 0xC0 - treble
	// 0xE0 - dsp1+

	let cmd_value;
	let cmd_type = decode_audio_control_command(data);
	switch (cmd_type) {
		case 'balance' : cmd_value = data.msg[1] - 0x50; break;
		case 'bass'    : cmd_value = data.msg[1] - 0x60; break;
		case 'dsp0'    : cmd_value = data.msg[1] - 0x30; break;
		case 'dsp1'    : cmd_value = data.msg[1] - 0xE0; break;
		case 'fader'   : cmd_value = data.msg[1] - 0x80; break;
		case 'source'  : cmd_value = data.msg[1] - 0xA0; break;
		case 'treble'  : cmd_value = data.msg[1] - 0xC0; break;
		default        :
			data.value += 'unknown cmd_type ' + cmd_type + ' - 0x' + data.msg[1].toString(16);
			return data;
	}

	// Further command-type-specific processing
	switch (cmd_type) {
		case 'source':
			switch (cmd_value) {
				case 0x00 : status.rad.source_name = 'cd';         break;
				case 0x01 : status.rad.source_name = 'tuner/tape'; break;
				case 0x0F : status.rad.source_name = 'off';
			}

			// Technically not legit
			data.value += 'source ' + status.rad.source_name;
			break;

		default:
			// Technically not legit
			data.value += 'command ' + cmd_type + ' ' + cmd_value;
	}

	// Update status var with interpreted value
	status.rad[cmd_type] = cmd_value;

	return data;
}

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
					status.dsp.m_audio = false;
					break;

				case 0x91:
					data.value += 'EQ button: M-Audio on';
					status.dsp.m_audio = true;
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
			data = decode_audio_control(data);
			break;

		case 0x38: // Control: CD
			data.command = 'con';
			data.value   = 'CD - ';

			// Command
			switch (data.msg[1]) {
				case 0x00 : data.value += 'status';       break;
				case 0x01 : data.value += 'stop';         break;
				case 0x02 : data.value += 'pause';        break;
				case 0x03 : data.value += 'play';         break;
				case 0x04 : data.value += 'fast-forward'; break;
				case 0x05 : data.value += 'fast-reverse'; break;
				case 0x06 : data.value += 'scan-off';     break;
				case 0x07 : data.value += 'end';          break;
				case 0x08 : data.value += 'random-off';   break;
			}
			break;

		case 0x4A: // Control: Cassette
			BMBT.send_cassette_status(data.msg[1]);

			data.command = 'con';
			data.value   = 'cassette: ';

			switch (data.msg[1]) {
				case 0x00 : data.value += 'power off'; break;
				case 0xFF : data.value += 'power on';  break;
				default   : data.value += 'unknown 0x' + data.msg[1].toString(16);
			}
			break;

		case 0x46: // Control: LCD
			data.command = 'con';
			data.value   = 'LCD: ';

			switch (data.msg[1]) {
				case 0x0E : data.value += 'off'; break;
				default   : data.value += data.msg[1];
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
