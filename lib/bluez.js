/* eslint require-atomic-updates : 0 */

// https://github.com/Niels-Be/node-bluez

// TODO: Make this a class

const os = require('os');


function delay(milliseconds) {
	return new Promise((resolve) => {
		setTimeout(resolve, milliseconds);
	});
}


function interface_properties_adapter(bt_interface) {
	log.lib(`Getting 'adapter' properties for interface : '${bt_interface}'`);

	bluetooth.service.getInterface(bt_interface, bluetooth.paths.dbus.prop, (error, data) => {
		if (error !== null) {
			log.error('Interface experienced error');
			console.error(error);
			return false;
		}

		// Remove any present listeners first
		typeof data.removeAllListeners === 'function' && data.removeAllListeners();

		data.on('PropertiesChanged', (property, data1) => {
			interface_properties_changed_adapter(property, data1);
		});
	});
} // interface_properties_adapter(bt_interface)

function interface_properties_device(bt_interface) {
	log.lib(`Getting 'device' properties for interface : '${bt_interface}'`);

	bluetooth.service.getInterface(bt_interface, bluetooth.paths.dbus.prop, (error, data) => {
		if (error !== null) {
			log.error(error);
			return false;
		}

		// Remove any present listeners first
		typeof data.removeAllListeners === 'function' && data.removeAllListeners();

		data.on('PropertiesChanged', (property, data1) => {
			interface_properties_changed_device(property, data1, bt_interface);
		});
	});
} // interface_properties_device(bt_interface)

function interface_properties_player(bt_interface) {
	log.lib(`Getting 'player' properties for interface : '${bt_interface}'`);

	bluetooth.service.getInterface(bt_interface, bluetooth.paths.dbus.prop, (error, data) => {
		if (error !== null) {
			log.error(error);
			return false;
		}

		// Set mediaplayer path in status vars
		update.status('bluetooth.device.paths.player', bt_interface);

		// Remove any present listeners first
		typeof data.removeAllListeners === 'function' && data.removeAllListeners();

		data.on('PropertiesChanged', (property, data1) => {
			interface_properties_changed_player(property, data1, bt_interface);
		});
	});
} // interface_properties_player(bt_interface)


function interface_properties_changed_adapter(property, data1) {
	log.lib('Adapter property \'' + property + '\' (\'' + data1[0][0].toLowerCase() + '\') changed');

	const key   = data1[0][0].toLowerCase();
	const value = data1[0][1][1][0];

	update.status('bluetooth.adapter.' + key, value);
} // interface_properties_changed_adapter(property, data1)

function interface_properties_changed_device(property, data1, bt_interface) {
	if (!data1[0])    return;
	if (!data1[0][0]) return;

	log.lib('Device \'' + bt_interface + '\' property \'' + property + '\' (\'' + data1[0][0].toLowerCase() + '\') changed');

	if (!data1[0][1])    return;
	if (!data1[0][1][1]) return;

	switch (typeof data1[0][1][1][0]) {
		case 'boolean' :
		case 'number'  :
		case 'string'  : break;
		default        : return;
	}

	const key   = data1[0][0].toLowerCase();
	const value = data1[0][1][1][0];

	// Return now if the value hasn't changed
	if (!update.status('bluetooth.device.' + key, value, false)) return;

	// Refresh MID text if configured
	if (config.media.bluetooth.text.mid === true) MID.refresh_text();

	switch (key) {
		case 'connected' : { // Just update TEL LED and return if the key name is 'connected' (connected status)
			TEL.led({
				solid_green : status.bluetooth.device.connected,
				solid_red   : !status.bluetooth.device.connected,
			});

			// Set playback status to paused upon device disconnection
			if (status.bluetooth.device.connected === false) {
				update.status('bluetooth.device.status', 'paused', false);
			}

			return;
		}

		case 'status' : { // Update TEL LED based on 'status' key (playback status)
			switch (value) {
				case 'playing' : {
					// If 'flash' and 'solid' for the same color are passed, the LED flashes
					TEL.led({
						solid_green : status.bluetooth.device.connected,
						solid_red   : !status.bluetooth.device.connected,

						solid_yellow : true,
					});

					break;
				}

				case 'paused' : {
					TEL.led({
						solid_green : status.bluetooth.device.connected,
						solid_red   : !status.bluetooth.device.connected,

						flash_yellow : true,
					});
				}
			}
		}
	}
} // interface_properties_changed_device(property, data1, bt_interface)

function interface_properties_changed_player(property, data1, bt_interface) {
	if (!data1[0])    return;
	if (!data1[0][0]) return;

	const propertyKey = data1[0][0].toLowerCase();

	// Skip track position update message since it spams the logs
	if (propertyKey !== 'position') {
		log.lib(`Player '${bt_interface}' property '${property}' ('${propertyKey}') changed`);
	}

	if (!data1[0][1])    return;
	if (!data1[0][1][1]) return;

	switch (typeof data1[0][1][1][0]) {
		case 'boolean' :
		case 'number'  :
		case 'string'  : {
			const key   = propertyKey;
			const value = data1[0][1][1][0];

			if (update.status('bluetooth.device.' + key, value)) {
				if (config.media.bluetooth.text.mid === true) MID.refresh_text();
			}

			break;
		} // 'boolean' || 'number' || 'string'

		default : {
			// Update misc information
			for (const key of data1[0][1][1][0]) {
				update.status('bluetooth.media.' + key[0].toLowerCase(), key[1][1][0]);
			}

			// Update MID text if configured
			if (config.media.bluetooth.text.mid === true) {
				if (update.status('mid.text.right', status.bluetooth.media.artist + ' - ' + status.bluetooth.media.title)) {
					MID.refresh_text();
				}
			}

			// Update IKE text if configured
			if (config.media.bluetooth.text.ike === true) {
				// TODO: Probably add what this doesn't catch, and move it out to a separate function

				// Lowercase 'Feat' to 'feat'
				const strings = {
					artist : status.bluetooth.media.artist.replace(/feat/gi, 'feat'),
					title  : status.bluetooth.media.title.replace(/feat/gi, 'feat'),
				};

				// Split at ' (feat. '
				strings.artist = strings.artist.split(' (feat. ')[0];
				strings.title  = strings.title.split(' (feat. ')[0];

				// Split at ' [feat. '
				strings.artist = strings.artist.split(' [feat. ')[0];
				strings.title  = strings.title.split(' [feat. ')[0];

				// Split at ' feat. '
				strings.artist = strings.artist.split(' feat. ')[0];
				strings.title  = strings.title.split(' feat. ')[0];

				IKE.text_override(strings.artist + ' - ' + strings.title);
			}
		} // default :
	} // switch (typeof data1[0][1][1][0])
} // interface_properties_changed_player(property, data1, bt_interface)


// Send commands over systemd dbus to BlueZ 5 to control device
async function command(action) {
	// Bounce if bluetooth disabled, no device found, or wrong platform
	if (config.media.bluetooth.enable !== true)    return;
	if (os.platform()                 !== 'linux') return;


	// Handle an already connected or disconnected device
	switch (action) {
		case 'connect'    : if (status.bluetooth.device.connected === true) return; break;
		case 'disconnect' : if (status.bluetooth.device.connected !== true) return; break;

		default : {
			if (status.bluetooth.device.connected === true) break;

			IKE.text_override('BT reconnect');
			await command('connect');
			return;
		}
	}


	// Bounce if attempting a media-related command without a player
	switch (action) {
		case 'next'     :
		case 'pause'    :
		case 'play'     :
		case 'previous' :
		case 'toggle'   : {
			if (typeof bluetooth.mediaPlayers[config.media.bluetooth.device_mac] === 'undefined') {
				IKE.text_override('BT reinit');
				await init();
				return;
			}
		}
	}


	// Capitalize first letter of action
	action = action.charAt(0).toUpperCase() + action.slice(1);


	// TEL LED commands for connect/disconnect
	switch (action) {
		case 'Connect'    : TEL.led({ flash_yellow : true, solid_red   : true }); break;
		case 'Disconnect' : TEL.led({ flash_yellow : true, solid_green : true });
	}

	log.lib(`Sending '${action}' command to device '${status.bluetooth.device.name}'`);

	switch (action) {
		case 'Connect'    : // Connect/disconnect commands with dbus_main object
		case 'Disconnect' : {
			await bluetooth.devices[config.media.bluetooth.device_mac][action]();
			break;
		}

		case 'Next'     : // Media-related commands with dbus_media object
		case 'Pause'    :
		case 'Play'     :
		case 'Previous' : {
			await bluetooth.mediaPlayers[config.media.bluetooth.device_mac][action]();
			break;
		}

		case 'Toggle' : { // Toggle playback based on current playback status
			switch (status.bluetooth.device.status) {
				case 'playing' : await command('pause'); break;
				case 'paused'  : await command('play');  break;
				default        : await command('pause');
			}
		}
	}
} // async command(action)


// Read dbus and get 1st paired device's name, status, path, etc
async function init_listeners() {
	// Bounce if bluetooth is disabled or wrong platform
	if (config.media.bluetooth.enable === false || os.platform() !== 'linux') return false;

	// Bounce if bluetooth event listeners
	if (bluetooth.listenersActive === true) {
		log.lib('Listeners already active');
		return;
	}

	log.lib('Initializing listeners');

	// // Connect/disconnect bluetooth device on power module event
	// power.on('active', async (power_state) => {
	// 	switch (power_state) {
	// 		case false : {
	// 			if (status.bluetooth.device.status === 'playing') {
	// 				await command('pause');
	// 			}

	// 			await delay(1000);
	// 			await command('disconnect');
	// 			await delay(1000);

	// 			bluetooth.device_num = 3;
	// 			break;
	// 		}

	// 		case true : {
	// 			await delay(1000);
	// 			await command('connect');
	// 		}
	// 	}
	// });

	// // Adapter properties interface
	// await interface_properties_adapter('/org/bluez/hci0');

	// // Interfaces added/removed
	// bluetooth.service.getInterface('/', bluetooth.paths.dbus.obj_man, async (error, data) => {
	// 	if (error !== null) {
	// 		log.error(error);
	// 		return false;
	// 	}

	// 	data.on('InterfacesRemoved', bt_interface => {
	// 		log.lib(`Interface '${bt_interface}' removed`);
	// 		// TODO: Remove device properties and player properties when interface is removed
	// 	});

	// 	data.on('InterfacesAdded', async bt_interface => {
	// 		// Device interface
	// 		if (new RegExp('^/org/bluez/hci[0-9]/dev_[A-F0-9][A-F0-9]_[A-F0-9][A-F0-9]_[A-F0-9][A-F0-9]_[A-F0-9][A-F0-9]_[A-F0-9][A-F0-9]_[A-F0-9][A-F0-9]$').test(bt_interface)) {
	// 			log.lib(`Device interface '${bt_interface}' added`);
	// 			await interface_properties_device(bt_interface);
	// 			return;
	// 		}

	// 		// MediaPlayer1 interface
	// 		if (new RegExp('/player[0-9]$').test(bt_interface)) {
	// 			log.lib(`MediaPlayer1 interface '${bt_interface}' added`);
	// 			await interface_properties_player(bt_interface);
	// 			return;
	// 		}

	// 		log.lib(`Interface '${bt_interface}' added`);
	// 	});
	// });


	// eslint require-atomic-updates
	bluetooth.listenersActive = true;

	log.lib('Initialized listeners');
} // async init_listeners()

async function handleDevice(address, props) {
	console.log('Found new Device ' + address + ' ' + props.Name);

	// Get the device interface
	const device = await bluetooth.bluez.getDevice(address);
	if (!props.Connected) {
		console.log('Connecting');
		// try normal connecting first. This might fail, so provide some backup methods
		await device.Connect().catch(() => {
			// also directly connecting to the GATT profile fails for an unknown reason. Maybe a Bluez bug?
			return device.ConnectProfile('0000ffe0-0000-1000-8000-00805f9b34fb');
		});
	}
	console.log('Connected');

	// wait until services are resolved
	for (let i = 0; !await device.ServicesResolved(); i++) {
		if (i > 100) {
			const props = await device.getProperties();
			throw new Error('No Services Resolved');
		}
		await delay(100);
	}
	await delay(10);
	console.log('Services Resolved');

	// get the Service
	const service = await device.getService('0000ffe0-0000-1000-8000-00805f9b34fb');
	if (!service) return console.log('No Service');

	// get the Characteristic from the Service
	const characteristic = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
	if (!characteristic) return console.log('No Characteristic');

	if (adapter) { await adapter.StopDiscovery().catch(() => { }); }

	await device.Disconnect();
	bluetooth.bluez.bus.disconnect();
}

async function init() {
	// Bounce if bluetooth disabled or wrong platform
	if (config.media.bluetooth.enable === false || os.platform() !== 'linux') return false;

	log.lib('Initializing');

	// Load node-bluez library
	if (bluetooth.bluez === null) bluetooth.bluez = new (require('bluez'))();

	// Register callback for new devices
	bluetooth.bluez.on('device', async (address, props) => {
		console.log('[NEW] Device:', { address, props });
		bluetooth.devices[address] = await bluetooth.bluez.getDevice(address).catch(console.error);

		if (!bluetooth.devices[address]) return;

		bluetooth.devices[address].on('PropertiesChanged', (props, invalidated) => {
			console.log('[CHG] Device:', address, props, invalidated);
		});
	});

	// Register callback for new media players
	bluetooth.bluez.on('mediaplayer', async (device, props) => {
		console.log('[NEW] Mediaplayer:', { device, props });

		bluetooth.mediaPlayers[props.Address] = await bluetooth.bluez.getMediaPlayer(device).catch(console.error);

		bluetooth.mediaPlayers[props.Address].on('PropertiesChanged', (props, invalidated) => {
			console.log('[CHG] MediaPlayer:', { device, props, invalidated });
		});

		bluetooth.mediaPlayers[props.Address].on('interface-removed', () => {
			console.log('[DEL] Player removed', device);
			bluetooth.mediaPlayers[props.Address].removeAllListeners();
			delete bluetooth.mediaPlayers[props.Address];
		});
	});


	bluetooth.bluez.init().then(async () => {
		bluetooth.adapter = await bluetooth.bluez.getAdapter();
	});


	// bluetooth.system_dbus.getObject(bluetooth.paths.bluez.main, '/', (error, objects) => {
	// 	if (error !== null) {
	// 		log.error(error);
	// 		return false;
	// 	}

	// 	// Device number
	// 	// TODO: THIS IS NO LONGER CORRECT!
	// 	// 1: Local bluetooth controller
	// 	// 2: 1st paired device
	// 	// 3: 2nd paired device
	// 	// 4: 3rd paired device
	// 	// ... so on and so forth
	// 	objects.as(bluetooth.paths.dbus.obj_man).GetManagedObjects(async (error_obj, return_obj) => {
	// 		if (error_obj) {
	// 			log.error(`Device number ${bluetooth.device_num} experienced error`);
	// 			console.error(error_obj);
	// 		}

	// 		if (!return_obj_check(return_obj)) {
	// 			if (bluetooth.device_num > 6) {
	// 				log.error(`Device number ${bluetooth.device_num} is invalid, cannot continue`);
	// 				return;
	// 			}

	// 			log.lib(`Device number ${bluetooth.device_num} is invalid, incrementing device counter`);
	// 			bluetooth.device_num++;
	// 			await init();
	// 			return;
	// 		}

	// 		const parse = {
	// 			name    : return_obj[bluetooth.device_num][1][1][1][2][1][1][0],
	// 			path    : return_obj[bluetooth.device_num][0],
	// 			service : return_obj[bluetooth.device_num][1][1][0],
	// 		};

	// 		// Set variables in status object appropriately
	// 		update.status('bluetooth.device.name',       parse.name);
	// 		update.status('bluetooth.device.paths.main', parse.path);
	// 		update.status('bluetooth.device.service',    parse.service);

	// 		switch (parse.name) {
	// 			case 'public'      :
	// 			case '/NowPlaying' : {
	// 				log.lib(`Device number ${bluetooth.device_num} => '${parse.name}' ('${parse.path}') is invalid, incrementing device counter`);
	// 				bluetooth.device_num++;
	// 				await init();
	// 				return;
	// 			}
	// 		}

	// 		log.lib(`Using device '${parse.name}' ('${parse.path}')`);

	// 		if (config.media.bluetooth.text.mid === true) {
	// 			update.status('mid.text.left', parse.name);
	// 			MID.refresh_text();
	// 		}

	// 		await init_listeners();
	// 		await interface_properties_device(parse.path);


	// 		// Update TEL LED if ignition isn't off
	// 		if (status.vehicle.ignition_level === 0) return;

	// 		TEL.led({
	// 			solid_green : status.bluetooth.device.connected,
	// 			solid_red   : !status.bluetooth.device.connected,
	// 		});
	// 	});
	// });
} // async init()


module.exports = {
	listenersActive : false,

	bluez : null,

	adapter : null,

	devices      : {},
	mediaPlayers : {},

	// Functions
	command,

	init,
	init_listeners,

	interface_properties_adapter,
	interface_properties_device,
	interface_properties_player,
};
