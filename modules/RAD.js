var module_name = __filename.slice(__dirname.length + 1, -3);

// Parse data sent from RAD module
function parse_out(data) {
  // Init variables
  var command;
  var value;

  // Device status
  switch (data.msg[0]) {
    case 0x32: // Volume control
      data.command = 'con';
      data.value   = 'volume '+data.msg;
      break;

    case 0x34: // DSP control
      data.command = 'con';
      data.value   = 'DSP ';

      switch (data.msg[1]) {
        case 0x08:
          data.value = data.value+'memory get';
          break;

        case 0x09:
          data.value = data.value+'EQ button: concert hall';
          break;
        case 0x0A:
          data.value = data.value+'EQ button: jazz club';
          break;
        case 0x0B:
          data.value = data.value+'EQ button: cathedral';
          break;
        case 0x0C:
          data.value = data.value+'EQ button: memory 1';
          break;
        case 0x0D:
          data.value = data.value+'EQ button: memory 2';
          break;
        case 0x0E:
          data.value = data.value+'EQ button: memory 3';
          break;
        case 0x0F:
          data.value = data.value+'EQ button: DSP off';
          break;
        case 0x28:
          data.value = data.value+'EQ button: unknown (0x28)';
          break;

        case 0x90:
          data.value = data.value+'EQ button: M-Audio off';
          // Not really the right place to set this var
          // It should be in the status from DSP itself
          status.dsp.m_audio = true;
          break;

        case 0x91:
          data.value = data.value+'EQ button: M-Audio on';
          status.dsp.m_audio = false;
          break;

        case 0x95:
          data.value = data.value+'memory set';
          status.dsp.m_audio = false;
          break;

        default:
          return;
      }

      break;

    case 0x36: // Audio control (i.e. source)
      data.command = 'con';
      data.value   = 'audio '

      switch (data.msg[1]) {
        case 0xAF:
          data.value = data.value+'off';
          status.rad.audio_control = data.value;

					IKE.text_override('BMBT power ('+module_name+')');
					kodi.notify('BMBT', 'power ('+module_name+')');

					setTimeout(() => {
						BMBT.power_on_if_ready();
						MID.power_on_if_ready();
					}, 4000);
          break;

        case 0xA1:
          data.value = data.value+'tuner/tape';
          status.rad.audio_control = data.value;
          break;

        default:
          data.value = data.value+data.msg;
          status.rad.audio_control = data.value;
          break;
      }
      break;

		case 0x38: // Control: CD
			data.command = 'con'
			data.value   = data.msg;

			// Command
			switch (data.msg[1]) {
				case 0x00: data.value = 'status';       break;
				case 0x01: data.value = 'stop';         break;
				case 0x02: data.value = 'pause';        break;
				case 0x03: data.value = 'play';         break;
				case 0x04: data.value = 'fast-forward'; break;
				case 0x05: data.value = 'fast-reverse'; break;
				case 0x06: data.value = 'scan-off';     break;
				case 0x07: data.value = 'end';          break;
				case 0x08: data.value = 'random-off';   break;
			}

			data.value = 'CD: '+data.value;
			break;

		case 0x4A: // Control: Cassette
      return;
      data.command = 'con';
      data.value   = 'cassette '+data.msg;
      break;

		case 0x46: // Control: LCD
      data.command = 'con';
      data.value   = 'LCD: ';

      switch (data.msg[1]) {
        case 0x0E:
          data.value = data.value+'off';
          break;

        default:
          data.value = data.value+data.msg[1];
          break;
      }
      break;

		case 0xA5: // Control: Screen text
      data.command = 'con';
      data.value   = 'screen text TODO';
      break;

    default: data.command = 'unk';
  }

  log.bus(data);
}

function send_audio_control(source) {
	log.module({ src : module_name, msg : 'Sending audio control: tuner/tape' });
  socket.data_send({
    src: module_name,
		dst: 'LOC',
		msg : [0x36, 0xA1],
	});
}

module.exports = {
  parse_out          : (data)        => { parse_out(data);                              },
  send_audio_control : (source)      => { send_audio_control(source);                   },
  send_device_status : (module_name) => { bus_commands.send_device_status(module_name); },
};
