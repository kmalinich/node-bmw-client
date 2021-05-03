/* eslint no-console       : 0 */
/* eslint no-global-assign : 0 */


// Bump up default max event listeners
require('events').EventEmitter.defaultMaxListeners = 20;

app_path = __dirname;
app_name = 'bmwcd';
app_intf = 'client';

process.title = app_name;

terminating = false;

// node-bmw shared libraries
api        = require('api');
bitmask    = require('bitmask');
gpio       = require('gpio');
hex        = require('hex');
json       = require('json');
log        = require('log-output');
num        = require('num');
obc_values = require('obc-values');

// Class/event-based modules
power  = new (require('power'))();  // External device power control library
socket = new (require('socket'))();
update = new (require('update'))();


// Function to load modules that require data from config object,
// AFTER the config object is loaded
async function load_modules() {
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
	bus = require('bus');

	log.msg('Loaded modules');
} // async load_modules()

// Configure term event listeners
async function term_config() {
	process.on('SIGTERM', async () => {
		if (terminating === true) return;

		console.log('');
		config.console.output = true;
		log.msg('Caught SIGTERM');
		await term();
	});

	process.on('SIGINT', async () => {
		if (terminating === true) return;

		console.log('');
		config.console.output = true;
		log.msg('Caught SIGINT');
		await term();
	});

	process.on('exit', () => {
		config.console.output = true;
		log.msg('Caught exit event');
	});
} // async term_config()

// Global init
async function init() {
	// Enable console output
	config = { console : { output : true } };

	log.msg('Initializing');

	await term_config();

	await json.read();    // Read JSON config and status files
	await load_modules(); // Load IBUS/KBUS module node modules
	await json.reset();   // Reset vars (hack =/)
	await socket.init();  // Start socket client(s)

	await api.init(); // Start Express API server

	await bluetooth.init(); // Start Linux D-Bus Bluetooth handler
	await gpio.init();      // Initialize GPIO relays
	await hdmi_cec.init();  // Open HDMI-CEC
	await hdmi_rpi.init();  // Open HDMI (RPi)
	await kodi.init();      // Start Kodi WebSocket client

	// Initialize event listeners
	BMBT.init_listeners();
	CAS.init_listeners();
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
	hdmi_rpi.init_listeners();
	power.init_listeners();

	log.msg('Initialized');

	// Disable console output
	config.console.output = false;
} // async init()

// Global term
async function term() {
	if (terminating === true) return;
	terminating = true;

	// Enable console output
	config.console.output = true;

	log.msg('Terminating');

	await api.term();      // Stop Express API server
	await json.write();    // Write JSON config and status files
	await socket.term();   // Stop socket client
	await hdmi_cec.term(); // Close HDMI (CEC)
	await hdmi_rpi.term(); // Close HDMI (RPi)
	await gpio.term();     // Terminate GPIO relays
	await kodi.term();     // Stop Kodi WebSocket client

	log.msg('Terminated');

	// Disable console output
	config.console.output = false;

	process.exit();
} // async term()


// FASTEN SEATBELTS
init();
