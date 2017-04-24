// Test number for bitmask
function bit_test(num, bit) {
  if ((num & bit) != 0) { return true; }
  else { return false; }
}

var data_1;
var data_2;
var data_3;
var data_4;
var data_5;
var data_6;
var data_7;
var echo;

var dsp_modes = {
	0 : 'concert hall',
	1 : 'jazz club',
	2 : 'cathedral',
	3 : 'memory 1',
	4 : 'memory 2',
	5 : 'memory 3',
	6 : 'DSP off',
}

function decode_dsp(data) {
  dsp_mode  = data[1] - 1;
  reverb    = data[2] & 0x0F;

  if (bit_test(data[2], 0x10)) {
    reverb *= -1;
  }

  room_size = data[3] & 0x0F;
  if (bit_test(data[3], 0x10)) {
    room_size *= -1;
  }

  var band = [];
  var n;

  for (n = 0; n<7; n++) {
    band[n] = data[4+n] & 0x0F;

    if(bit_test(data[4+n], 0x10)) {
      band[n]*=-1;
    }
  }

  console.log('DSP mode  : %s', dsp_modes[dsp_mode]);
  console.log('Reverb    : %s/10', reverb);
  console.log('Room size : %s/10', room_size);
  console.log('----------------');
  console.log('80Hz      : %s/10', band[0]);
  console.log('200Hz     : %s/10', band[1]);
  console.log('500Hz     : %s/10', band[2]);
  console.log('1KHz      : %s/10', band[3]);
  console.log('2KHz      : %s/10', band[4]);
  console.log('5KHz      : %s/10', band[5]);
  console.log('12KHz     : %s/10', band[6]);
  console.log('----------------');
}

function encode_dsp(data) {
  var memory        = 1;
  var reverb_out    = [0x34, 0x94 + data.memory, data.reverb & 0x0F];
  var room_size_out = [0x34, 0x94 + data.memory, (data.room_size & 0x0F) | 0x20];

  console.log(Buffer.from(reverb_out));
  console.log(Buffer.from(room_size_out));

  for (var band_num = 0; band_num < 7; band_num++) {
    // ... Don't look at me...
    var band_out = [0x34, 0x14 + data.memory, (((band_num * 2) << 4) & 0xF0) | ((data.band[band_num] < 0 ? (0x10 | (Math.abs(data.band[band_num]) & 0x0F)) : (data.band[band_num] & 0x0F)))];
    console.log(Buffer.from(band_out));
  }

}

data_1 = [0x35, 0x04, 0x04, 0x21, 0x0A, 0x27, 0x45, 0x71, 0x84, 0xA9, 0xCA];
data_2 = [0x35, 0x04, 0x04, 0x23, 0x05, 0x23, 0x41, 0x72, 0x91, 0xA9, 0xC9];
data_3 = [0x35, 0x05, 0x01, 0x23, 0x08, 0x22, 0x42, 0x61, 0x82, 0xA5, 0xC8];
data_4 = [0x35, 0x04, 0x00, 0x23, 0x03, 0x27, 0x48, 0x67, 0x8a, 0xA9, 0xC8]; // kdm-e39 mode 4
data_5 = [0x35, 0x06, 0x00, 0x20, 0x00, 0x20, 0x40, 0x60, 0x80, 0xA0, 0xC0]; // Flat
data_6 = [0x35, 0x05, 0x00, 0x20, 0x0A, 0x27, 0x42, 0x77, 0x93, 0xA6, 0xCA]; // kdm-e39 - good preset
data_7 = [0x35, 0x04, 0x01, 0x23, 0x03, 0x27, 0x48, 0x67, 0x8A, 0xA9, 0xC8];

decode_dsp(data_1);
decode_dsp(data_2);
decode_dsp(data_3);
decode_dsp(data_4);
decode_dsp(data_5);
decode_dsp(data_6);
decode_dsp(data_7);

var dsp_data = {
  memory    : 2,
  reverb    : 10,
  room_size : 10,
  band      : {
    0 : 10,
    1 : 5,
    2 : -3,
    3 : -4,
    4 : -3,
    5 : 5,
    6 : 9,
  },
}

// encode_dsp(dsp_data);
