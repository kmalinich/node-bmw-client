/* eslint key-spacing : 0 */

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
		case true : { // 7T
			switch (mask.bit6) {
				case true : { // 7T.6T
					switch (mask.bit5) {
						case true : { // 7T.6T.5T
							switch (mask.bit4) {
								case true : // 7T.6T.5T.4T
									break;

								case false : // 7T.6T.5T.4F
									command = 'dsp1';
									break;
							}
							break;
						}

						case false : { // 7T.6T.5F
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

				case false : { // 7T.6F
					switch (mask.bit5) {
						case true : { // 7T.6F.5T
							switch (mask.bit4) {
								case true : // 7T.6F.5T.4T
									break;

								case false : // 7T.6F.5T.4F
									command = 'source';
									break;
							}
							break;
						}

						case false : { // 7T.6F.5F
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

		case false : { // 7F
			switch (mask.bit6) {
				case true : { // 7F.6T
					switch (mask.bit5) {
						case true : { // 7F.6T.5T
							switch (mask.bit4) {
								case true : // 7F.6T.5T.4T
									command = 'bass';
									break;

								case false : // 7F.6T.5T.4F
									break;
							}
							break;
						}

						case false : { // 7F.6T.5F
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

				case false : { // 7F.6F
					switch (mask.bit5) {
						case true : { // 7F.6F.5T
							switch (mask.bit4) {
								case true : // 7F.6F.5T.4T
									command = 'dsp0';
									break;

								case false : // 7F.6F.5T.4F
									break;
							}
							break;
						}

						case false : { // 7F.6F.5F
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

		default : {
			data.value += 'unknown cmd_type ' + cmd_type + ' - 0x' + data.msg[1].toString(16);
			return data;
		}
	}
	// console.log('cmd_values : %s => %s', '0x' + data.msg[1].toString(16), '0x' + cmd_value.toString(16));

	// Further command-type-specific processing
	switch (cmd_type) {
		case 'source' : {
			switch (cmd_value) {
				case 0x00 :
				case 0xA0 : update.status('rad.source_name', 'cd'); break;

				case 0x01 :
				case 0xA1 : update.status('rad.source_name', 'tuner/tape'); break;

				case 0x0F :
				case 0xAF : update.status('rad.source_name', 'off');
			}

			// Technically not legit
			data.value += 'source ' + status.rad.source_name;
			break;
		}

		default : {
			// Technically not legit
			data.value += 'command ' + cmd_type + ' ' + cmd_value;
		}
	}

	// Update status var with interpreted value
	update.status('rad.' + cmd_type, cmd_value);

	return data;
}

function decode_bm_button(data) {
	let action = 'depress';
	let button;

	// Determine action
	let mask = bitmask.check(data.msg[1]).mask;
	switch (mask.b6) {
		case true : {
			switch (mask.b7) {
				case true  : break;
				case false : {
					// Remove hold bit from button value
					data.msg[1] = bitmask.unset(data.msg[1], bitmask.b[6]);
					action      = 'hold';
				}
			}
			break;
		}

		case false : {
			switch (mask.b7) {
				case false : break;
				case true  : {
					// Remove release bit from button value
					data.msg[1] = bitmask.unset(data.msg[1], bitmask.b[7]);
					action      = 'release';
				}
			}
		}
	}

	// Determine button
	switch (data.msg[1]) {
		case 0x00 : button = 'right';    break;
		case 0x01 : button = '2';        break;
		case 0x02 : button = '4';        break;
		case 0x03 : button = '6';        break;
		case 0x04 : button = 'tone';     break;
		case 0x05 : button = 'knob';     break;
		case 0x06 : button = 'power';    break;
		case 0x07 : button = 'clock';    break;
		case 0x08 : button = 'phone';    break;
		case 0x10 : button = 'left';     break;
		case 0x11 : button = '1';        break;
		case 0x12 : button = '3';        break;
		case 0x13 : button = '5';        break;
		case 0x14 : button = '<>';       break;
		case 0x20 : button = 'select';   break;
		case 0x21 : button = 'am';       break;
		case 0x22 : button = 'rds';      break;
		case 0x23 : button = 'mode';     break;
		case 0x24 : button = 'eject';    break;
		case 0x30 : button = 'rad menu'; break;
		case 0x31 : button = 'fm';       break;
		case 0x32 : button = 'pty/tp';   break;
		case 0x33 : button = 'dolby';    break;
		case 0x34 : button = 'gt menu';  break;
		case 0x38 : button = 'info';     break;
		default   : button = 'Unknown';
	}

	data.value += action + ' ' + button;

	switch (action) {
		case 'release' : {
			switch (button) {
				case 'power' : {
					log.module('[0x' + data.msg[1].toString(16) + '] Received BMBT button: ' + action + ' ' + button);
					audio_power('toggle');
					break;
				}
			}

			break;
		}
	}

	return data;
}


// Parse data sent to RAD module
function parse_in(data) {
	switch (data.msg[0]) {
		case 0x01 : {
			// When RAD receives a device status request, send DSP a device status request
			bus.cmds.request_device_status('RAD', 'DSP');
			break;
		}

		case 0x47 : { // Broadcast: BM status
			return data;
		}

		case 0x48 : { // Broadcast: BM button
			data = decode_bm_button(data);
			break;
		}

		case 0x49 : { // Broadcast: BM knob
			return data;
		}

		case 0x4B : { // Broadcast: Cassette status
			return data;
		}

		default : {
			return data;
		}
	}
}

// Parse data sent from RAD module
function parse_out(data) {
	// Device status
	switch (data.msg[0]) {
		case 0x34 : { // Control: DSP
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

				case 0x90 : {
					data.value += 'EQ button: M-Audio off';
					// Not really the right place to set this var
					// It should be in the status from DSP itself
					update.status('dsp.m_audio', false);
					break;
				}

				case 0x91 : {
					data.value += 'EQ button: M-Audio on';
					update.status('dsp.m_audio', true);
					break;
				}

				case 0x95 : {
					data.value += 'memory set';
					update.status('dsp.m_audio', false);
					break;
				}

				default : {
					data.value = Buffer.from(data.msg);
				}
			}
			break;
		}

		case 0x36 : { // Audio control (i.e. source)
			data = decode_audio_control(data);
			break;
		}

		case 0x38 : { // Control: CD
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
				case 0x08 : data.value += 'random-off';
			}

			break;
		}

		case 0x4A : { // Control: Cassette
			BMBT.cassette_status(data.msg[1]);

			data.command = 'con';
			data.value   = 'cassette: ';

			switch (data.msg[1]) {
				case 0x00 : data.value += 'power off'; break;
				case 0xFF : data.value += 'power on';  break;
				default   : data.value += 'unknown 0x' + data.msg[1].toString(16);
			}
			break;
		}

		case 0x46 : { // Control: LCD
			data.command = 'con';
			data.value   = 'LCD: ';

			switch (data.msg[1]) {
				case 0x0E : data.value += 'off'; break;
				default   : data.value += data.msg[1];
			}
			break;
		}

		case 0xA5 : { // Control: Screen text
			data.command = 'con';
			data.value   = 'screen text TODO';
			break;
		}

		default : {
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
		}
	}

	log.bus(data);
}

// Send audio control commands
function audio_control(command) {
	if (config.chassis.model !== 'e39') return;

	let cmd = 0x36;

	let msgs = {
		off : [ cmd, 0xAF ],

		dsp : {
			function_0 : [ cmd, 0xE1 ],
			function_1 : [ cmd, 0x30 ],
		},

		source : {
			cd        : [ cmd, 0xA0 ],
			tunertape : [ cmd, 0xA1 ],
		},

	};

	let msg;

	switch (command) {
		case 'cd changer' :
		case 'cd'         :
		case 'cd-changer' :
		case 'cdc'        : {
			command = 'source cd changer';
			msg     = msgs.source.cd;
			break;
		}

		case 'dsp-0' : {
			command = 'DSP function 0';
			msg     = msgs.dsp.function_0;
			break;
		}

		case 'dsp-1' : {
			command = 'DSP function 1';
			msg     = msgs.dsp.function_1;
			break;
		}

		case 1            :
		case true         :
		case 'tape'       :
		case 'tuner'      :
		case 'tuner/tape' :
		case 'tunertape'  :
		case 'power on'   :
		case 'power'      :
		case 'power-on'   :
		case 'poweron'    :
		case 'on'         : {
			command = 'source tuner/tape';
			msg     = msgs.source.tunertape;
			break;
		}

		case 0           :
		case false       :
		case 'off'       :
		case 'power off' :
		case 'power-off' :
		case 'poweroff'  :
		default          : {
			command = 'power off';
			msg     = msgs.off;
		}
	}

	log.module('Sending audio control: ' + command);

	bus.data.send({
		src : module_name,
		dst : 'LOC',
		msg : msg,
	});
}

function cassette_control(command) {
	if (config.chassis.model !== 'e39') return;

	let cmd = 0x4A;

	let msgs = {
		on  : [ cmd, 0xFF ],
		off : [ cmd, 0x00 ],
	};

	let msg;

	switch (command) {
		case 1          :
		case true       :
		case 'on'       :
		case 'power on' :
		case 'power'    :
		case 'power-on' :
		case 'poweron'  : {
			command = 'power on';
			msg     = msgs.on;
			break;
		}

		case 0           :
		case false       :
		case 'off'       :
		case 'power off' :
		case 'power-off' :
		case 'poweroff'  :
		default          : {
			command = 'power off';
			msg     = msgs.off;
		}
	}

	log.module('Sending cassette control: ' + command);

	bus.data.send({
		src : module_name,
		dst : 'BMBT',
		msg : msg,
	});
}

function volume_control(value = 1) {
	if (config.chassis.model !== 'e39') return;

	let msg_value;
	switch (value) {
		case 5 : msg_value = 0x51; break;
		case 4 : msg_value = 0x41; break;
		case 3 : msg_value = 0x31; break;
		case 2 : msg_value = 0x21; break;
		case 1 : msg_value = 0x11; break;

		case -5 : msg_value = 0x50; break;
		case -4 : msg_value = 0x40; break;
		case -3 : msg_value = 0x30; break;
		case -2 : msg_value = 0x20; break;
		case -1 : msg_value = 0x10; break;

		default : return;
	}

	// log.module('Sending volume control: ' + value);

	bus.data.send({
		src : 'MID',
		dst : module_name,
		msg : [ 0x32, msg_value ],
	});
}


// Power on DSP amp and GPIO pin for amplifier
function audio_power(power_state) {
	if (config.chassis.model !== 'e39') return;

	// Bounce if we're not configured to emulate the RAD module
	if (config.emulate.rad !== true) return;

	switch (power_state) {
		case 'toggle' : {
			log.module('Toggling audio power, current source: ' + status.rad.source_name);
			audio_power((status.rad.source_name === 'off'));
			return;
		}

		case 0     :
		case 'off' :
		case false : {
			log.module('Setting audio power to state : ' + power_state);

			audio_control(false);
			cassette_control(false);

			update.status('dsp.ready', false);
			update.status('dsp.reset', true);

			break;
		}

		case 1    :
		case 'on' :
		case true : {
			if (status.power.active !== true) return;

			log.module('Setting audio power to state : ' + power_state);

			// Send device status
			bus.cmds.send_device_status(module_name);

			// Request status from BMBT, CDC, DSP, and MID (this should be a loop)
			let array_request = [ 'BMBT', 'CDC', 'DSP', 'MID' ];
			array_request.forEach((module_request) => {
				bus.cmds.request_device_status(module_name, module_request);
			});

			// Set DSP source to whatever is configured
			audio_control(config.media.dsp.default_source);

			// Turn on BMBT
			setTimeout(() => { cassette_control(true); }, 250);

			// DSP powers up with volume set to 0, so bring up volume by configured amount
			setTimeout(() => {
				for (let pass = 0; pass < config.rad.power_on_volume; pass++) {
					setTimeout(() => { volume_control(5); }, 6 * pass);
				}
			}, 350);
		}
	}
}


function init_listeners() {
	// Bounce if we're not configured to emulate the RAD module or not in an E39
	if (config.chassis.model !== 'e39') return;
	if (config.emulate.rad   !== true)  return;

	// Perform commands on power lib active event
	update.on('status.power.active', (data) => {
		setTimeout(() => { audio_power(data.new); }, 150);
	});

	// Kick DSP amp on engine restart
	IKE.on('ignition-start-end', () => {
		setTimeout(() => { audio_power(true); }, 500);
	});

	log.msg('Initialized listeners');
}


module.exports = {
	parse_in  : parse_in,
	parse_out : parse_out,

	init_listeners : init_listeners,

	audio_power      : audio_power,
	audio_control    : audio_control,
	cassette_control : cassette_control,
	volume_control   : volume_control,
};
