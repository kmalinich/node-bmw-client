import hex from '../share/hex.js';


function parse_control_dsp(data) {
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

		case 0x15 : {
			data.value += 'EQ delta: 0x' + data.msg[2].toString(16);
			break;
		}

		case 0x90 : {
			switch (data.msg[2]) {
				case 0x00 : {
					data.value += 'EQ button: M-Audio off';

					// Not really the right place to set this var
					// It should be in the status from DSP itself
					update.status('dsp.m_audio', false, false);

					break;
				}
			}
			break;
		}

		case 0x91 : {
			switch (data.msg[2]) {
				case 0x00 : {
					data.value += 'EQ button: M-Audio on';

					// Not really the right place to set this var
					// It should be in the status from DSP itself
					update.status('dsp.m_audio', true, false);

					break;
				}
			}
			break;
		}

		// DSP memory
		case 0x95 : data = parse_dsp_memory(data); break;

		default : {
			data.value = Buffer.from(data.msg);
		}
	}

	return data;
}

/* eslint key-spacing : 0 */
function parse_dsp_memory(data) {
	data.value += 'memory set - ';

	// data.msg[2] :
	// 0x15        = DSP EQ delta update
	// 0x00 - 0x07 = room 0-7
	// 0x20 - 0x27 = echo 0-7

	// data.msg[3] : DSP EQ delta update bands
	// 0x00 = 80Hz
	// 0x20 = 200Hz
	// 0x40 = 500Hz
	// 0x60 = 1kHz
	// 0x80 = 2kHz
	// 0xA0 = 5kHz
	// 0xC0 = 12kHz
	//
	// 0x10 = negative value
	//
	// 0x00        = 0
	// 0x01 - 0x0A = +1 thru +10
	// 0x11 - 0x1A = -1 thru -10

	let amount;

	// Check if the command is DSP EQ delta update or echo/room size
	switch (data.msg[2] === 0x15) {
		case false : {
			// Check if the command is setting echo amount or room size and get the value
			switch (bitmask.test(data.msg[2], bitmask.b[5])) {
				// Room size
				case false : {
					data.value += 'room size - ';

					amount = data.msg[2];
					break;
				}

				// Echo
				case true : {
					data.value += 'echo amount - ';

					// Remove 0x20 from the value
					amount = bitmask.unset(data.msg[2], bitmask.b[5]);
				}
			}

			break;
		}

		case true : {
			const mask = bitmask.check(data.msg[3]).mask;

			const dsp_memory = {
				negative     : mask.bit4,
				low_batt_str : 'negative: ' + mask.bit4,

				band     : null,
				band_str : null,
				bands    : {
					'80Hz'  : !mask.b5 && !mask.b6 && !mask.b7 &&  mask.b8,
					'200Hz' :  mask.b5 && !mask.b6 && !mask.b7 && !mask.b8,
					'500Hz' : !mask.b5 &&  mask.b6 && !mask.b7 && !mask.b8,
					'1kHz'  :  mask.b5 &&  mask.b6 && !mask.b7 && !mask.b8,
					'2kHz'  : !mask.b5 && !mask.b6 &&  mask.b7 && !mask.b8,
					'5kHz'  :  mask.b5 && !mask.b6 &&  mask.b7 && !mask.b8,
					'12kHz' : !mask.b5 &&  mask.b6 &&  mask.b7 && !mask.b8,
				},
			};

			// Loop band object to populate log string
			for (const band in dsp_memory.bands) {
				if (dsp_memory.bands[band] === true) {
					dsp_memory.band     = band;
					dsp_memory.band_str = 'band: ' + band;
					break;
				}
			}

			// Assemble log string
			data.value += dsp_memory.band_str + ', ' + dsp_memory.negative_str;
		}
	}

	data.value += amount;

	return data;
}

function parse_control_lcd(data) {
	data.command = 'con';
	data.value   = 'LCD ';

	const mask_m1  = bitmask.check(data.msg[1]).mask;
	const parse_m1 = {
		on          : mask_m1.b4,
		source_name : null,
		source      : {
			gt   : mask_m1.b0,
			navj : mask_m1.b2,
			tv   : mask_m1.b1,
		},
	};

	// A little lazy
	switch (data.msg[1]) {
		case 0x00 : parse_m1.source_name = 'off';  break;
		case 0x11 : parse_m1.source_name = 'TV';   break;
		case 0x12 : parse_m1.source_name = 'GT';   break;
		case 0x14 : parse_m1.source_name = 'NAVJ'; break;
		default   : parse_m1.source_name = 'unknown \'' + Buffer.from([ data.msg[1] ]) + '\'';
	}

	update.status('gt.lcd.on',                 parse_m1.on,          false);
	update.status('gt.lcd.source.gt',          parse_m1.source.gt,   false);
	update.status('gt.lcd.source.source.navj', parse_m1.source.navj, false);
	update.status('gt.lcd.source.tv',          parse_m1.source.tv,   false);
	update.status('gt.lcd.source_name',        parse_m1.source_name, false);

	// Only if data.msg[2] is populated
	if (data.msg.length >= 3) {
		const mask_m2  = bitmask.check(data.msg[2]).mask;
		const parse_m2 = {
			aspect_ratio : mask_m2.b4 && '16:9' || '4:3',
			refresh_rate : mask_m2.b1 && '50Hz' || '60Hz',
			zoom         : mask_m2.b5,
		};

		// Update status object
		update.status('gt.lcd.aspect_ratio', parse_m2.aspect_ratio, false);
		update.status('gt.lcd.refresh_rate', parse_m2.refresh_rate, false);
		update.status('gt.lcd.zoom',         parse_m2.zoom,         false);
	}

	data.value += 'status: ' + status.gt.lcd.on + ', aspect ratio: ' + status.gt.lcd.aspect_ratio + ', refresh rate: ' + status.gt.lcd.refresh_rate + ', zoom: ' + status.gt.lcd.zoom + ', source: ' + status.gt.lcd.source_name;

	return data;
}


// Parse data sent from GT module
function parse_out(data) {
	switch (data.msg[0]) {
		// Broadcast: Indicator status
		case 0x2B : {
			data.command = 'bro';
			data.value   = 'TODO: indicator status';
			break;
		}

		// Control: DSP
		case 0x34 : return parse_control_dsp(data);

		// Control: Select menu
		case 0x37 : {
			data.command = 'con';
			data.value   = 'TODO: select menu 0x' + data.msg[1].toString(16);
			break;
		}

		// Control: Set time/date
		// TODO: Parsing
		case 0x40 : {
			data.command = 'con';
			data.value   = 'Set time/date';
			console.dir({ msg : data.msg });
			break;
		}

		// Request: On-board computer data
		// 00    --- OBC_Mode_00
		// 01 01 --- Time current value request
		// 01    --- Time
		// 02 01 --- Date current value request
		// 02    --- Date
		// 03 01 --- Outside_Temp current value request
		// 03    --- Outside_Temp
		// 04 01 --- Consumption_1 current value request
		// 04    --- Consumption_1
		// 05 01 --- Consumption_2 current value request
		// 06 01 --- Range current value request
		// 07 01 --- Distance current value request
		// 08 01 --- Arrival current value request
		// 09 01 --- Limit current value request
		// 09 02 --- Limit status request
		// 0A 01 --- Average_Speed current value request
		// 0D 02 --- Code status request
		// 0E 01 --- Stopwatch current value request
		// 0E 03 --- Stopwatch current value request status request
		// 0F 01 --- Timer_1 current value request
		// 10 01 --- Timer_2 current value request
		// 10    --- Timer_2
		// 11    --- Aux_Heating_Off
		// 12    --- Aux_Heating_On
		// 13    --- Aux_Vent_Off
		// 14    --- Aux_Vent_On
		// 15    --- End_Stellmode
		// 16    --- Emergency_Disarm
		// 17    --- OBC_Mode_17
		// 18    --- OBC_Mode_18
		// 1A 01 --- Interim_Time current value request
		// 1B 03 --- Aux_Heat/Vent current value request status request
		case 0x41 : {
			data.command = 'con';

			switch (data.msg[1]) {
				case 0x00: data.value = 'OBC mode 0';           break;
				case 0x01: data.value = 'Time';                 break;
				case 0x02: data.value = 'Date';                 break;
				case 0x03: data.value = 'Outside temp';         break;
				case 0x04: data.value = 'Consumption 1';        break;
				case 0x05: data.value = 'Consumption 2';        break;
				case 0x06: data.value = 'Range';                break;
				case 0x07: data.value = 'Distance';             break;
				case 0x08: data.value = 'Arrival';              break;
				case 0x09: data.value = 'Speed limit';          break;
				case 0x0A: data.value = 'Average speed';        break;
				case 0x0D: data.value = 'Code';                 break;
				case 0x0E: data.value = 'Stopwatch';            break;
				case 0x0F: data.value = 'Timer 1';              break;
				case 0x10: data.value = 'Timer 2';              break;
				case 0x11: data.value = 'Aux heat off';         break;
				case 0x12: data.value = 'Aux heat on';          break;
				case 0x13: data.value = 'Aux vent off';         break;
				case 0x14: data.value = 'Aux vent on';          break;
				case 0x15: data.value = 'End adjustment mode';  break;
				case 0x16: data.value = 'Emergency disarm';     break;
				case 0x17: data.value = 'OBC mode 17';          break;
				case 0x18: data.value = 'OBC mode 18';          break;
				case 0x1A: data.value = 'Interim time';         break;
				case 0x1B: data.value = 'Aux heat/vent status'; break;

				default: data.value = `Unknown ${hex.i2s(data.msg[1])}`;
			}

			break;
		}

		// Request: Radio status
		case 0x45 : {
			data.command = 'req';
			data.value   = 'TODO: radio status ' + hex.i2s(data.msg[1]);
			break;
		}

		// Control: Cassette
		case 0x4A : {
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

		// Control: Audio source selection
		case 0x4E : {
			data.command = 'con';
			data.value   = 'TODO: audio source selection ' + hex.i2s(data.msg[1]) + ' ' + hex.i2s(data.msg[2]);
			break;
		}

		// Control: LCD (screen in dash)
		case 0x4F : return parse_control_lcd(data);

		// Control: DSP EQ delta update
		case 0x95 : {
			data.command = 'con';
			data.value   = 'TODO: DSP EQ delta update';
			break;
		}
	}

	return data;
}


export default {
	parse_out,
};
