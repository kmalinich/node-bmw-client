const module_name = __filename.slice(__dirname.length + 1, -3);

app_path = __dirname;
app_name = 'bmwcd';
app_type = 'client';
app_intf = app_type;

// node-bmw libraries
bitmask      = require('bitmask');
hex          = require('hex');
json         = require('json');
log          = require('log-output');
obc_values   = require('obc-values');
socket       = require('socket');

bus = {
	arbids   : require('bus-arbids'),
	commands : require('bus-commands'),
	modules  : require('bus-modules'),
};


function load_modules(load_modules_callback) {
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

	// CANBUS modules
	ASC1 = require('ASC1');
	CON1 = require('CON1');
	DME1 = require('DME1');

	// Custom libraries
	BT   = require('BT');
	HDMI = require('HDMI');
	kodi = require('kodi');

	log.msg({
		src : module_name,
		msg : 'Loaded modules',
	});

	// Data handler/router
	bus_data = require('bus-data');

	// Host data object (CPU, memory, etc.)
	host_data = require('host-data');

	// GPIO library
	gpio = require('gpio');

	// Push notification library
	if (config.notification.method !== null) notify = require('notify');

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
			host_data.init(() => { // Initialize host data object
				kodi.start(); // Start Kodi WebSocket client
				BT.start(); // Start Linux D-Bus Bluetooth handler
				gpio.init(() => { // Initialize GPIO relays

					// Shutdown events/signals
					process.on('SIGTERM', () => { shutdown('SIGTERM'); });
					process.on('SIGINT',  () => { shutdown('SIGINT');  });
					process.on('SIGPIPE', () => { shutdown('SIGPIPE'); });

					HDMI.startup(() => { // Open HDMI-CEC
						socket.init(); // Start WebSocket client

						log.msg({
							src : module_name,
							msg : 'Started',
						});

						// notify.notify('Started');

						IKE.text_warning('  node-bmw restart', 3000);

						setTimeout(() => {
							socket.lcd_text_tx({
								upper : 'bmwcd '+status.system.host.short,
								lower : 'node-bmw restart',
							});
						}, 250);

					});
				});
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

	gpio.term(() => { // Terminate GPIO relays
		host_data.term(() => { // Terminate host data timeout
			socket.term(() => { // Stop WebSocket client
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
		});
	});
}

startup();
