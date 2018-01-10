/* eslint no-console       : 0 */
/* eslint no-global-assign : 0 */

app_path = __dirname;
app_name = 'bmwcd';
app_intf = 'client';

process.title = app_name;


// node-bmw libraries
api        = require('api');
bitmask    = require('bitmask');
hex        = require('hex');
socket     = new (require('socket'))();
json       = require('json');
log        = require('log-output');
obc_values = require('obc-values');
os         = require('os');
update     = require('update');
weather    = require('weather');

objfmt = require('object-format');


// Configure term event listeners
function term_config(pass) {
	process.on('SIGTERM', () => {
		console.log('');
		log.msg({ msg : 'Caught SIGTERM' });
		process.nextTick(term);
	});

	process.on('SIGINT', () => {
		console.log('');
		log.msg({ msg : 'Caught SIGINT' });
		process.nextTick(term);
	});

	process.on('exit', () => {
		bail();
		log.msg({ msg : 'Terminated' });
	});

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
	EWS  = require('EWS');
	GM   = new (require('GM'))();
	GT   = require('GT');
	IHKA = require('IHKA');
	IKE  = new (require('IKE'))();
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
	ASC1 = require('ASC1');
	CON1 = require('CON1');
	DME1 = require('DME1');

	// Media libraries
	bluetooth = require('bluetooth');
	hdmi      = require('hdmi');
	kodi      = require('kodi');

	// Data handler/router
	bus = require('bus');

	// Host data object (CPU, memory, etc.)
	host_data = require('host-data');

	// GPIO library
	gpio = require('gpio');

	// Push notification library
	if (config.notification.method !== null) notify = require('notify');

	log.module({ msg : 'Loaded modules' });

	process.nextTick(pass);
}


// Global init
function init() {
	log.msg({ msg : 'Initializing' });

	json.read(() => { // Read JSON config and status files
		load_modules(() => { // Load IBUS/KBUS module node modules
			json.reset(() => { // Reset vars (hack =/)
				// Initialize event listeners for GM and IKE
				BMBT.init_listeners();
				CON1.init_listeners();
				GM.init_listeners();
				IKE.init_listeners();
				LCM.init_listeners();
				MID.init_listeners();
				gpio.init_listeners();
				json.init_listeners();

				host_data.init(() => { // Initialize host data object
					weather.init(() => { // Initialize weather object
						kodi.init(); // Start Kodi WebSocket client
						bluetooth.init(); // Start Linux D-Bus Bluetooth handler

						gpio.init(() => { // Initialize GPIO relays
							hdmi.init(() => { // Open HDMI-CEC
								socket.init(() => { // Start zeroMQ client
									api.init(() => { // Start Express API server
										log.msg({ msg : 'Initialized' });

										// notify.notify('Started');
										//
										// setTimeout(() => {
										// 	socket.lcd_text_tx({
										// 		upper : app_name + ' ' + status.system.host.short,
										// 		lower : 'restarted',
										// 	});
										// }, 250);
									}, term);
								}, term);
							}, term);
						}, term);
					}, term);
				}, term);
			}, term);
		}, term);
	}, term);
}

// Save-N-Exit
function bail() {
	json.write(() => { // Write JSON config and status files
		process.exit();
	});
}

// Global term
function term() {
	log.msg({ msg : 'Terminating' });

	hdmi.term(() => { // Close HDMI-CEC
		gpio.term(() => { // Terminate GPIO relays
			host_data.term(() => { // Terminate host data timeout
				socket.term(() => { // Stop zeroMQ client
					kodi.term(bail); // Stop Kodi WebSocket client
				}, bail);
			}, bail);
		}, bail);
	}, bail);
}


// FASTEN SEATBELTS
term_config(init);
