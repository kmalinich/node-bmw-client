var module_name = __filename.slice(__dirname.length + 1, -3);

// Parse data sent from MFL module
function parse_out(data) {
	// 50 B0 01,MFL --> SES: Device status request
	// 50 C8 01,MFL --> TEL: Device status request

	switch (data.msg[0]) {
		case 0x32: // Control: Volume
			data.command = 'con';
			data.value   = 'volume';

			switch (data.msg[1]) {
				case 0x10:
					data.value = data.value+' decrease 1 step';
					if (config.media.bluetooth === false && config.media.kodi.enable === true) {
						omnibus.kodi.volume('down');
					}
					break;
				case 0x11:
					data.value = data.value+' increase 1 step';
					if (config.media.bluetooth === false && config.media.kodi.enable === true) {
						omnibus.kodi.volume('up');
					}
					break;
			}
			break;

		case 0x3A: // Recirculation buton
			data.command = 'con';
			data.value   = 'recirculation button';

			switch (data.msg[1]) {
				case 0x00:
					data.value = data.value+' released';
					break;
				case 0x08:
					data.value = data.value+' depressed';
					break;
			}

			break;

		case 0x3B: // Media control buttons
			data.command = 'con';
			data.value   = 'media button';

			// Bitmask:
			// 0x00 = no buttons pressed
			// 0x01 = right
			// 0x08 = left
			// 0x10 = long depress
			// 0x20 = release
			// 0x80 = send/end

			// Detect button
			if      (bitmask.bit_test(data.msg[1], bitmask.bit[0])) { button = 'right';    data.value = data.value+' '+button; }
			else if (bitmask.bit_test(data.msg[1], bitmask.bit[3])) { button = 'left';     data.value = data.value+' '+button; }
			else if (bitmask.bit_test(data.msg[1], bitmask.bit[7])) { button = 'send/end'; data.value = data.value+' '+button; }
			else                                                    { button = 'unknown';  data.value = data.value+' '+button; }

			// Detect action
			if      (bitmask.bit_test(data.msg[1], bitmask.bit[4])) { action = 'long depress'; data.value = data.value+' '+action; }
			else if (bitmask.bit_test(data.msg[1], bitmask.bit[5])) { action = 'release';      data.value = data.value+' '+action; }
			else                                                    { action = 'depress';      data.value = data.value+' '+action; }

			// Perform media control based on pressed key

			// BT control version
			if (config.media.bluetooth === true && config.media.kodi.enable === false) {
				if      (button == 'left'     && action == 'depress')      { omnibus.BT.command('previous'); }
				else if (button == 'right'    && action == 'depress')      { omnibus.BT.command('next');     }
				else if (button == 'send/end' && action == 'depress')      { omnibus.BT.command('pause');    } // Think about it...
				else if (button == 'send/end' && action == 'long depress') { omnibus.BT.command('play');     }
			}

			// Kodi version
			if (config.media.bluetooth === false && config.media.kodi.enable === true) {
				if      (button == 'left'     && action == 'depress')      { omnibus.kodi.command('previous'); }
				else if (button == 'right'    && action == 'depress')      { omnibus.kodi.command('next');     }
				else if (button == 'send/end' && action == 'depress')      { omnibus.kodi.command('pause');    }
				//else if (button == 'send/end' && action == 'long depress') { omnibus.kodi.command('play');     }
			}
			break;

		default:
			data.command = 'unk';
			data.value   = Buffer.from(data.msg);
	}

	log.out(data);
}

module.exports = {
	parse_out          : (data) => { parse_out(data); },
	send_device_status : (module_name) => { bus_commands.send_device_status(module_name); },
};
