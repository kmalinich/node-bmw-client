const module_name = __filename.slice(__dirname.length + 1, -3);

// Decode button action message from MFL
function decode_button_media(data) {
  data.command = 'con';
  data.value   = 'media button - ';

  // Bitmask:
  // 0x00 : Nothing
  // 0x01 : button : right
  // 0x02 : ??
  // 0x04 : ??
  // 0x08 : button : left
  // 0x10 : action : hold
  // 0x20 : action : release
  // 0x40 : ??
  // 0x80 : button : voice command (sneezing man)

  let mask   = bitmask.check(data.msg[1]).mask;
  let unmask = {
    actions : {
      press   : !mask.bit4 && !mask.bit5 && !mask.bit8,
      hold    :  mask.bit4 && !mask.bit5 && !mask.bit8,
      release : !mask.bit4 &&  mask.bit5 && !mask.bit8,
    },
    buttons : {
      right :  mask.bit0 && !mask.bit3 && !mask.bit7 && !mask.bit8,
      left  : !mask.bit0 &&  mask.bit3 && !mask.bit7 && !mask.bit8,
      voice : !mask.bit0 && !mask.bit3 &&  mask.bit7 && !mask.bit8,
      none  : !mask.bit0 && !mask.bit3 && !mask.bit7 &&  mask.bit8,
    },
  };

  // Loop action object to populate log string
  for (let action in unmask.actions) {
    if (unmask.actions[action] === true) {
      unmask.action = action;
      break;
    }
  }

  // Loop button object to populate log string
  for (let button in unmask.buttons) {
    if (unmask.buttons[button] === true) {
      unmask.button = button;
      break;
    }
  }

  // Assemble log string
  data.value += unmask.action+' '+unmask.button;
  log.bus(data);

  // Create bitmask for switch statement to use below
  data.media_mask  = 0x00;
  data.media_mask |= config.media.bluetooth   && bitmask.bit[0] || 0x00;
  data.media_mask |= config.media.kodi.enable && bitmask.bit[1] || 0x00;

  switch (data.media_mask) {
    case 0x00: return; // No media services enabled
    case 0x03: return; // Both media services enabled

    case bitmask.bit[0]: // Bluetooth version
      switch (unmask.action+unmask.button) {
        case 'pressleft'  : BT.command('previous'); break;
        case 'pressright' : BT.command('next');     break;
        case 'pressvoice' : BT.command('pause');    break; // Think about it...

            case 'holdleft'  : break;
        case 'holdright' : break;
        case 'holdvoice' : BT.command('play'); break; // Think about it...

            case 'releaseleft'  : break;
        case 'releaseright' : break;
        case 'releasevoice' : break;
      }
      break;

    case bitmask.bit[1]: // Kodi version
      switch (unmask.action+unmask.button) {
        case 'pressleft'  : kodi.command('previous'); break;
        case 'pressright' : kodi.command('next');     break;
        case 'pressvoice' : kodi.command('toggle');   break;

        case 'holdleft'  : break;
        case 'holdright' : break;
        case 'holdvoice' : break;

        case 'releaseleft'  : break;
        case 'releaseright' : break;
        case 'releasevoice' : break;
      }
      break;
  }
}

// Parse data sent from MFL module
function parse_out(data) {
  // 50 B0 01,MFL --> SES: Device status request
  // 50 C8 01,MFL --> TEL: Device status request

  switch (data.msg[0]) {
    case 0x32: // Control: Volume
      data.command = 'con';
      data.value   = 'volume - 1 step ';

      switch (data.msg[1]) {
        case 0x10:
          data.value += 'decrease';
          if (config.media.bluetooth === false && config.media.kodi.enable === true) {
            kodi.volume('down');
          }
          break;
        case 0x11:
          data.value += 'increase';
          if (config.media.bluetooth === false && config.media.kodi.enable === true) {
            kodi.volume('up');
          }
      }
      break;

    case 0x3A: // Button: Recirculation
      data.command = 'con';
      data.value   = 'recirculation button - ';

      switch (data.msg[1]) {
        case 0x00 : data.value += 'release'; break;
        case 0x08 : data.value += 'press';   break;
      }

      break;

    case 0x3B: // Button: Media
      decode_button_media(data);
      return;

    default:
      data.command = 'unk';
      data.value   = Buffer.from(data.msg);
  }

  log.bus(data);
}

module.exports = {
  parse_out : (data) => { parse_out(data); },
};
