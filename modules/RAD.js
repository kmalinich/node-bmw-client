var module_name = __filename.slice(__dirname.length + 1, -3);

// Parse data sent from RAD module
function parse_out(data) {
  // Init variables
  var command;
  var value;

  // Device status
  switch (data.msg[0]) {
    case 0x21: // Update menu text
      data.command = 'con';
      data.value   = 'menu text';
      break;

    case 0x23: // Update display text
      data.command = 'con';
      data.value   = 'display text';
      break;

    case 0x32: // Volume control
      data.command = 'con';
      data.value   = 'volume '+data.msg[1];
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
          break;

        case 0xA1:
          data.value = data.value+'tuner/tape';
          status.rad.audio_control = data.value;
          break;

        default:
          data.value = data.value+data.msg[1];
          status.rad.audio_control = data.value;
          break;
      }
      break;

		case 0x4A: // Control: Cassette
      return;
      data.command = 'con';
      data.value   = 'cassette control '+data.msg[1];
      break;

		case 0x46: // Control: LCD
      data.command = 'con';
      data.value   = 'LCD status ';

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

		case 0xA5: // Control: Screen text
      data.command = 'con';
      data.value   = 'screen text TODO';
      break;

    default:
      data.command = 'unk';
      data.value   = Buffer.from(data.msg);
  }

  log.out(data);
}

// Turn on/off/flash the RAD LED by encoding a bitmask from an input object
function led(object) {
  // Bitmask
  // 0x00 = all off
  // 0x01 = solid red
  // 0x02 = flash red
  // 0x04 = solid yellow
  // 0x08 = flash yellow
  // 0x10 = solid green
  // 0x20 = flash green

  // Initialize output byte
  var byte = 0x00;

  if (object.solid_red)    { byte = bitmask.bit_set(byte, bitmask.bit[0]); }
  if (object.flash_red)    { byte = bitmask.bit_set(byte, bitmask.bit[1]); }
  if (object.solid_yellow) { byte = bitmask.bit_set(byte, bitmask.bit[2]); }
  if (object.flash_yellow) { byte = bitmask.bit_set(byte, bitmask.bit[3]); }
  if (object.solid_green)  { byte = bitmask.bit_set(byte, bitmask.bit[4]); }
  if (object.flash_green)  { byte = bitmask.bit_set(byte, bitmask.bit[5]); }

  // Send message
  console.log('[node::RAD] Sending \'RAD LED\' packet');
  omnibus.data_send.send({
    src: 'TEL',
    dst: 'OBC',
    msg: [command, byte], // Turn on radio LED
  });
}

module.exports = {
  led                : () => { led(object); },
  parse_out          : (data) => { parse_out(data); },
  send_device_status : (module_name) => { bus_commands.send_device_status(module_name); },
};
