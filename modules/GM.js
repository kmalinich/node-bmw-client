/* eslint key-spacing : 0 */

const EventEmitter = require('events');

// All the possible values to send to GM
// let array_of_possible_values = {
//   light_alarm                   : true,
//   light_alarm_blink             : true,
//   light_interior                : true,
//   locks_lock                    : true,
//   locks_toggle                  : true,
//   locks_trunk                   : true,
//   locks_unlock                  : true,
//   seat_driver_backrest_backward : true,
//   seat_driver_backrest_forward  : true,
//   seat_driver_backward          : true,
//   seat_driver_down              : true,
//   seat_driver_forward           : true,
//   seat_driver_headrest_down     : true,
//   seat_driver_headrest_up       : true,
//   seat_driver_tilt_backward     : true,
//   seat_driver_tilt_forward      : true,
//   seat_driver_up                : true,
//   seat_driver_upper_backwards   : true,
//   seat_driver_upper_forwards    : true,
//   wheel_backward                : true,
//   wheel_down                    : true,
//   wheel_forward                 : true,
//   wheel_up                      : true,
//   window_front_left_down        : true,
//   window_front_left_up          : true,
//   window_front_right_down       : true,
//   window_front_right_up         : true,
//   window_rear_left_down         : true,
//   window_rear_left_up           : true,
//   window_rear_right_down        : true,
//   window_rear_right_up          : true,
//   window_sunroof_down           : true,
//   window_sunroof_up             : true,
//   wipers_auto                   : true,
//   wipers_maintenance            : true,
//   wipers_once                   : true,
//   wipers_spray                  : true,
// };


class GM extends EventEmitter {
	decode_status_crash_alarm(data) {
		data.command = 'bro';
		data.value   = 'crash alarm - ';

		switch (data.msg[1]) {
			case 0x00 : data.value += 'no crash'; break;
			case 0x02 : data.value += 'armed';    break; // A guess
		}

		return data;
	}

	// [0x72] Decode a key fob bitmask message, and act upon the results
	decode_status_keyfob(data) {
		data.command = 'bro';
		data.value   = 'key fob status - ';

		let mask = bitmask.check(data.msg[1]).mask;

		let keyfob = {
			low_batt     : mask.bit0,
			low_batt_str : 'battery low: ' + mask.bit0,

			button     : null,
			button_str : null,
			buttons    : {
				lock   :  mask.bit4 && !mask.bit5 && !mask.bit6 && !mask.bit8,
				unlock : !mask.bit4 &&  mask.bit5 && !mask.bit6 && !mask.bit8,
				trunk  : !mask.bit4 && !mask.bit5 &&  mask.bit6 && !mask.bit8,
				none   : !mask.bit4 && !mask.bit5 && !mask.bit6,
			},

			key     : null,
			key_str : null,
			keys    : {
				key0 : !mask.bit1 && !mask.bit2,
				key1 :  mask.bit1 && !mask.bit2,
				key2 : !mask.bit1 &&  mask.bit2,
				key3 :  mask.bit1 &&  mask.bit2,
			},
		};

		// Loop button object to populate log string
		for (let button in keyfob.buttons) {
			if (keyfob.buttons[button] === true) {
				keyfob.button     = button;
				keyfob.button_str = 'button: ' + button;
				break;
			}
		}

		// Loop key object to populate log string
		for (let key in keyfob.keys) {
			if (keyfob.keys[key] === true) {
				keyfob.key     = key;
				keyfob.key_str = 'key: ' + key;
				break;
			}
		}


		// Update status variables
		update.status('gm.keyfob.low_batt', keyfob.low_batt);

		update.status('gm.keyfob.button',         keyfob.button);
		update.status('gm.keyfob.buttons.lock',   keyfob.buttons.lock);
		update.status('gm.keyfob.buttons.none',   keyfob.buttons.none);
		update.status('gm.keyfob.buttons.trunk',  keyfob.buttons.trunk);
		update.status('gm.keyfob.buttons.unlock', keyfob.buttons.unlock);

		update.status('gm.keyfob.key',       keyfob.key);
		update.status('gm.keyfob.keys.key0', keyfob.keys.key0);
		update.status('gm.keyfob.keys.key1', keyfob.keys.key1);
		update.status('gm.keyfob.keys.key2', keyfob.keys.key2);
		update.status('gm.keyfob.keys.key3', keyfob.keys.key3);


		// Emit keyfob event
		this.emit('keyfob', keyfob);

		// Fold/unfold mirrors on GM keyfob event
		// let action;
		// switch (keyfob.button) {
		// 	case 'lock' : action = 'in'; break;
		// 	default     : action = 'out';
		// }

		// if (keyfob.button !== 'none') {
		// 	this.mirrors({
		// 		action : action,
		// 		mirror : 'both',
		// 	});
		// }

		// Assemble log string
		data.value += keyfob.key_str + ', ' + keyfob.button_str + ', ' + keyfob.low_batt_str;

		return data;
	}

	// [0x7A] Decode a door status message from GM and act upon the results
	decode_status_open(data) {
		data.command = 'bro';
		data.value   = 'door status';

		// Set status from message by decoding bitmask
		update.status('doors.front_left',  bitmask.test(data.msg[1], 0x01));
		update.status('doors.front_right', bitmask.test(data.msg[1], 0x02));
		update.status('doors.hood',        bitmask.test(data.msg[2], 0x40));
		update.status('doors.rear_left',   bitmask.test(data.msg[1], 0x04));
		update.status('doors.rear_right',  bitmask.test(data.msg[1], 0x08));
		update.status('doors.trunk',       bitmask.test(data.msg[2], 0x20));

		update.status('lights.interior', bitmask.test(data.msg[1], 0x40));

		update.status('windows.front_left',  bitmask.test(data.msg[2], 0x01));
		update.status('windows.front_right', bitmask.test(data.msg[2], 0x02));
		update.status('windows.rear_left',   bitmask.test(data.msg[2], 0x04));
		update.status('windows.rear_right',  bitmask.test(data.msg[2], 0x08));
		update.status('windows.roof',        bitmask.test(data.msg[2], 0x10));

		// This is correct, in a sense... Not a good sense, but in a sense
		update.status('vehicle.locked', bitmask.test(data.msg[1], 0x20));


		// Set status.doors.closed if all doors are closed
		let update_closed_doors = (!status.doors.front_left && !status.doors.front_right && !status.doors.rear_left && !status.doors.rear_right);
		update.status('doors.closed', update_closed_doors);

		// Set status.doors.open if any doors are open
		update.status('doors.open', (update_closed_doors === false));

		// Set status.doors.sealed if all doors and flaps are closed
		let update_sealed_doors = (status.doors.closed && !status.doors.hood && !status.doors.trunk);
		update.status('doors.sealed', update_sealed_doors);


		// Set status.windows.closed if all windows are closed
		let update_closed_windows = (!status.windows.front_left && !status.windows.front_right && !status.windows.roof && !status.windows.rear_left && !status.windows.rear_right);
		update.status('windows.closed', update_closed_windows);

		// Set status.windows.open if any windows are open
		update.status('windows.open', (update_closed_windows === false));


		// Set status.vehicle.sealed if all doors and windows are closed
		update.status('vehicle.sealed', (status.doors.sealed && status.windows.closed));


		// Emit open event
		this.emit('open', {
			doors   : status.doors,
			locked  : status.vehicle.locked,
			windows : status.windows,
		});

		return data;
	}

	decode_status_wiper(data) {
		data.command = 'bro';
		data.value   = 'wiper status';

		// data.msg[1] bitmask
		// 0x00 : sens 0+level 0
		// 0x01 : speed 1
		// 0x02 : speed 2
		// 1+2  : speed 3
		// 0x04 : sens 1
		// 0x08 : sens 2
		// 4+8  : sens 3
		// 0x20 : spray

		let mask = bitmask.check(data.msg[1]).mask;

		// A slightly different approach
		data.speed = 'off';
		if (mask.bit0  && !mask.bit1 && !mask.bit5) data.speed = 'low/auto';
		if (!mask.bit0 &&  mask.bit1 && !mask.bit5) data.speed = 'medium';
		if (mask.bit0  &&  mask.bit1 && !mask.bit5) data.speed = 'high';
		if (!mask.bit0 && !mask.bit1 &&  mask.bit5) data.speed = 'spray';

		// Set speed status var
		update.status('gm.wipers.speed', data.speed);


		data.sensitivity = 0;
		if (mask.bit2  && !mask.bit3) data.sensitivity = 1;
		if (!mask.bit2 &&  mask.bit3) data.sensitivity = 2;
		if (mask.bit2  &&  mask.bit3) data.sensitivity = 3;

		// Set sensitivity status var
		update.status('gm.wipers.sensitivity', data.sensitivity);


		// Emit wiper event
		this.emit('wiper', status.gm.wipers);

		return data;
	}


	// This is just a dumb placeholder
	// Decode GM bitmask string and output an array of true/false values
	io_decode(data) {
		return {
			seat_driver_backrest_backward : bitmask.test(data[0], bitmask.bit[0]),
		};
	}

	// Encode GM bitmask string from an input of true/false values
	// This is just a dumb placeholder
	io_encode(object) {
		log.module('Encoding IO status');

		// Initialize bitmask variables
		let bitmask_0  = 0x00;
		let bitmask_1  = 0x00;
		let bitmask_2  = 0x00;
		let bitmask_3  = 0x00;

		// Set the various bitmask values according to the input object
		if (object.clamp_30a) bitmask_0 = bitmask.set(bitmask_0, bitmask.bit[0]);

		// Assemble the output object
		this.io_set([
			bitmask_0,
			bitmask_1,
			bitmask_2,
			bitmask_3,
		]);
	}


	// Control interior lighting PWM brightness
	interior_light(value) {
		log.module('Setting interior light to ' + value);
		this.io_set([ 0x10, 0x05, value ]);
	}

	// Send message to GM
	io_set(packet) {
		if (config.chassis.model !== 'e39') return;

		log.module('Setting IO status');

		// Add 'set IO status' command to beginning of array
		packet.unshift(0x0C);

		// Set IO status
		bus.data.send({
			src : 'DIA',
			msg : packet,
		});
	}

	// Central locking
	locks() {
		// Send the notification to the log and the cluster
		let notify_message = 'Toggling door locks';
		log.module(notify_message);
		IKE.text_override(notify_message);

		// Hex:
		// 01 3A 01 : LF unlock (CL)
		// 01 39 01 : LF lock   (CL)
		// 02 3A 01 : RF unlock (CL)
		// 02 39 01 : RF lock   (CL)

		// 01 41 01 : Rear lock
		// 01 42 02 : Rear unlock

		// Init message variable
		this.io_set([ 0x00, 0x0B ]);
	}

	// Request various things from GM
	request(value) {
		if (config.chassis.model !== 'e39') return;

		// Init variables
		let src;
		let cmd;

		switch (value) {
			case 'io-status' : {
				src = 'DIA';
				cmd = [ 0x0B, 0x00 ]; // Get IO status
				break;
			}

			case 'door-status' : {
				src = 'BMBT';
				cmd = [ 0x79 ];
				break;
			}
		}

		log.module('Requesting \'' + value + '\'');

		bus.data.send({
			src : src,
			msg : cmd,
		});
	}

	// GM power mirror control
	mirrors(request) {
		log.module('Mirror control: ' + request.mirror + ', ' + request.action);

		// Init message variable
		let msg;

		// Switch for mirror and action
		switch (request.mirror) {
			case 'all'  :
			case 'both' : {
				this.mirrors({ action : request.action, mirror : 'left'  });

				setTimeout(() => {
					this.mirrors({ action : request.action, mirror : 'right' });
				}, 250);
				return;
			}

			case 0      :
			case 'l'    :
			case 'lf'   :
			case 'left' : { // Left front
				switch (request.action) {
					case 'in'  : msg = [ 0x01, 0x31, 0x01 ]; break;
					case 'out' : msg = [ 0x01, 0x30, 0x01 ];
				} break;
			}

			case 1       :
			case 'r'     :
			case 'rf'    :
			case 'right' : { // Right front
				switch (request.action) {
					case 'in'  : msg = [ 0x02, 0x31, 0x01 ]; break;
					case 'out' : msg = [ 0x02, 0x30, 0x01 ];
				}
			}
		}

		this.io_set(msg);
	}

	// GM power window control
	windows(request) {
		log.module('Window control: ' + request.window + ', ' + request.action);

		// Init message variable
		let msg;

		// Switch for window and action
		switch (request.window) {
			case 'roof' : { // Moonroof
				switch (request.action) {
					case 'dn' : msg = [ 0x03, 0x01, 0x01 ]; break;
					case 'up' : msg = [ 0x03, 0x02, 0x01 ]; break;
					case 'tt' : msg = [ 0x03, 0x00, 0x01 ];
				} break;
			}

			case 'lf' : { // Left front
				switch (request.action) {
					case 'dn' : msg = [ 0x01, 0x36, 0x01 ]; break;
					case 'up' : msg = [ 0x01, 0x1A, 0x01 ];
				} break;
			}

			case 'rf' : { // Right front
				switch (request.action) {
					case 'dn' : msg = [ 0x02, 0x20, 0x01 ]; break;
					case 'up' : msg = [ 0x02, 0x22, 0x01 ];
				} break;
			}

			case 'lr' : { // Left rear
				switch (request.action) {
					case 'dn' : msg = [ 0x00, 0x00, 0x01 ]; break;
					case 'up' : msg = [ 0x42, 0x01 ];
				} break;
			}

			case 'rr' : { // Right rear
				switch (request.action) {
					case 'dn' : msg = [ 0x00, 0x03, 0x01 ]; break;
					case 'up' : msg = [ 0x43, 0x01 ];
				}
			}
		}

		this.io_set(msg);
	}


	init_listeners() {
		if (config.chassis.model !== 'e39') return;

		update.on('status.vehicle.ignition', (data) => {
			switch (data.new) {
				case 'accessory' : {
					switch (data.old) {
						case 'run' : {
							// If the doors are closed and locked, toggle door locks
							if (status.vehicle.locked && status.doors.closed) this.locks();
						}
					}
				}
			}
		});

		log.msg('Initialized listeners');
	}


	// Parse data sent from GM module
	parse_out(data) {
		switch (data.msg[0]) {
			case 0x72 : { // Broadcast: Key fob status
				data = this.decode_status_keyfob(data);
				break;
			}

			case 0x76 : { // Broadcast: 'Crash alarm'
				data = this.decode_status_crash_alarm(data);
				break;
			}

			case 0x77 : { // Broadcast: Wiper status
				data = this.decode_status_wiper(data);
				break;
			}

			case 0x78 : { // Broadcast: Seat memory data
				data.command = 'bro';
				data.value   = 'TODO seat memory data';
				break;
			}

			case 0x7A : { // Broadcast: Open doors (flaps)/windows status
				data = this.decode_status_open(data);
				break;
			}

			case 0xA0 : { // Reply: Diagnostic command acknowledged
				data.command = 'rep';
				data.value   = 'TODO diagnostic command ack';
				break;
			}

			default : {
				data.command = 'unk';
				data.value   = Buffer.from(data.msg);
			}
		}

		log.bus(data);
	}
}

module.exports = GM;
