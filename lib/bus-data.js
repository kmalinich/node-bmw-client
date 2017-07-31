const module_name = __filename.slice(__dirname.length + 1, -3).replace('-', '_');

// Object of modules for use below in default case statement
const modules = {
	ABG  : ABG,  AHL  : AHL,  ANZV : ANZV, ASC  : ASC,  ASST : ASST,
	BMBT : BMBT, CCM  : CCM,  CDC  : CDC,  CDCD : CDCD, CID  : CID,
	CSU  : CSU,  CVM  : CVM,  DIA  : DIA,  DME  : DME,
	DSP  : DSP,  DSPC : DSPC, EGS  : EGS,  EHC  : EHC,  EKM  : EKM,
	EKP  : EKP,  EWS  : EWS,  FBZV : FBZV, FHK  : FHK,  FID  : FID,
	FMBT : FMBT, GM   : GM,   GR   : GR,   GT   : GT,   GTF  : GTF,
	HAC  : HAC,  HKM  : HKM,  IHKA : IHKA, IKE  : IKE,  IRIS : IRIS,
	LCM  : LCM,  LWS  : LWS,  MFL  : MFL,  MID  : MID,  MID1 : MID1,
	MM3  : MM3,  MML  : MML,  MMR  : MMR,  NAV  : NAV,  NAVC : NAVC,
	NAVE : NAVE, NAVJ : NAVJ, PDC  : PDC,  PIC  : PIC,  RAD  : RAD,
	RCC  : RCC,  RCSC : RCSC, RDC  : RDC,  RLS  : RLS,  SDRS : SDRS,
	SES  : SES,  SHD  : SHD,  SM   : SM,   SMAD : SMAD, SOR  : SOR,
	STH  : STH,  TCU  : TCU,  TEL  : TEL,  VID  : VID,

	// CANBUS
	ASC1 : ASC1,
	CON1 : CON1,
	DME1 : DME1,
	// KOMBI : KOMBI,
	// FRM : FRM,
	// facepalm
};

// Determine destination network by module name
function dst_detect(data) {
	// If data.bus is defined, use it
	if (typeof data.bus !== 'undefined' && data.bus !== null) {
		return data.bus;
	}

	// No dst? Must be CANBUS.. and I must be lazy.
	if (typeof data.dst === 'undefined' || data.dst === null) {
		return 'can1';
	}

	switch (data.dst) {
			// IBUS
		case 'ANZV' : return 'ibus';
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

			// KBUS
		case 'ABG'  : return 'kbus';
		case 'EWS'  : return 'kbus';
		case 'GLO'  : return 'kbus'; // IKE will mirror packets with dst GLO from IBUS<->KBUS networks
		case 'GM'   : return 'kbus';
		case 'HAC'  : return 'kbus';
		case 'IHKA' : return 'kbus';
		case 'RLS'  : return 'kbus';
		case 'SHD'  : return 'kbus';
		case 'STH'  : return 'kbus';

			// case 'DIA' : console.log('[node:SEND] [%s->%s] command:', data.src, data.dst, data.msg); return;
		case 'DIA': return false;

			// Dunno? Welp, try to send to both KBUS and IBUS
		default : return 'both-low';
	};
}

function parse_canbus(data) {
	// console.dir(data, { showHidden: true, depth: null, colors: true});

	// Locked-case module acronyms
	data.src.lower = data.src.name.toLowerCase();
	data.src.upper = data.src.name.toUpperCase();

	// Workaround for AMP encoding
	data.msg = data.msg.data;

	// If a defined module for the message source exists,
	// pass the data to it
	if (modules[data.src.upper] != null) {
		modules[data.src.upper].parse_out(data);
		return;
	}

	// console.log(data);
}

// Parse messages from IBUS/KBUS
function parse_low(data) {
	// Parse received data only from actual modules
	if (data.src.name == 'GLO' || data.src.name == 'LOC') return;

	// Locked-case module acronyms
	data.dst.lower = data.dst.name.toLowerCase();
	data.dst.upper = data.dst.name.toUpperCase();
	data.src.lower = data.src.name.toLowerCase();
	data.src.upper = data.src.name.toUpperCase();

	// Non-module-specifc commands
	// Message command types go in this file if the are sent from more than one module
	switch (data.msg[0]) {
		case 0x01: // Request: Device status
			data.command = 'req';
			data.value   = 'device status';
			// Send reply if configured to do so
			bus.commands.send_device_status(data.dst.name);
			break;

		case 0x02: // Broadcast: Device status
			data.command = 'sta';
			data.value   = 'ready';

			// Set device status ready var
			status[data.src.lower].ready = true;

			if (data.msg[1] === 0x01) {
				// Set device status reset var
				status[data.src.lower].reset = false;
				data.value += ' after reset';
				break;
			}

			// Attempt to send audio power button
			if (data.src.name == 'DSP' || data.src.name == 'RAD') {
				BMBT.toggle_power_if_ready();
				MID.toggle_power_if_ready();
			}
			break;

		case 0x03: // Request: Bus status
			data.command = 'req';
			data.value   = 'bus status';
			break;

		case 0x04: // Broadcast: Bus status
			data.command = 'bro';
			data.value   = 'bus status';
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

		case 0x1B: // ACK text message
			data.command = 'ack';
			data.value   = parseFloat(data.msg[1])+' text messages';
			break;

		case 0x1D: // Request: Temperature values
			data.command = 'req';
			data.value   = 'temperature values';
			break;

		case 0x21: // Update: Menu text
			data.command = 'upd';
			data.value   = 'menu text: '+hex.h2s(data.msg);
			break;

		case 0x22: // ACK text message
			data.command = 'ack';
			data.value   = parseFloat(data.msg[1])+' text messages';
			break;

		case 0x23: // Update: Display text
			data.command = 'upd';
			let layout;

			// data.msg[1] - Layout
			switch (data.msg[1]) {
				case 0x00 : layout = 'phone';        break;
				case 0x24 : layout = 'checkcontrol'; break;
				case 0x40 : layout = 'display';      break;
				case 0x50 : layout = 'cluster';      return; break;
				case 0x62 : layout = 'radio';        break;
				default   : layout = 'unknown '+data.msg[1]; break;
			}

			// data.msg[2] - flags
			let flags = [];
			if (bitmask.test(data.msg[2], 0x20)) { flags.push('CLS');       };
			if (bitmask.test(data.msg[2], 0x40)) { flags.push('PartTx');    };
			if (bitmask.test(data.msg[2], 0x80)) { flags.push('SetCursor'); };

			data.value = 'display text, F/L: '+flags+'/'+layout+', \''+hex.h2s(data.msg)+'\'';
			break;

		case 0x41: // Request: OBC value
			data.command = 'req';
			data.value   = 'OBC value '+obc_values.h2n(data.msg[1]);
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
			data.command = 'req';
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

	// If the global parser didn't handle it, try a module-specifc one
	if (data.command) {
		log.bus(data);
	}
	else if (modules[data.src.upper]) {
		modules[data.src.upper].parse_out(data);
	}
	else {
		data.command = 'unk';
		data.value   = Buffer.from(data.msg);
		log.bus(data);
	}

	// Parse sent data to emulated modules
	if (config.emulate[data.dst.lower] === true) modules[data.dst.upper].parse_in(data);
}


module.exports = {
	// Send vehicle bus data to bmwd
	send : (data) => {
		socket.bus_tx(dst_detect(data), data);
	},

	// Data handler
	receive : (data) => {
		// console.dir(data, { showHidden: true, depth: null, colors: true});

		// No dst? Must be CANBUS
		if (typeof data.dst === 'undefined' || data.dst === null) {
			parse_canbus(data);
			return;
		}

		parse_low(data);
	},
};
