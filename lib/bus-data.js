const caller = require('callers-path');
const path   = require('path');


// Object of modules for use below in default case statement
const modules = {
	// DBUS/IBUS/KBUS
	ABG  : ABG,
	ASC  : ASC,
	BMBT : BMBT,
	CCM  : CCM,
	CDC  : CDC,
	DIA  : DIA,
	DSP  : DSP,
	DSPC : DSPC,
	EWS  : EWS,
	GM   : GM,
	GT   : GT,
	IHKA : IHKA,
	IKE  : IKE,
	LCM  : LCM,
	MFL  : MFL,
	MID  : MID,
	NAV  : NAV,
	PDC  : PDC,
	RAD  : RAD,
	RDC  : RDC,
	RLS  : RLS,
	TEL  : TEL,
	VID  : VID,

	// CANBUS
	CAS   : CAS,
	CON   : CON,
	DSC   : DSC,
	EGS   : EGS,
	FEM   : FEM,
	KOMBI : KOMBI,
	NBT   : NBT,
	SZM   : SZM,

	// Hybrid
	DME : DME,
};


// Determine destination network by module name
function bus_detect(data) {
	// If data.bus is defined, use it
	if (typeof data.bus !== 'undefined' && data.bus !== null) {
		return data.bus;
	}

	// No dst? Must be CANBUS.. and I must be lazy
	// TODO handle this properly, since if undefined it will all go to can1
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

function parse_canbus(data) {
	// Locked-case module acronyms
	data.src.lower = data.src.name.toLowerCase();
	data.src.upper = data.src.name.toUpperCase();

	// If a defined module for the message source exists, pass the data to it
	if (typeof modules[data.src.upper] !== 'undefined' && modules[data.src.upper] !== null) {
		if (typeof modules[data.src.upper].parse_out === 'function') {
			// TODO Unknown message handler should go here
			modules[data.src.upper].parse_out(data);
		}
	}
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

	let data_in = data;

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
			// Send reply if configured to do so
			bus.cmds.send_device_status(data.dst.name);

			data.command = 'req';
			data.value   = 'device status';
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
			let flags = [];
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
			let volume = parseFloat(data.msg[1]);

			// Determine volume change direction
			let direction  = bitmask.test(volume, 0x01) && '+' || '-';
			let volume_inc = Math.floor(volume / 0x10);

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
	if (data.command) {
		return log.bus(data);
	}

	// Add default 'unknown' data
	data.command = 'unk';
	data.value   = Buffer.from(data.msg);

	if (modules[data.src.upper]) {
		return modules[data.src.upper].parse_out(data);
	}

	log.bus(data);
}


// Data handler
function recv(data) {
	switch (data.bus) {
		case 'can0' :
		case 'can1' : parse_canbus(data); break;

		case 'ibus' :
		case 'kbus' : parse_low(data);
	}
}


function init_listeners() {
	// Act upon zeroMQ socket events
	socket.on('recv-bus-rx', recv);

	// socket.on('recv-bus-rx', (data) => {
	// 	recv(data);
	// });
}

function send(data) {
	// Get the name of the calling module if the data destination hasn't been specified
	if (typeof data.dst === 'undefined' || data.dst === null) {
		data.dst = path.parse(caller()).name;
	}

	data.bus = bus_detect(data);

	// If in full emulation mode, modify it to match incoming data and loop it back
	if (config.loopback === false) return socket.bus_tx(data);

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

	recv(data);
}


module.exports = {
	send    : send,
	receive : (data) => { return recv(data); },

	init_listeners : init_listeners,
};
