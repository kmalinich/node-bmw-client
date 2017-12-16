// Parse data sent from GT module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x2B : { // Broadcast: Indicator status
			data.command = 'bro';
			data.value   = 'indicator status TODO';
			break;
		}

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

				case 0x90:
					data.value += 'EQ button: M-Audio off';
					// Not really the right place to set this var
					// It should be in the status from DSP itself
					update.status('dsp.m_audio', false);
					break;

				case 0x91:
					data.value += 'EQ button: M-Audio on';
					update.status('dsp.m_audio', true);
					break;

				case 0x95:
					data.value += 'memory set';
					update.status('dsp.m_audio', false);
					break;

				default:
					data.value = Buffer.from(data.msg);
			}
			break;
		}

		case 0x41 : { // Control: Aux heat/vent
			data.command = 'con';

			switch (data.msg[1]) {
				case 0x11: data.value = 'Aux heat off'; break;
				case 0x12: data.value = 'Aux heat on';  break;
				case 0x13: data.value = 'Aux vent off'; break;
				case 0x14: data.value = 'Aux vent on';
			}

			break;
		}

		case 0x45 : { // Request: Radio status
			data.command = 'req';
			data.value   = 'radio status TODO, ' + hex.i2s(data.msg[1]);
			break;
		}

		case 0x4A : { // Control: Cassette
			BMBT.send_cassette_status(data.msg[1]);

			data.command = 'con';
			data.value   = 'cassette: ';

			switch (data.msg[1]) {
				case 0x00 : data.value += 'power off'; break;
				case 0xFF : data.value += 'power on';  break;
				default   : data.value += 'unknown 0x' + data.msg[1].toString(16);
			}
			break;
		}

		case 0x4E : { // Control: Audio source selection
			data.command = 'con';
			data.value   = 'audio source selection TODO, ' + hex.i2s(data.msg[1]) + ' ' + hex.i2s(data.msg[2]);
			break;
		}

		case 0x4F: { // Control: LCD (screen in dash)
			data.command = 'con';
			data.value   = 'LCD ';

			let masks = {
				m1 : bitmask.check(data.msg[1]).mask,
				m2 : bitmask.check(data.msg[2]).mask,
			};

			let parse = {
				aspect_ratio : masks.m2.b4 && '16:9' || '4:3',
				on           : masks.m1.b4,
				refresh_rate : masks.m2.b1 && '50Hz' || '60Hz',
				zoom         : masks.m2.b5,
				source_name  : null,
				source       : {
					gt   : masks.m1.b0,
					navj : masks.m1.b2,
					tv   : masks.m1.b1,
				},
			};

			// Update status object
			update.status('gt.lcd.aspect_ratio', parse.aspect_ratio);
			update.status('gt.lcd.refresh_rate', parse.refresh_rate);
			update.status('gt.lcd.zoom',         parse.zoom);
			update.status('gt.lcd.source_name',  parse.source_name);

			update.status('gt.lcd.source.gt',          parse.source.gt);
			update.status('gt.lcd.source.source.navj', parse.source.navj);
			update.status('gt.lcd.source.tv',          parse.source.tv);

			// A little lazy
			switch (data.msg[1]) {
				case 0x00 : parse.source_name = 'off';  break;
				case 0x11 : parse.source_name = 'TV';   break;
				case 0x12 : parse.source_name = 'GT';   break;
				case 0x14 : parse.source_name = 'NAVJ'; break;
				default   : parse.source_name = 'unknown \'' + Buffer.from([ data.msg[1] ]) + '\'';
			}

			data.value += 'status: ' + parse.on + ', aspect ratio: ' + parse.aspect_ratio + ', refresh rate: ' + parse.refresh_rate + ', zoom: ' + parse.zoom + ', source: ' + parse.source_name;
			break;
		}

		default : {
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
		}
	}

	log.bus(data);
}

module.exports = {
	parse_out : parse_out,
};
