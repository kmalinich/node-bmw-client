// General module
function gm(object, action) {
	var FoldMirrorsE46           = Buffer.from([0x9b, 0x51, 0x6d, 0x90]);
	var UnfoldMirrorsE46         = Buffer.from([0x9b, 0x51, 0x6d, 0xa0]);

	var gm_locks_toggle          = Buffer.from([0x0c, 0x00, 0x0b]);
	var gm_trunk                 = Buffer.from([0x0c, 0x00, 0x40]);

	var gm_windows_sunroof_down  = Buffer.from([0x0c, 0x00, 0x66]);
	var gm_windows_drv_rear_up   = Buffer.from([0x0c, 0x00, 0x01]);
	var gm_windows_drv_rear_down = Buffer.from([0x0c, 0x00, 0x00]);
	var gm_windows_pss_rear_down = Buffer.from([0x0c, 0x00, 0x47]);
	var gm_windows_pss_rear_up   = Buffer.from([0x0c, 0x00, 0x46]);

	var gm_windows_front_down    = Buffer.from([0x0c, 0x00, 0x65]);

	var OpenTrunk                = Buffer.from([0x0c, 0x95, 0x01]);
	var LockDoors                = Buffer.from([0x0c, 0x4f, 0x01]); // 0x0c, 0x97, 0x01
	var LockDriverDoor           = Buffer.from([0x0c, 0x47, 0x01]);
	var UnlockDoors              = Buffer.from([0x0c, 0x45, 0x01]); // 0x0c, 0x03, 0x01
	var ToggleLockDoors          = Buffer.from([0x0c, 0x03, 0x01]);

	var OpenSunroof              = Buffer.from([0x0c, 0x7e, 0x01]);
	var CloseSunroof             = Buffer.from([0x0c, 0x7f, 0x01]);
	var FoldDriverMirrorE39      = Buffer.from([0x0c, 0x01, 0x31, 0x01]);
	var FoldPassengerMirrorE39   = Buffer.from([0x0c, 0x02, 0x31, 0x01]);
	var UnfoldDriverMirrorE39    = Buffer.from([0x0c, 0x01, 0x30, 0x01]);
	var UnfoldPassengerMirrorE39 = Buffer.from([0x0c, 0x02, 0x30, 0x01]);
	var GetAnalogValues          = Buffer.from([0x0b, 0x01]);
}

// Bitmasks in hex
var bit_0 = 0x01; // 1
var bit_1 = 0x02; // 2
var bit_2 = 0x04; // 4
var bit_3 = 0x08; // 8
var bit_4 = 0x10; // 16
var bit_5 = 0x20; // 32
var bit_6 = 0x40; // 64
var bit_7 = 0x80; // 128


// Data below is probably mostly no good
0x00, 0x00 // LR down
0x00, 0x03 // RR down
0x00, bit_1 // LR up
0x00, bit_2 // RR up
0x00, bit_0 // Front down
0x00, bit_2 // Front down
0x00, bit_5 // Front down
0x00, bit_6 // Front down
0x00, bit_1 // Wiper+spray
0x55, bit_0 // Driver's seat back
0x00, bit_3 // Trunk release
0x00, bit_4 // Interior light
0x00, bit_6 // Trunk long release
