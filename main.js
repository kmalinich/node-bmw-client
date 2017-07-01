var module_name = __filename.slice(__dirname.length + 1, -3);
app_path = __dirname;

// npm libraries
convert = require('node-unit-conversion');
moment  = require('moment');
now     = require('performance-now');
os      = require('os');
pad     = require('pad');
suncalc = require('suncalc');

// node-bmw libraries
bitmask      = require('bitmask');
bus_commands = require('bus-commands');
bus_modules  = require('bus-modules');
hex          = require('hex');
json         = require('json');
log          = require('log-output');
obc_values   = require('obc-values');
socket       = require('socket');


function load_modules(load_modules_callback) {
	// Host data object (CPU, memory, etc.)
	host_data = require('host-data');

	// Data bus module libraries
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
	CON  = require('CON');
	CSU  = require('CSU');
	CVM  = require('CVM');
	DIA  = require('DIA');
	DME  = require('DME');
	DME2 = require('DME2');
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
	MID1 = require('MID1');
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

	// Custom libraries
	BT   = require('BT');
	HDMI = require('HDMI');
	kodi = require('kodi');

	log.msg({
		src : module_name,
		msg : 'Loaded modules',
	});

	bus_data = require('bus-data'); // Data handler/router

	if (typeof load_modules_callback === 'function') load_modules_callback();
	load_modules_callback = undefined;
}

// Global startup
function startup() {
	log.msg({
		src : module_name,
		msg : 'Starting',
	});

	json.read(() => { // Read JSON config and status files
		load_modules(() => { // Load IBUS module node modules

			// Initialize host data object
			host_data.init();

			kodi.start(); // Start Kodi WebSocket client
			BT.start(); // Start Linux D-Bus Bluetooth handler

			HDMI.startup(() => { // Open HDMI-CEC
				socket.startup(); // Start WebSocket client

				log.msg({
					src : module_name,
					msg : 'Started',
				});

				IKE.text_warning('  node-bmw restart', 3000);

				socket.lcd_text_tx({
					upper : 'bmwcd',
					lower : 'node-bmw restart',
				})

				// CON.send_status_ignition_new();
			});
		});
	});
}

// Global shutdown
function shutdown(signal) {
	log.msg({
		src : module_name,
		msg : 'Received '+signal+', shutting down',
	});

	socket.shutdown(() => { // Stop WebSocket client
		json.write(() => { // Write JSON config and status files
			HDMI.shutdown(() => { // Close HDMI-CEC
				kodi.stop(() => { // Stop Kodi WebSocket client

					log.msg({
						src : module_name,
						msg : 'Shut down',
					});

					process.exit();
				});
			});
		});
	});
}

// Shutdown events/signals
process.on('SIGTERM', () => { shutdown('SIGTERM'); });
process.on('SIGINT',  () => { shutdown('SIGINT');  });
process.on('SIGPIPE', () => { shutdown('SIGPIPE'); });

startup();
