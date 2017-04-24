var module_name = __filename.slice(__dirname.length + 1, -3);

// All the possible values to send to the GM
var array_of_possible_values = {
  light_alarm                   : true,
  light_alarm_blink             : true,
  light_interior                : true,
  locks_lock                    : true,
  locks_toggle                  : true,
  locks_trunk                   : true,
  locks_unlock                  : true,
  seat_driver_backrest_backward : true,
  seat_driver_backrest_forward  : true,
  seat_driver_backward          : true,
  seat_driver_down              : true,
  seat_driver_forward           : true,
  seat_driver_headrest_down     : true,
  seat_driver_headrest_up       : true,
  seat_driver_tilt_backward     : true,
  seat_driver_tilt_forward      : true,
  seat_driver_up                : true,
  seat_driver_upper_backwards   : true,
  seat_driver_upper_forwards    : true,
  wheel_backward                : true,
  wheel_down                    : true,
  wheel_forward                 : true,
  wheel_up                      : true,
  window_front_left_down        : true,
  window_front_left_up          : true,
  window_front_right_down       : true,
  window_front_right_up         : true,
  window_rear_left_down         : true,
  window_rear_left_up           : true,
  window_rear_right_down        : true,
  window_rear_right_up          : true,
  window_sunroof_down           : true,
  window_sunroof_up             : true,
  wipers_auto                   : true,
  wipers_maintenance            : true,
  wipers_once                   : true,
  wipers_spray                  : true,
};

// [0x72] Decode a key fob bitmask message, and act upon the results
function decode_status_keyfob(data) {
  data.command = 'bro';

  // 0x00 : no buttons
  if (data.msg[1] == 0x00) {
    data.value = 'key fob button: none';
    log.out(data);
    return;
  }

  if (bitmask.bit_test(data[1], 0x10)) {
    data.value = 'lock';
    omnibus.LCM.welcome_lights(false);
  }
  else if (bitmask.bit_test(data[1], 0x20)) {
    data.value = 'unlock';
    omnibus.LCM.welcome_lights(true);
  }
  else if (bitmask.bit_test(data[1], 0x40)) {
    data.value = 'trunk';
  }
  else {
    data.value = 'unknown: '+data.msg[1];
  }

  data.value = 'key fob button: '+data.value;
  log.out(data);
}

// [0x7A] Decode a door status message from the GM and act upon the results
function decode_status_open(message) {
  // Set status from message by decoding bitmask
  status.doors.front_left  = bitmask.bit_test(message[1], 0x01);
  status.doors.front_right = bitmask.bit_test(message[1], 0x02);
  status.doors.hood        = bitmask.bit_test(message[2], 0x40);
  status.doors.rear_left   = bitmask.bit_test(message[1], 0x04);
  status.doors.rear_right  = bitmask.bit_test(message[1], 0x08);
  status.doors.trunk       = bitmask.bit_test(message[2], 0x20);

  status.lights.interior = bitmask.bit_test(message[1], 0x40);

  status.windows.front_left  = bitmask.bit_test(message[2], 0x01);
  status.windows.front_right = bitmask.bit_test(message[2], 0x02);
  status.windows.rear_left   = bitmask.bit_test(message[2], 0x04);
  status.windows.rear_right  = bitmask.bit_test(message[2], 0x08);
  status.windows.roof        = bitmask.bit_test(message[2], 0x10);

  // This is correct, in a sense... Not a good sense, but in a sense
  status.vehicle.locked = bitmask.bit_test(message[1], 0x20);

  // Set status.doors.sealed var if all doors are closed
  if (
    !status.doors.front_left  &&
    !status.doors.front_right &&
    !status.doors.hood        &&
    !status.doors.rear_left   &&
    !status.doors.rear_right  &&
    !status.doors.trunk
  ) {
    status.doors.sealed = true;
  }
  else {
    status.doors.sealed = false;
  }

  // Set status.windows.sealed var if all windows are closed
  if (
    !status.windows.front_left  &&
    !status.windows.front_right &&
    !status.windows.roof        &&
    !status.windows.rear_left   &&
    !status.windows.rear_right
  ) {
    status.windows.sealed = true;
  }
  else {
    status.windows.sealed = false;
  }

  // Set status.vehicle.sealed var if all doors and windows are closed
  if (status.doors.sealed && status.windows.sealed) {
    status.vehicle.sealed = true;
  }
  else {
    status.vehicle.sealed = false;
  }
}

// Send message to GM
function io_set(packet) {
  // console.log('[node:::GM] Sending \'Set IO status\' packet');
  packet.unshift(0x0C);

  // Set IO status
  omnibus.data_send.send({
    src: 'DIA',
    dst: module_name.toUpperCase(),
    msg: packet,
  });
}

// This is just a dumb placeholder
function io_decode(data) {
  return {
    seat_driver_backrest_backward : bitmask.bit_test(data[0], bitmask.bit[0]),
  }
}

function parse_out(data) {
  switch (data.msg[0]) {
    case 0x72: // Broadcast: Key fob status
      data.command = 'bro';
      data.value   = 'key fob status';
      decode_status_keyfob(data);
      break;

    case 0x76: // Broadcast: 'Crash alarm' ..
      data.command = 'bro';
      switch (data.msg[1]) {
        case 0x00:
          data.value = 'crash alarm: no crash';
          break;
        case 0x02: // A guess
          data.value = 'crash alarm: armed';
          break;
        default:
          data.value = Buffer.from(data.msg[1]);
          break;
      }
      break;

    case 0x77: // Broadcast: Wiper status
      data.command = 'bro';
      switch (data.msg[1]) {
        case 0x0C:
          data.value = 'off';
          break;
        case 0x0D:
          data.value = 'low/auto';
          break;
        case 0x0E:
          data.value = 'medium';
          break;
        case 0x0F:
          data.value = 'high';
          break;
      }
      data.value = 'wiper status: '+data.value;

      status.gm.wiper_status = data.value;
      break;

    case 0x78: // Broadcast: Seat memory data
      data.command = 'bro';
      data.value   = 'seat memory data';
      break;

    case 0x7A: // Broadcast: Door status
      data.command = 'bro';
      data.value   = 'door status';
      decode_status_open(data.msg);
      break;

    case 0xA0: // Reply: Diagnostic command acknowledged
      data.command = 'rep';
      data.value   = Buffer.from(data.msg);
      break;

    default:
      data.command = 'unk';
      data.value   = Buffer.from(data.msg);
      break;
  }

  log.out(data);
}

// This is a horrible trainwreck
function api_command(data) {
  if (typeof data['interior-light'] !== 'undefined') {
    omnibus.GM.interior_light(data['interior-light']);
  }

  // Sort-of.. future-mode.. JSON command.. object? maybe..
  else if (typeof data['command'] !== 'undefined') {
    switch (data['command']) {
      case 'io-status'   : omnibus.GM.request('io-status');   break; // Get IO status
      case 'door-status' : omnibus.GM.request('door-status'); break; // Get IO status
      case 'locks'       : omnibus.GM.locks();                break; // Toggle central locking
      default: // Dunno what I sent
        console.log('[node:::GM] unknown API: \'%s\'', data['command']);
        break;
    }
  }

  // Window control
  else if (typeof data['window'] !== 'undefined') {
    omnibus.GM.windows(data['window'], data['window-action']);
  }

  else {
    console.log('[node:::GM] Unknown data: \'%s\'', data);
  }
}

function windows(window, action) {
  console.log('[node:::GM] Window control: \'%s\', \'%s\'', window, action);

  // Init message variable
  var msg;

  // Switch for window and action
  switch (window) {
    case 'roof': // Moonroof
      switch (action) {
        case 'dn' : msg = [0x03, 0x01, 0x01]; break;
        case 'up' : msg = [0x03, 0x02, 0x01]; break;
        case 'tt' : msg = [0x03, 0x00, 0x01]; break;
      }
      break;
    case 'lf' : // Left front
      switch (action) {
        case 'dn' : msg = [0x01, 0x36, 0x01]; break;
        case 'up' : msg = [0x01, 0x1A, 0x01]; break;
      }
      break;
    case 'rf' : // Right front
      switch (action) {
        case 'dn' : msg = [0x02, 0x20, 0x01]; break;
        case 'up' : msg = [0x02, 0x22, 0x01]; break;
      }
      break;
    case 'lr' : // Left rear
      switch (action) {
        case 'dn' : msg = [0x00, 0x00, 0x01]; break;
        case 'up' : msg = [0x42, 0x01];       break;
      }
      break;
    case 'rr' : // Right rear
      switch (action) {
        case 'dn' : msg = [0x00, 0x03, 0x01]; break;
        case 'up' : msg = [0x43, 0x01];       break;
      }
  }

  io_set(msg);
}

module.exports = {
  // Parse data sent from GM module
  parse_out : (data) => { parse_out(data); },
  // Handle incoming commands from API
  api_command : (data) => { api_command(data); },
  // GM window control
  windows : (window, action) => { windows(window, action); },

  // Cluster/interior backlight
  interior_light : (value) => {
    console.log('[node:::GM] Set interior light to %s', value);
    io_set([0x10, 0x05, value.toString(16)]);
  },

  // Central locking
  locks : () => {
    var action = 'toggle';
    console.log('[node:::GM] Toggle central locking');
    // Hex:
    // 01 3A 01 : LF unlock (CL)
    // 01 39 01 : LF lock   (CL)
    // 02 3A 01 : RF unlock (CL)
    // 02 39 01 : RF lock   (CL)

    // 01 41 01 : Rear lock
    // 01 42 02 : Rear unlock

    // Init message variable
    io_set([0x00, 0x0B]);

    // Send the cluster and Kodi a notification
    var notify_message = 'Toggling door locks';
    omnibus.kodi.notify('GM', notify_message);
    omnibus.IKE.text_override(notify_message)
  },

  // Request various things from GM
  request : (value) => {
    // Init variables
    var src;
    var cmd;

    switch (value) {
      case 'io-status':
        src = 'DIA';
        cmd = [0x08, 0x00]; // Get IO status
        break;
      case 'door-status':
        src = 'BMBT';
        cmd = [0x79];
        break;
    }

    omnibus.data_send.send({
      src : src,
      dst : module_name.toUpperCase(),
      msg : cmd,
    });
  },

  // Encode the GM bitmask string from an input of true/false values
  io_encode : (object) => {
    // Initialize bitmask variables
    var bitmask_0  = 0x00;
    var bitmask_1  = 0x00;
    var bitmask_2  = 0x00;
    var bitmask_3  = 0x00;

    // Set the various bitmask values according to the input object
    if(object.clamp_30a) { bitmask_0 = bitmask.bit_set(bitmask_0, bitmask.bit[0]) ; }

    // Assemble the output object
    var output = [
      bitmask_0,
      bitmask_1,
      bitmask_2,
      bitmask_3,
    ];

    console.log('[node:::GM] io_encode() output: %s', output);
    io_set(output);
  },

  // Decode the GM bitmask string and output an array of true/false values
  io_decode : () => { io_decode(array); },
};
