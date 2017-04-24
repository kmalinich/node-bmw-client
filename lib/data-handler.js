var module_name = __filename.slice(__dirname.length + 1, -3);

module.exports = {
	// Data handler
	check_data : (data) => {
		// Parse received data from physical modules
		if (data.src.name == 'DIA' || data.src.name == 'GLO' || data.src.name == 'LOC') {
			return;
		}

		// Non-module-specifc commands
		switch (data.msg[0]) {
			case 0x01: // Request: Device status
				data.command = 'req';
				data.value   = 'device status';
				break;

			case 0x02: // Broadcast: Device status
				data.command = 'bro';
				status[data.src.name.toLowerCase()].ready = true;

				switch (data.msg[1]) {
					case 0x00:
						data.value = 'status: ready';
						break;

					case 0x01:
						status[data.src.name.toLowerCase()].reset = false;
						data.value = 'status: ready after reset';

						// Attempt to send audio power button
						if (data.src.name == 'DSP' || data.src.name == 'RAD') {
							setTimeout(() => {
								omnibus.DSP.request('memory'); // Get the DSP memory

								omnibus.BMBT.power_on_if_ready();
								omnibus.MID.power_on_if_ready();
							}, 1000);
						}
						break;

					default:
						data.value = 'status: unknown';
				}
				break;

			case 0x03:
				data.command = 'req';
				data.value   = 'bus status'
				break;

			case 0x04:
				data.command = 'bro';
				data.value   = 'bus status'
				break;

			case 0x10: // Request: Ignition status
				data.command = 'req';
				data.value   = 'ignition status';
				break;

			case 0x12: // Request: IKE sensor status
				data.command = 'req';
				data.value   = 'IKE sensor status';
				break;

			case 0x14: // Request: Country coding data request
				data.command = 'req';
				data.value   = 'country coding data';
				break;

			case 0x16: // Request: Odometer
				data.command = 'req';
				data.value   = 'odometer';
				break;

			case 0x1D: // Request: Temperature
				data.command = 'req';
				data.value   = 'temperature';
				break;

			case 0x35: // Broadcast: Car memory
				data.command = 'bro';
				data.value   = 'car memory';
				break;

			case 0x38: // Request: CD control status
				data.command = 'req';
				data.value   = 'CD control status'
				break;

			case 0x41: // Request: OBC value
				data.command = 'req';
				data.value   = 'OBC value '+data.msg[1];
				break;

			case 0x50: // Request: Check-control sensor status
				data.command = 'req';
				data.value   = 'check control sensor status';
				break;

			case 0x53: // Request: Vehicle data
				data.command = 'req';
				data.value   = 'vehicle data';
				break;

      case 0x5A: // Request: Light status
        data.command = 'req';
        data.value   = 'light status';
        break;

			case 0x5D: // Request: Light dimmer status
				data.command = 'req';
				data.value   = 'light dimmer status';
				break;

      case 0x71: // Request: Rain sensor status
        data.command = 'request';
        data.value   = 'rain sensor status';
        break;

			case 0x73: // Request: Immobiliser status
				data.command = 'req';
				data.value   = 'immobiliser status';
				break;

      case 0x75: // Request: Wiper status
        data.command = 'req';
        data.value   = 'wiper status';
        break;

			case 0x79: // Request: Door/flap status
				data.command = 'req';
				data.value   = 'door/flap status';
				break;

			case 0xA2: // Reply: Diagnostic command rejected
				data.command = 'rep';
				data.value   = 'diagnostic command rejected';
				break;

			case 0xFF: // Reply: Diagnostic command not acknowledged
				data.command = 'rep';
				data.value   = 'diagnostic command not acknowledged';
				break;
		}

		if (data.command) {
			log.out(data);
		}
		else {
			// Send other data to module-specific functions
			omnibus[data.src.name].parse_out(data);
		}

		// switch (data.src.name) {
		// 		// Diag/default
		// 	case 'DIA' : console.log('[node:HNDL] [%s->%s] command:',          data.src.name, data.dst.name, data.msg); break;
		// 		//case 'DIA' : break;
		// 	default    : console.log('[node:HNDL] [%s->%s] No source handler', data.src.name, data.dst.name, data.msg); break;
		// }

		// Parse sent data to emulated modules
		switch (data.dst.name) {
			case 'BMBT' : omnibus[data.dst.name].parse_in(data); break;
			case 'CDC'  : omnibus[data.dst.name].parse_in(data); break;
			case 'DSPC' : omnibus[data.dst.name].parse_in(data); break;
			case 'MID'  : omnibus[data.dst.name].parse_in(data); break;
				// default     : console.log('[node:HNDL] [%s>%s] No destination handler', data.src.name, data.dst.name, data.msg); break;
		}
	},
};
