/* eslint no-console         : 0 */
/* eslint no-global-assign   : 0 */
/* eslint import/no-commonjs : 0 */
/* eslint new-cap : 0 */

import share from './share/index.js';

import json   from './lib/json.js';
import power  from './lib/power.js';
import socket from './lib/socket.js';


process.title = 'bmwcd';

let terminating = false;


global.bitmask    = share.bitmask;
global.gpio       = share.gpio;
global.log        = share.log_output;
global.obc_values = share.obc_values;
global.weather    = share.weather;
global.update     = share.update;


// Class/event-based modules
global.power  = new power();
global.socket = new socket();
global.update = new update();


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
	DSP  = require('DSP');
	DSPC = require('DSPC');
	GT   = require('GT');
	IHKA = require('IHKA');
	LCM  = require('LCM');
	MFL  = require('MFL');
	MID  = require('MID');
	NAV  = require('NAV');
	PDC  = require('PDC');
	RAD  = require('RAD');
	RDC  = require('RDC');
	RLS  = require('RLS');
	TEL  = require('TEL');
	VID  = require('VID');

	// Class/event-based DBUS/KBUS/IBUS modules
	GM  = new (require('GM'))();
	CAS = new (require('CAS'))();
	EWS = new (require('EWS'))();
	IKE = new (require('IKE'))();

	// CANBUS modules
	CON   = require('CON');
	DSC   = require('DSC');
	FEM   = require('FEM');
	KOMBI = require('KOMBI');
	NBT   = require('NBT');
	SZM   = require('SZM');

	// Class/event-based CANBUS modules
	EGS = new (require('EGS'))();

	// Hybrid modules
	DME = require('DME');

	// Media libraries
	bluetooth = require('bluetooth');
	hdmi_cec  = require('hdmi-cec');
	hdmi_rpi  = require('hdmi-rpi');
	kodi      = require('kodi');

	// Data handler/router
	bus      = require('bus');
	bus.cmds = require('bus-cmds');
	bus.data = require('bus-data');

	log.msg('Loaded modules');

	process.nextTick(pass);
}


// Global init
function init() {
	log.msg('Initializing');

	json.read(() => { // Read JSON config and status files
		load_modules(() => { // Load IBUS/KBUS module node modules
			json.reset(() => { // Reset vars (hack =/)
				socket.init(() => { // Start socket client(s)
					share.api.init();       // Start Express API server
					bluetooth.init(); // Start Linux D-Bus Bluetooth handler
					gpio.init();      // Initialize GPIO relays
					hdmi_cec.init();  // Open HDMI-CEC
					hdmi_rpi.init();  // Open HDMI (RPi)
					kodi.init();      // Start Kodi WebSocket client
					weather.init();   // Initialize weather object

					// Initialize event listeners
					BMBT.init_listeners();
					CON.init_listeners();
					DME.init_listeners();
					DSC.init_listeners();
					FEM.init_listeners();
					GM.init_listeners();
					IKE.init_listeners();
					LCM.init_listeners();
					MID.init_listeners();
					NBT.init_listeners();
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
				socket.term(() => { // Stop zeroMQ client
					kodi.term(bail); // Stop Kodi WebSocket client
				}, bail);
			}, bail);
		}, bail);
	}, bail);
}


// FASTEN SEATBELTS
term_config(init);
