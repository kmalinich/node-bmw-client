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
socket       = require('socket');

function load_modules(callback) {
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

	// Data handler/router
	data_handler = require('data-handler');

	// Custom libraries
	BT   = require('BT');
	HDMI = require('HDMI');
	kodi = require('kodi');

	log.msg({
		src : module_name,
		msg : 'Loaded modules',
	});

	if (typeof callback === 'function') { callback(); }
}

// Global startup
function startup() {
	log.msg({
		src : module_name,
		msg : 'Starting',
	});

	json.read(() => { // Read JSON config and status files
		json.reset(() => { // Reset status and module vars pertinent to launching app
			load_modules(() => { // Load IBUS module node modules
				kodi.autoconfig_loop(true, () => {}); // Enable kodi autoconfig
				socket.startup(() => { // Start WebSocket client
					HDMI.startup(() => { // Open HDMI-CEC
						BT.autoconfig(() => { // Open Bluetooth connection

							IKE.text_override('App restart');
							log.msg({
								src : module_name,
								msg : 'Started',
							});

						});
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

	socket.shutdown(() => { // Stop WebSocket client
		HDMI.shutdown(() => { // Close HDMI-CEC
			kodi.shutdown(() => { // Close Kodi websocket/clean up
				log.msg({
					src : module_name,
					msg : 'Shut down',
				});
				process.exit();
			});
		});
	});
}

// Shutdown events/signals
process.on('SIGTERM', () => { shutdown('SIGTERM'); });
process.on('SIGINT',  () => { shutdown('SIGINT');  });
process.on('SIGPIPE', () => { shutdown('SIGPIPE'); });

startup();
