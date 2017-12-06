// Parse data sent from VID module
function parse_out(data) {
	switch (data.msg[0]) {
		case 0x4F: { // RGB control (of LCD screen in dash)
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
			update.status('vid.lcd.aspect_ratio', parse.aspect_ratio);
			update.status('vid.lcd.refresh_rate', parse.refresh_rate);
			update.status('vid.lcd.zoom',         parse.zoom);
			update.status('vid.lcd.source_name',  parse.source_name);

			update.status('vid.lcd.source.gt',          parse.source.gt);
			update.status('vid.lcd.source.source.navj', parse.source.navj);
			update.status('vid.lcd.source.tv',          parse.source.tv);

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

		case 0xA0: // Broadcast: diagnostic command acknowledged
			data.command = 'bro';
			data.value   = 'diagnostic command acknowledged';
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
	}

	log.bus(data);
}

module.exports = {
	parse_out : parse_out,
};
