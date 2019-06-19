// Parse data sent from VID module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x4F: { // Control: LCD (screen in dash)
			data.command = 'con';
			data.value   = 'LCD ';

			let mask_m1  = bitmask.check(data.msg[1]).mask;
			let parse_m1 = {
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

			update.status('vid.lcd.on',                 parse_m1.on,          false);
			update.status('vid.lcd.source.gt',          parse_m1.source.gt,   false);
			update.status('vid.lcd.source.source.navj', parse_m1.source.navj, false);
			update.status('vid.lcd.source.tv',          parse_m1.source.tv,   false);
			update.status('vid.lcd.source_name',        parse_m1.source_name, false);

			// Only if data.msg[2] is populated
			if (data.msg.length >= 3) {
				let mask_m2  = bitmask.check(data.msg[2]).mask;
				let parse_m2 = {
					aspect_ratio : mask_m2.b4 && '16:9' || '4:3',
					refresh_rate : mask_m2.b1 && '50Hz' || '60Hz',
					zoom         : mask_m2.b5,
				};

				// Update status object
				update.status('vid.lcd.aspect_ratio', parse_m2.aspect_ratio, false);
				update.status('vid.lcd.refresh_rate', parse_m2.refresh_rate, false);
				update.status('vid.lcd.zoom',         parse_m2.zoom,         false);
			}

			data.value += 'status: ' + status.vid.lcd.on + ', aspect ratio: ' + status.vid.lcd.aspect_ratio + ', refresh rate: ' + status.vid.lcd.refresh_rate + ', zoom: ' + status.vid.lcd.zoom + ', source: ' + status.vid.lcd.source_name;
			break;
		}

		case 0xA0 : { // Broadcast: diagnostic command acknowledged
			data.command = 'bro';
			data.value   = 'diagnostic command acknowledged';
			break;
		}
	}

	return data;
}


module.exports = {
	parse_out : parse_out,
};
