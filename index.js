/* eslint no-console           : 0 */
/* eslint no-global-assign     : 0 */
/* eslint stylistic/list-style : 0 */


app_path = __dirname;
app_name = 'bmwcd';
app_intf = 'client';

process.title = app_name;

terminating = false;

// CANBUS/DBUS/KBUS/IBUS modules
const modules = require('./modules.js');
for (const module in modules) global[module] = modules[module];

// node-bmw shared libraries
const lib = require('./lib.js');
for (const module in lib) {
	global[module] = lib[module];
}


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

	await json.read();   // Read JSON config and status files
	await json.reset();  // Reset vars (hack =/)
	await socket.init(); // Start socket client(s)

	await api.init(); // Start Express API server

	await bluetooth.init(); // Start Linux D-Bus Bluetooth handler
	await gpio.init();      // Initialize GPIO relays
	await hdmi_cec.init();  // Open HDMI (CEC)
	await hdmi_rpi.init();  // Open HDMI (RPi)
	await kodi.init();      // Start Kodi WebSocket client

	// Initialize event listeners
	BMBT.initListeners();
	CAS.initListeners();
	CON.initListeners();
	DME.initListeners();
	DSC.initListeners();
	FEM.initListeners();
	GM.initListeners();
	IKE.initListeners();
	LCM.initListeners();
	MID.initListeners();
	NBT.initListeners();
	RAD.initListeners();
	TEL.initListeners();

	bus.data.initListeners();
	gpio.initListeners();
	json.initListeners();
	kodi.initListeners();
	hdmi_rpi.initListeners();
	power.initListeners();

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

	power.power(false);
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
