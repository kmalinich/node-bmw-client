/* eslint key-spacing : 0 */

// This module.. can get confused with the AIC module
// (AIC module is the rain-only sensor)

// Broadcast: Light control status
function decode_light_control_status(data) {
	data.command = 'bro';
	data.value   = 'light control status - ';

	// Examples
	//
	// D1 D2
	// 11 01 Intensity=1, Lights=on,  Reason=Twilight
	// 21 02 Intensity=2, Lights=on,  Reason=Darkness
	// 31 04 Intensity=3, Lights=on,  Reason=Rain
	// 41 08 Intensity=4, Lights=on,  Reason=Tunnel
	// 50 00 Intensity=5, Lights=off, Reason=N/A
	// 60 00 Intensity=6, Lights=off, Reason=N/A
	//
	// D1 - Lights on/off + intensity
	// 0x01 : Bit0      : Lights on
	// 0x10 : Bit4      : Intensity 1
	// 0x20 : Bit5      : Intensity 2
	// 0x30 : Bit4+Bit5 : Intensity 3
	// 0x40 : Bit6      : Intensity 4
	// 0x50 : Bit4+Bit6 : Intensity 5
	// 0x60 : Bit5+Bit6 : Intensity 6
	//
	// D2 - Reason
	// 0x01 : Bit0 : Twilight
	// 0x02 : Bit1 : Darkness
	// 0x04 : Bit2 : Rain
	// 0x08 : Bit3 : Tunnel
	// 0x10 : Bit4 : Garage

	let mask1 = bitmask.check(data.msg[1]).mask;
	let mask2 = bitmask.check(data.msg[2]).mask;

	let parse = {
		intensity     : null,
		intensity_str : null,
		intensities   : {
			l1 :  mask1.bit4 && !mask1.bit5 && !mask1.bit6 && !mask1.bit8,
			l2 : !mask1.bit4 &&  mask1.bit5 && !mask1.bit6 && !mask1.bit8,
			l3 :  mask1.bit4 &&  mask1.bit5 && !mask1.bit6 && !mask1.bit8,
			l4 : !mask1.bit4 && !mask1.bit5 &&  mask1.bit6 && !mask1.bit8,
			l5 :  mask1.bit4 && !mask1.bit5 &&  mask1.bit6 && !mask1.bit8,
			l6 : !mask1.bit4 &&  mask1.bit5 &&  mask1.bit6 && !mask1.bit8,
			l0 : !mask1.bit4 && !mask1.bit5 && !mask1.bit6 &&  mask1.bit8,
		},

		lights     : mask1.bit0,
		lights_str : 'lights on: ' + mask1.bit0,

		reason     : null,
		reason_str : null,
		reasons    : {
			twilight :  mask2.bit0 && !mask2.bit1 && !mask2.bit2 && !mask2.bit3 && !mask2.bit4 && !mask2.bit8,
			darkness : !mask2.bit0 &&  mask2.bit1 && !mask2.bit2 && !mask2.bit3 && !mask2.bit4 && !mask2.bit8,
			rain     : !mask2.bit0 && !mask2.bit1 &&  mask2.bit2 && !mask2.bit3 && !mask2.bit4 && !mask2.bit8,
			tunnel   : !mask2.bit0 && !mask2.bit1 && !mask2.bit2 &&  mask2.bit3 && !mask2.bit4 && !mask2.bit8,
			garage   : !mask2.bit0 && !mask2.bit1 && !mask2.bit2 && !mask2.bit3 &&  mask2.bit4 && !mask2.bit8,
			none     : !mask2.bit0 && !mask2.bit1 && !mask2.bit2 && !mask2.bit3 && !mask2.bit4 &&  mask2.bit8,
		},
	};

	// Loop intensity object to obtain intensity level
	for (let intensity in parse.intensities) {
		if (parse.intensities[intensity] === true) {
			// Convert hacky object key name back to integer
			parse.intensity = parseInt(intensity.replace(/\D/g, ''));
			break;
		}
	}

	// Loop reason object to obtain reason name
	for (let reason in parse.reasons) {
		if (parse.reasons[reason] === true) {
			parse.reason = reason;
			break;
		}
	}

	// Append prefixes to log strings
	parse.intensity_str = 'intensity: ' + parse.intensity;
	parse.reason_str    = 'reason: '    + parse.reason;

	update.status('rls.light.intensity', parse.intensity, false);
	update.status('rls.light.lights',    parse.lights,    false);
	update.status('rls.light.reason',    parse.reason,    false);

	// Assemble log string
	data.value += parse.intensity_str + ', ' + parse.lights_str + ', ' + parse.reason_str;

	return data;
}


function light_control_status(data) {
	// Init variables
	let byte1 = 0x00;
	let byte2 = 0x00;

	switch (data.intensity) {
		case 1 : byte1 = bitmask.set(byte1, bitmask.bit[4]); break;
		case 2 : byte1 = bitmask.set(byte1, bitmask.bit[5]); break;

		case 3 :
			byte1 = bitmask.set(byte1, bitmask.bit[4]);
			byte1 = bitmask.set(byte1, bitmask.bit[5]);
			break;

		case 4 : byte1 = bitmask.set(byte1, bitmask.bit[6]); break;

		case 5 :
			byte1 = bitmask.set(byte1, bitmask.bit[4]);
			byte1 = bitmask.set(byte1, bitmask.bit[6]);
			break;

		case 6 :
			byte1 = bitmask.set(byte1, bitmask.bit[5]);
			byte1 = bitmask.set(byte1, bitmask.bit[6]);
			break;
	}

	switch (data.lights) {
		case true : byte1 = bitmask.set(byte1, bitmask.bit[0]);
	}

	switch (data.reason) {
		case 'twilight' : byte2 = bitmask.set(byte2, bitmask.bit[0]); break;
		case 'darkness' : byte2 = bitmask.set(byte2, bitmask.bit[1]); break;
		case 'rain'     : byte2 = bitmask.set(byte2, bitmask.bit[2]); break;
		case 'tunnel'   : byte2 = bitmask.set(byte2, bitmask.bit[3]); break;
		case 'garage'   : byte2 = bitmask.set(byte2, bitmask.bit[4]);
	}

	let cmd = [ 0x59, byte1, byte2 ];

	log.module('Sending light control status, intensity: ' + data.intensity + ', lights on: ' + data.lights + ', reason: ' + data.reason);

	bus.data.send({
		src : 'RLS',
		dst : 'LCM',
		msg : cmd,
	});
}

// Broadcast: Headlight wipe interval
function decode_headlight_wipe_interval(data) {
	data.command = 'bro';
	data.value   = 'headlight wipe interval - V1: ' + data.msg[1] + ' V2: ' + data.msg[2];

	update.status('rls.interval.wipe.headlight.v1', data.msg[1]);
	update.status('rls.interval.wipe.headlight.v2', data.msg[2]);

	// let notify_title = 'RLS : Headlight wipe interval';
	// let notify_msg   = 'V1: ' + status.rls.interval.wipe.headlight.v1 + ' V2: ' + status.rls.interval.wipe.headlight.v2;
	// kodi.notify(notify_title, notify_msg);

	return data;
}

// Request various things from RLS
function request(value) {
	// Init variables
	let src;
	let cmd;

	switch (value) {
		case 'rain-sensor-status' : {
			src = 'IHKA';
			cmd = [ 0x71 ]; // Get IO status
			break;
		}
	}

	bus.data.send({
		src : src,
		dst : 'GM',
		msg : cmd,
	});
}


// Parse data sent from RLS module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x58 : return decode_headlight_wipe_interval(data);
		case 0x59 : return decode_light_control_status(data);
	}

	return data;
}


module.exports = {
	light_control_status : light_control_status,

	request   : request,
	parse_out : parse_out,
};
