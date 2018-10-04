/* eslint no-console       : 0 */
/* eslint no-global-assign : 0 */

// Bump up default max event listeners
require('events').EventEmitter.defaultMaxListeners = 15;

app_path = __dirname;
app_name = 'bmwcd';
app_intf = 'client';

process.title = app_name;

terminating = false;

// node-bmw libraries
api        = require('api');
bitmask    = require('bitmask');
gpio       = require('gpio');          // GPIO library
hex        = require('hex');
json       = require('json');
log        = require('log-output');
obc_values = require('obc-values');
objfmt     = require('object-format'); // JSON/object formatter
weather    = require('weather');

// Class/event-based modules
power  = new (require('power'))();  // External device power control library
socket = new (require('socket'))();
update = new (require('update'))();


// Configure term event listeners
function term_config(pass) {
	process.on('SIGTERM', () => {
		if (terminating === true) return;

		console.log('');
		log.msg('Caught SIGTERM');
		process.nextTick(term);
	});

	process.on('SIGINT', () => {
		if (terminating === true) return;

		console.log('');
		log.msg('Caught SIGINT');
		process.nextTick(term);
	});

	process.on('exit', bail);

	process.nextTick(pass);
}

// Function to load modules that require data from config object,
// AFTER the config object is loaded
function load_modules(pass) {
	// DBUS/KBUS/IBUS modules
	ABG  = require('ABG');
	ASC  = require('ASC');
	BMBT = require('BMBT');
	CCM  = require('CCM');
	CDC  = require('CDC');
	DIA  = require('DIA');
	DME  = require('DME');
	DMEK = require('DMEK');
	DSP  = require('DSP');
	DSPC = require('DSPC');
	GT   = require('GT');
	IHKA = require('IHKA');
	LCM  = require('LCM');
	MFL  = require('MFL');
	MID  = require('MID');
	NAV  = require('NAV');
	NAVE = require('NAVE');
	PDC  = require('PDC');
	RAD  = require('RAD');
	RDC  = require('RDC');
	RLS  = require('RLS');
	TEL  = require('TEL');
	VID  = require('VID');

	// Class/event-based modules
	GM  = new (require('GM'))();
	EWS = new (require('EWS'))();
	IKE = new (require('IKE'))();

	// Not-yet-utilized DBUS/KBUS/IBUS modules
	// AHL  = require('AHL');
	// ANZV = require('ANZV');
	// ASST = require('ASST');
	// CDCD = require('CDCD');
	// CID  = require('CID');
	// CSU  = require('CSU');
	// CVM  = require('CVM');
	// EGS  = require('EGS');
	// EHC  = require('EHC');
	// EKM  = require('EKM');
	// EKP  = require('EKP');
	// FBZV = require('FBZV');
	// FHK  = require('FHK');
	// FID  = require('FID');
	// FMBT = require('FMBT');
	// GR   = require('GR');
	// GTF  = require('GTF');
	// HAC  = require('HAC');
	// HKM  = require('HKM');
	// IRIS = require('IRIS');
	// LWS  = require('LWS');
	// MM3  = require('MM3');
	// MML  = require('MML');
	// MMR  = require('MMR');
	// NAVC = require('NAVC');
	// NAVJ = require('NAVJ');
	// PIC  = require('PIC');
	// RCC  = require('RCC');
	// RCSC = require('RCSC');
	// SDRS = require('SDRS');
	// SES  = require('SES');
	// SHD  = require('SHD');
	// SM   = require('SM');
	// SMAD = require('SMAD');
	// SOR  = require('SOR');
	// STH  = require('STH');
	// TCU  = require('TCU');

	// CANBUS modules
	CAS1 = require('CAS1');
	CON1 = require('CON1');
	DME1 = require('DME1');
	DSC1 = require('DSC1');
	FEM1 = require('FEM1');
	NBT1 = require('NBT1');

	// Media libraries
	bluetooth = require('bluetooth');
	hdmi_cec  = require('hdmi-cec');
	hdmi_rpi  = require('hdmi-rpi');
	kodi      = require('kodi');

	// Data handler/router
	bus = require('bus');

	// Host data object (CPU, memory, etc.)
	host_data = require('host-data');

	// Push notification library
	// notify = require('notify');

	log.msg('Loaded modules');

	process.nextTick(pass);
}


// Global init
function init() {
	log.msg('Initializing');

	json.read(() => { // Read JSON config and status files
		load_modules(() => { // Load IBUS/KBUS module node modules
			json.reset(() => { // Reset vars (hack =/)
				socket.init(() => { // Start zeroMQ client
					host_data.init(() => { // Initialize host data object
						api.init();       // Start Express API server
						bluetooth.init(); // Start Linux D-Bus Bluetooth handler
						gpio.init();      // Initialize GPIO relays
						hdmi_cec.init();  // Open HDMI-CEC
						hdmi_rpi.init();  // Open HDMI (RPi)
						kodi.init();      // Start Kodi WebSocket client
						weather.init();   // Initialize weather object

						// Initialize event listeners
						BMBT.init_listeners();
						CON1.init_listeners();
						DME1.init_listeners();
						DSC1.init_listeners();
						FEM1.init_listeners();
						GM.init_listeners();
						IKE.init_listeners();
						LCM.init_listeners();
						MID.init_listeners();
						NBT1.init_listeners();
						RAD.init_listeners();

						bus.data.init_listeners();
						gpio.init_listeners();
						json.init_listeners();
						kodi.init_listeners();
						power.init_listeners();

						log.msg('Initialized');
					}, term);
				}, term);
			}, term);
		}, term);
	}, term);
}

// Save-N-Exit
function bail() {
	json.write(() => { // Write JSON config and status files
		log.msg('Terminated');
		process.exit();
	});
}

// Global term
function term() {
	if (terminating === true) return;
	terminating = true;

	log.msg('Terminating');

	hdmi_cec.term(() => { // Close HDMI-CEC
		hdmi_rpi.term(() => { // Close HDMI (RPi)
			gpio.term(() => { // Terminate GPIO relays
				host_data.term(() => { // Terminate host data timeout
					socket.term(() => { // Stop zeroMQ client
						kodi.term(bail); // Stop Kodi WebSocket client
					}, bail);
				}, bail);
			}, bail);
		}, bail);
	}, bail);
}


// FASTEN SEATBELTS
term_config(init);
