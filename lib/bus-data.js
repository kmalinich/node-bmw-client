const caller = require('callers-path');
const path   = require('path');


// Object of modules for use below in default case statement
const modules = {
	// DBUS/IBUS/KBUS
	ABG,
	ASC,
	BMBT,
	CCM,
	CDC,
	DIA,
	DSP,
	DSPC,
	EWS,
	GM,
	GT,
	IHKA,
	IKE,
	LCM,
	MFL,
	MID,
	NAV,
	PDC,
	RAD,
	RDC,
	RLS,
	TEL,
	VID,

	// CANBUS
	CAS,
	CON,
	DSC,
	EGS,
	FEM,
	KOMBI,
	NBT,
	SZM,

	// Hybrid
	DME,
};


// Determine destination network by module name
function bus_detect(data) {
	// If data.bus is defined, use it
	if (typeof data.bus !== 'undefined' && data.bus !== null) {
		return data.bus;
	}

	// No dst? Must be CANBUS.. and I must be lazy
	// TODO: Handle this properly, since if undefined it will all go to can1
	if (typeof data.dst === 'undefined' || data.dst === null) return 'can1';

	switch (data.dst) {
		case 'ANZV' : return 'ibus'; // IBUS
		case 'BMBT' : return 'ibus';
		case 'CCM'  : return 'ibus';
		case 'CDC'  : return 'ibus';
		case 'DSP'  : return 'ibus';
		case 'DSPC' : return 'ibus';
		case 'GT'   : return 'ibus';
		case 'IKE'  : return 'ibus';
		case 'LCM'  : return 'ibus';
		case 'LOC'  : return 'ibus';
		case 'MFL'  : return 'ibus';
		case 'MID'  : return 'ibus';
		case 'NAV'  : return 'ibus';
		case 'PDC'  : return 'ibus';
		case 'RAD'  : return 'ibus';
		case 'SES'  : return 'ibus';
		case 'TEL'  : return 'ibus';
		case 'VID'  : return 'ibus';

		case 'ABG'  : return 'kbus'; // KBUS
		case 'EWS'  : return 'kbus';
		case 'GLO'  : return 'kbus'; // IKE will mirror packets with dst GLO between IBUS<->KBUS networks
		case 'GM'   : return 'kbus';
		case 'HAC'  : return 'kbus';
		case 'IHKA' : return 'kbus';
		case 'RLS'  : return 'kbus';
		case 'SHD'  : return 'kbus';
		case 'STH'  : return 'kbus';

		case 'DIA': return false;

			// Dunno? Welp, try to send to both KBUS and IBUS
		default : return 'both-low';
	}
}

// For data (pre) parsed by bmwi/lib/intf-can.js
function parse_canbus_kcd(data) {
	// All topics:
	// 'engine.rpm'
	// 'engine.running'
	// 'dme.voltage'
	// 'dme.status.ac_switch'
	// 'dme.status.battery_light'
	// 'dme.status.check_engine'
	// 'dme.status.check_fuel_cap'
	// 'dme.status.coolant_overtemperature_light'
	// 'dme.status.cruise'
	// 'dme.status.eml'
	// 'dme.status.oil_level_error'
	// 'dme.status.oil_level_error_s62'
	// 'dme.status.oil_level_warning'
	// 'dme.status.oil_pressure_light'
	// 'dme.status.tachometer_light_0'
	// 'dme.status.tachometer_light_1'
	// 'dme.status.tachometer_light_2'
	// 'engine.ac_clutch'
	// 'engine.dsc_ok'
	// 'engine.fueling.active'
	// 'engine.fueling.cut'
	// 'engine.fueling.full_load'
	// 'engine.maf_error'
	// 'engine.smg_present'
	// 'engine.torque.after_interventions'
	// 'engine.torque.before_interventions'
	// 'engine.torque.loss'
	// 'engine.torque.output'
	// 'fuel.pump.duty'
	// 'temperature.coolant.c'
	// 'temperature.exhaust.c'
	// 'temperature.intake.c'
	// 'temperature.oil.c'
	// 'vehicle.speed.pulses'

	// Don't call update.status() for some, just update normally (CPU load)
	switch (data.topic) {
		case 'engine.rpm' : status.engine.rpm = data.msg; return;
	}

	let update_quiet = true;

	// Selectively disable quiet update log messages depending on data.topic
	switch (data.topic) {
		case 'dme.voltage' : update_quiet = false; break;

		case 'engine.fueling.active'    :
		case 'engine.fueling.cut'       :
		case 'engine.fueling.full_load' : update_quiet = false; break;

		case 'engine.ac_clutch'   :
		case 'engine.dsc_ok'      :
		case 'engine.maf_error'   :
		case 'engine.running'     :
		case 'engine.smg_present' : update_quiet = false; break;

		case 'vehicle.speed.pulses' : update_quiet = true; break;
	}

	// Selectively transform data value depending on data.topic
	switch (data.topic) {
		case 'engine.rpm'     :
		case 'fuel.pump.duty' : data.msg = Math.round(data.msg); break;

		case 'engine.torque.after_interventions'  :
		case 'engine.torque.before_interventions' :
		case 'engine.torque.loss'                 :
		case 'engine.torque.output'               : data.msg = num.round2(data.msg, 1); break;

		case 'vehicle.speed.pulses' : data.msg = num.round2((data.msg / 16), 3); break;
	}

	// console.dir({ topic : data.topic, value : data.msg, update_quiet });
	update.status(data.topic, data.msg, update_quiet);
}

function parse_canbus(data) {
	// For data (pre) parsed by bmwi/lib/intf-can.js
	if (data.type === 'parsed') return parse_canbus_kcd(data);

	// If a defined module for the message source exists, pass the data to it
	if (typeof modules[data.src.name] === 'undefined' || modules[data.src.name] === null) {
		log.msg('module not exist: ' + data.src.name + ' id: 0x' + data.src.id.toString(16));
		return;
	}

	if (typeof modules[data.src.name].parse_out !== 'function') {
		log.msg('module.parse_out() not exist: ' + data.src.name + ' id: 0x' + data.src.id.toString(16));
		return;
	}

	// TODO: Unknown message handler should go here
	modules[data.src.name].parse_out(data);
}

// Parse messages from IBUS/KBUS
function parse_low(data) {
	// Parse received data only from actual modules
	if (data.src.name === 'GLO' || data.src.name === 'LOC') return;

	// Locked-case module acronyms
	data.dst.lower = data.dst.name.toLowerCase();
	data.dst.upper = data.dst.name.toUpperCase();
	data.src.lower = data.src.name.toLowerCase();
	data.src.upper = data.src.name.toUpperCase();

	const data_in = data;

	// Skip below logic if DST is DIA
	// Parse sent data to emulated modules
	if (config.emulate[data.dst.lower] === true && data.dst.lower === 'dia') {
		return modules[data.dst.upper].parse_in(data_in);
	}

	if (modules[data.src.upper] && data.src.lower === 'dia') {
		return modules[data.src.upper].parse_out(data);
	}

	// Non-module-specifc commands
	// Message command types go in this file if the are sent from more than one module
	switch (data.msg[0]) {
		case 0x01 : { // Request: Device status
			data.command = 'req';
			data.value   = 'device status';

			// Send reply if configured to do so
			bus.cmds.send_device_status(data.dst.name);
			break;
		}


		case 0x02 : { // Broadcast: Device status
			data.command = 'sta';
			data.value   = 'ready';

			// Set device status ready var
			update.status(data.src.lower + '.ready', true, false);

			if (data.msg[1] === 0x01) {
				// Set device status reset var
				update.status(data.src.lower + '.reset', false, false);
				data.value += ' after reset';
				break;
			}

			// Attempt to send audio power button
			if (data.src.name === 'DSP' || data.src.name === 'RAD') {
				BMBT.toggle_power_if_ready();
				MID.toggle_power_if_ready();
			}

			break;
		}


		case 0x03 : { // Request: Bus status
			data.command = 'req';
			data.value   = 'bus status';
			break;
		}

		case 0x04 : { // Broadcast: Bus status
			data.command = 'bro';
			data.value   = 'bus status';
			break;
		}

		case 0x10 : { // Request: Ignition status
			data.command = 'req';
			data.value   = 'ignition status';
			break;
		}

		case 0x12 : { // Request: IKE sensor status
			data.command = 'req';
			data.value   = 'IKE sensor status';
			break;
		}

		case 0x14 : { // Request: Country coding data request
			data.command = 'req';
			data.value   = 'country coding data';
			break;
		}

		case 0x16 : { // Request: Odometer
			data.command = 'req';
			data.value   = 'odometer';
			break;
		}

		case 0x1B : { // ACK text message
			data.command = 'ack';
			data.value   = parseFloat(data.msg[1]) + ' text messages';
			break;
		}

		case 0x1D : { // Request: Temperature values
			data.command = 'req';
			data.value   = 'temperature values';
			break;
		}

		case 0x21 : { // Update: Menu text
			data.command = 'upd';
			data.value   = 'menu text: ' + hex.h2s(data.msg);
			break;
		}

		case 0x22 : { // ACK text message
			data.command = 'ack';
			data.value   = parseFloat(data.msg[1]) + ' text messages';
			break;
		}


		case 0x23 : { // Update: Display text
			data.command = 'upd';
			let layout;

			// data.msg[1] - Layout
			switch (data.msg[1]) {
				case 0x00 : layout = 'phone';        break;
				case 0x24 : layout = 'checkcontrol'; break;
				case 0x40 : layout = 'display';      break;
				case 0x41 : layout = 'radio';        break;
				case 0x50 : layout = 'cluster';      break;
				case 0x62 : layout = 'radio';        break;
				default   : layout = 'unknown ' + data.msg[1];
			}

			// data.msg[2] - flags
			const flags = [];
			if (bitmask.test(data.msg[2], 0x01)) flags.push('Bit0'); // Nothing?
			if (bitmask.test(data.msg[2], 0x02)) flags.push('Bit1'); // Nothing?
			if (bitmask.test(data.msg[2], 0x04)) flags.push('Bit2'); // Nothing?
			if (bitmask.test(data.msg[2], 0x08)) flags.push('Bit3');
			if (bitmask.test(data.msg[2], 0x10)) flags.push('Bit4');
			if (bitmask.test(data.msg[2], 0x20)) flags.push('Clear screen');
			if (bitmask.test(data.msg[2], 0x40)) flags.push('Part tx');
			if (bitmask.test(data.msg[2], 0x80)) flags.push('Set cursor');

			data.value = 'display text, F: \'' + flags + '\', L: \'' + layout + '\', S: \'' + hex.h2s(data.msg) + '\'';
			break;
		}


		case 0x32 : { // Broadcast: Volume control
			// data.msg[1] -
			// -1 : 10
			// -2 : 20
			// -3 : 30
			// -4 : 40
			// -5 : 50
			// +1 : 11
			// +2 : 21
			// +3 : 31
			// +4 : 41
			// +5 : 51

			data.command = 'con';
			const volume = parseFloat(data.msg[1]);

			// Determine volume change direction
			const direction  = bitmask.test(volume, 0x01) && '+' || '-';
			const volume_inc = Math.floor(volume / 0x10);

			data.value = 'volume ' + direction + volume_inc + ' (' + volume + ')';

			// Translate button presses to CANBUS messages
			if (data.src.upper === 'MFL') {
				MFL.translate_button_media({
					action : 'depress',
					button : 'volume ' + direction,
				});
			}

			// If not configured to connect to Kodi, break
			if (config.media.kodi.enable !== true) break;

			// If not configured to have volume controls manipulate Kodi, break
			if (config.mfl.volume !== 'kodi') break;

			let volume_target;

			// Get the volume level from the default config
			// if we don't know the current volume level from Kodi
			// (if Kodi hasn't broadcasted the current volume yet)
			if (status.kodi.volume.level === null) update.status('kodi.volume.level', config.media.kodi.default_volume, false);

			switch (direction) {
				case '+' : volume_target = status.kodi.volume.level + volume_inc; break;
				case '-' : volume_target = status.kodi.volume.level - volume_inc;
			}

			// Disregard min and max volume levels
			if (volume_target < 1)   volume_target = 0;
			if (volume_target > 100) volume_target = 100;

			// Command Kodi to change to the new volume level
			kodi.volume(volume_target);

			break;
		}


		case 0x41 : { // Request: OBC value
			data.command = 'req';
			data.value   = 'OBC value ' + obc_values.h2n(data.msg[1]);
			break;
		}

		case 0x50 : { // Request: Check-control sensor status
			data.command = 'req';
			data.value   = 'check control sensor status';
			break;
		}

		case 0x53 : { // Request: Vehicle data
			data.command = 'req';
			data.value   = 'vehicle data';
			break;
		}

		case 0x5A : { // Request: Light status
			data.command = 'req';
			data.value   = 'light status';
			break;
		}

		case 0x5D : { // Request: Light dimmer status
			data.command = 'req';
			data.value   = 'light dimmer status';
			break;
		}

		case 0x71 : { // Request: Rain sensor status
			data.command = 'req';
			data.value   = 'rain sensor status';
			break;
		}

		case 0x73 : { // Request: Immobiliser status
			data.command = 'req';
			data.value   = 'immobilizer status';
			break;
		}

		case 0x75 : { // Request: Wiper status
			data.command = 'req';
			data.value   = 'wiper status';
			break;
		}

		case 0x79 : { // Request: Door/flap status
			data.command = 'req';
			data.value   = 'door/flap status';
			break;
		}

		case 0xA2 : { // Reply: Diagnostic command rejected
			data.command = 'rep';
			data.value   = 'diagnostic command rejected';
			break;
		}

		case 0xFF : { // Reply: Diagnostic command not acknowledged
			data.command = 'rep';
			data.value   = 'diagnostic command not acknowledged';
			break;
		}
	}


	// Parse sent data to emulated modules
	if (config.emulate[data.dst.lower] === true) {
		modules[data.dst.upper].parse_in(data_in);
	}

	// If the global parser didn't handle it, try a module-specifc one
	if (modules[data.src.upper]) {
		data = modules[data.src.upper].parse_out(data);
	}

	// Add default 'unknown' data if need be
	if (!data.command) data.command = 'unk';
	if (!data.value)   data.value   = Buffer.from(data.msg);

	log.bus({
		bus     : data.bus,
		command : data.command,
		msg     : data.msg,
		src     : data.src,
		dst     : data.dst,
		value   : data.value,
	});
}


// Data handler
function receive(data) {
	switch (data.bus) {
		case 'can0' :
		case 'can1' : parse_canbus(data); break;

		case 'ibus' :
		case 'kbus' : parse_low(data);
	}
}


function init_listeners() {
	// Act upon data received from vehicle bus via socket
	socket.on('recv-bus-rx', receive);
}

function send(data) {
	// Get the name of the calling module if the data destination hasn't been specified
	if (typeof data.dst === 'undefined' || data.dst === null) {
		data.dst = path.parse(caller()).name;
	}

	data.bus = bus_detect(data);

	// If in full emulation mode, modify it to match incoming data and loop it back
	if (config.loopback === false) return socket.bus_tx(data);

	// TODO: Add error message output when trying to send to disabled interface
	if (config.intf[data.bus].enabled !== true) return;

	data.dst = {
		id   : bus.modules.n2h(data.dst),
		name : data.dst,
	};

	data.src = {
		id   : bus.modules.n2h(data.src),
		name : data.src,
	};

	switch (data.bus) {
		case 'can0' :
		case 'can1' : {
			data.msg = data.data.toJSON().data;

			data.src = {
				name : bus.arbids.h2n(data.id),
				id   : data.id,
			};

			delete data.data;
			delete data.dst;
			delete data.id;
		}
	}

	receive(data);
}


module.exports = {
	send,
	receive,

	init_listeners,
};
