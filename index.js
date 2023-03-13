/* eslint no-console       : 0 */
/* eslint no-global-assign : 0 */


app_path = __dirname;
app_name = 'bmwcd';
app_intf = 'client';

terminating = false;

// node-bmw shared libraries
[ 'api', 'bitmask', 'gpio', 'hex', 'json', 'log-output', 'num', 'obc-values' ].reduce((obj, id) => {
	const varName = id.replace('-', '_').replace('_output', '');
	obj[varName] = require(`${id}`); return obj;
}, global);


// Class/event-based modules
[ 'power', 'socket', 'update' ].reduce((obj, id) => {
	obj[id] = new (require(`${id}`))(); return obj;
}, global);


// Function to load modules that require data from config object,
// AFTER the config object is loaded
async function load_modules() {
	// CANBUS/DBUS/KBUS/IBUS modules
	[
		'ABG', 'ASC', 'BMBT', 'CCM', 'CDC', 'DIA', 'DSP', 'DSPC', 'DME', 'GT',
		'IHKA', 'LCM', 'MFL', 'MID', 'NAV', 'PDC', 'RAD', 'RDC', 'RLS',
		'TEL', 'VID', 'CON', 'DSC', 'FEM', 'KOMBI', 'NBT', 'SZM',
	].reduce((obj, id) => {
		obj[id] = require(`${id}`); return obj;
	}, global);

	// Class/event-based modules
	[ 'GM', 'CAS', 'EGS', 'EWS', 'IKE' ].reduce((obj, id) => {
		obj[id] = new (require(`${id}`))();
		return obj;
	}, global);

	// Other libraries
	[ 'bluetooth', 'hdmi-cec', 'hdmi-rpi', 'kodi', 'bus' ].reduce((obj, id) => {
		const varName = id.replace('-', '_');
		obj[varName] = require(`${id}`); return obj;
	}, global);

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
	// config.console.output = false;
} // async init()

// Global term
async function term() {
	if (terminating === true) return;
	terminating = true;

	// Enable console output
	config.console.output = true;

	log.msg('Terminating');

	await bluetooth.command('disconnect'); // Disconnect Bluetooth device

	await api.term();      // Stop Express API server
	await json.write();    // Write JSON config and status files
	await socket.term();   // Stop socket client
	await hdmi_cec.term(); // Close HDMI (CEC)
	await hdmi_rpi.term(); // Close HDMI (RPi)
	await gpio.term();     // Terminate GPIO relays
	await kodi.term();     // Stop Kodi WebSocket client

	log.msg('Terminated');

	// Disable console output
	// config.console.output = false;

	process.exit();
} // async term()


// FASTEN SEATBELTS
(async () => { await init(); })();
