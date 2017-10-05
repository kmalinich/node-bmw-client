/* eslint no-global-assign: "off", no-console: "off" */

app_path = __dirname;
app_name = 'bmwcd';
app_intf = 'client';

process.title = app_name;

// node-bmw libraries
api        = require('api');
bitmask    = require('bitmask');
hex        = require('hex');
json       = require('json');
log        = require('log-output');
obc_values = require('obc-values');
os         = require('os');
socket     = require('socket');
update     = require('update');
weather    = require('weather');


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
		log.msg({ msg : 'Terminated' });
	});

	process.nextTick(pass);
}

// Function to load modules that require data from config object,
// AFTER the config object is loaded
function load_modules(pass) {
	// DBUS/KBUS/IBUS modules
	ABG  = require('ABG');
	AHL  = require('AHL');
	ANZV = require('ANZV');
	ASC  = require('ASC');
	ASST = require('ASST');
	BMBT = require('BMBT');
	CCM  = require('CCM');
	CDC  = require('CDC');
	CDCD = require('CDCD');
	CID  = require('CID');
	CSU  = require('CSU');
	CVM  = require('CVM');
	DIA  = require('DIA');
	DME  = require('DME');
	DMEK = require('DMEK');
	DSP  = require('DSP');
	DSPC = require('DSPC');
	EGS  = require('EGS');
	EHC  = require('EHC');
	EKM  = require('EKM');
	EKP  = require('EKP');
	EWS  = require('EWS');
	FBZV = require('FBZV');
	FHK  = require('FHK');
	FID  = require('FID');
	FMBT = require('FMBT');
	GM   = require('GM');
	GR   = require('GR');
	GT   = require('GT');
	GTF  = require('GTF');
	HAC  = require('HAC');
	HKM  = require('HKM');
	IHKA = require('IHKA');
	IKE  = require('IKE');
	IRIS = require('IRIS');
	LCM  = require('LCM');
	LWS  = require('LWS');
	MFL  = require('MFL');
	MID  = require('MID');
	MM3  = require('MM3');
	MML  = require('MML');
	MMR  = require('MMR');
	NAV  = require('NAV');
	NAVC = require('NAVC');
	NAVE = require('NAVE');
	NAVJ = require('NAVJ');
	PDC  = require('PDC');
	PIC  = require('PIC');
	RAD  = require('RAD');
	RCC  = require('RCC');
	RCSC = require('RCSC');
	RDC  = require('RDC');
	RLS  = require('RLS');
	SDRS = require('SDRS');
	SES  = require('SES');
	SHD  = require('SHD');
	SM   = require('SM');
	SMAD = require('SMAD');
	SOR  = require('SOR');
	STH  = require('STH');
	TCU  = require('TCU');
	TEL  = require('TEL');
	VID  = require('VID');

	// CANBUS modules
	ASC1 = require('ASC1');
	CON1 = require('CON1');
	DME1 = require('DME1');

	// Custom libraries
	BT   = require('BT');
	HDMI = require('HDMI');
	kodi = require('kodi');

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
		load_modules(() => { // Load IBUS module node modules
			host_data.init(() => { // Initialize host data object
				weather.init(() => { // Initialize weather object
					kodi.init(); // Start Kodi WebSocket client
					BT.init(); // Start Linux D-Bus Bluetooth handler

					gpio.init(() => { // Initialize GPIO relays
						HDMI.init(() => { // Open HDMI-CEC
							socket.init(() => { // Start zeroMQ client
								api.init(() => { // Start Express API server
									log.msg({ msg : 'Initialized' });


									// notify.notify('Started');

									IKE.text_warning('     bmwcd restart', 3000);

									setTimeout(() => {
										socket.lcd_text_tx({
											upper : app_name + ' ' + status.system.host.short,
											lower : 'restarted',
										});
									}, 250);
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

	HDMI.term(() => { // Close HDMI-CEC
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
term_config(() => {
	init();
});
