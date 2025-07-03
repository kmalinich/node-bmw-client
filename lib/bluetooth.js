/* eslint require-atomic-updates : 0 */

// TODO: Make this a class
// TODO: Switch to dbus-next https://acrisci.github.io/doc/node-dbus-next/

const os = require('os');

const invalidDeviceDelay = 500;


// Send commands over systemd dbus to BlueZ to control device
async function command(action, connectOverride = false) {
	// Bounce if bluetooth disabled, no device found, or wrong platform
	if (os.platform()                 !== 'linux') return;
	if (config.media.bluetooth.enable !== true)    return;

	log.lib(`Attempting to send '${action}' command to device '${status.bluetooth.interfaces.device}'`);

	if (status.bluetooth.interfaces.device === null) {
		await new Promise(resolve => setTimeout(resolve, 1000));
		await init();

		await new Promise(resolve => setTimeout(resolve, 5000));

		if (status.power.active !== true) return;

		await command(action);
		return;
	}

	// Handle an already connected or disconnected device
	if (connectOverride !== true) {
		switch (action) {
			case 'connect'    : if (status.bluetooth.device.connected === true) return; break;
			case 'disconnect' : if (status.bluetooth.device.connected !== true) return; break;
		}
	}

	// Handle device not being connected yet
	if (action !== 'connect' && action !== 'disconnect') {
		if (status.bluetooth.device.connected !== true) {
			IKE.text_override('BT reconnect');
			await command('disconnect');
			await new Promise(resolve => setTimeout(resolve, 1000));

			await command('connect');
			await new Promise(resolve => setTimeout(resolve, 1000));
		}
	}

	// dbus invoke object
	const dbusBase = {
		destination : bluetooth.paths.bluez.main,
		type        : bluetooth.dbus.messageType.methodCall,
	};

	// Capitalize first letter of action
	const member = action.charAt(0).toUpperCase() + action.slice(1);

	switch (member) {
		case 'Connect'    : update.status('bluetooth.device.connecting');        update.status('bluetooth.device.disconnecting', false); break;
		case 'Disconnect' : update.status('bluetooth.device.connecting', false); update.status('bluetooth.device.disconnecting');
	}

	log.lib(`Sending '${member}' command to device '${status.bluetooth.device.name}' ('${status.bluetooth.interfaces.device}')`);

	switch (member) {
		case 'Connect'    : // Connect/disconnect commands with dbusMain object
		case 'Disconnect' : {
			// TEL LED commands for connect/disconnect
			TEL.setLEDs();

			const dbusMain = {
				'interface' : status.bluetooth.device.service,
				path        : status.bluetooth.interfaces.device,
				...dbusBase,
			};

			await bluetooth.systemDbus.invoke({ ...dbusMain, member });

			// Wait here a bit for it to disconnect so the connected property is accurately updated when stopping the application
			// TODO: Really it should /actually/ wait until it's updated, not just wait some amount of time after which it /should/ be updated
			await new Promise(resolve => setTimeout(resolve, 2000));
			break;
		}

		case 'Next'     : // Media-related commands with dbus_media object
		case 'Pause'    :
		case 'Play'     :
		case 'Previous' : {
			// Bounce if attempting a media-related command without an AVRCP interface present
			if (status.bluetooth.interfaces.player === null) {
				IKE.text_override('BT reinit');
				await new Promise(resolve => setTimeout(resolve, 1000));
				await init();
				return;
			}

			const dbus_media = {
				'interface' : bluetooth.paths.bluez.media,
				path        : status.bluetooth.interfaces.player,
				...dbusBase,
			};

			await bluetooth.systemDbus.invoke({ ...dbus_media, member });
			break;
		}

		case 'Toggle' : { // Toggle playback based on current playback status
			switch (status.bluetooth.player.status) {
				case 'playing' : await command('pause'); break;
				case 'paused'  : await command('play');  break;
				default        : await command('pause');
			}
		}
	}
} // async command(action, connectOverride)


async function handleInterfaceAddedRoot(btInterface) {
	let interfaceType;

	switch (btInterface) {
		case status.bluetooth.interfaces.adapter : interfaceType = 'adapter'; break;
		case status.bluetooth.interfaces.device  : interfaceType = 'device';  break;
		case status.bluetooth.interfaces.player  : interfaceType = 'player';  break;

		default : log.lib(`Interface '${btInterface}' added`); return true;
	}


	log.lib(`${interfaceType} interface '${btInterface}' added`);
	await getInterface(interfaceType);
} // async handleInterfaceAddedRoot(btInterface)

async function handleInterfaceRemovedRoot(btInterface) {
	let interfaceType;

	switch (btInterface) {
		case status.bluetooth.interfaces.adapter : interfaceType = 'adapter'; break;
		case status.bluetooth.interfaces.device  : interfaceType = 'device';  break;
		case status.bluetooth.interfaces.player  : interfaceType = 'player';  break;

		default : log.lib(`Interface '${btInterface}' removed`); return true;
	}


	log.lib(`${interfaceType} interface '${btInterface}' removed`);

	if (bluetooth.propertiesChangedListenersSet[interfaceType] === true) {
		try {
			log.lib(`Calling removeListener for PropertiesChanged event for ${interfaceType} interface`);
			bluetooth.dbusInterfaces[interfaceType].removeListener('PropertiesChanged', bluetooth.interfacePropertiesChangedHandlers[interfaceType]);

			bluetooth.propertiesChangedListenersSet[interfaceType] = false;
		}
		catch (removePropertiesChangedListenerError) {
			log.error(`Failed to remove ${interfaceType} PropertiesChanged listener`);
			console.error({ removePropertiesChangedListenerError });
		}
	}
} // async handleInterfaceRemovedRoot(btInterface)


async function handleInterface(interfaceType, error, data) {
	if (error !== null) {
		if (error.message === 'No such interface found') {
			log.lib(`${interfaceType} interface '${status.bluetooth.interfaces[interfaceType]}' not currently available`);
			return;
		}

		log.error(`${interfaceType} interface experienced error: '${error.message}'`);
		log.error(error);
		return false;
	}

	bluetooth.dbusInterfaces[interfaceType] = data;


	if (interfaceType === 'root') {
		log.lib(`Setting InterfacesAdded event listener for ${interfaceType} interface '${status.bluetooth.interfaces[interfaceType]}'`);
		bluetooth.dbusInterfaces[interfaceType].on('InterfacesAdded', handleInterfaceAddedRoot);

		log.lib(`Setting InterfacesRemoved event listener for ${interfaceType} interface '${status.bluetooth.interfaces[interfaceType]}'`);
		bluetooth.dbusInterfaces[interfaceType].on('InterfacesRemoved', handleInterfaceRemovedRoot);

		return true;
	}


	if (bluetooth.propertiesChangedListenersSet[interfaceType] === true) {
		try {
			log.lib(`Removing PropertiesChanged event listener for ${interfaceType} interface '${status.bluetooth.interfaces[interfaceType]}'`);
			bluetooth.dbusInterfaces[interfaceType].removeListener('PropertiesChanged', bluetooth.interfacePropertiesChangedHandlers[interfaceType]);

			bluetooth.propertiesChangedListenersSet[interfaceType] = false;
		}
		catch (removePropertiesChangedListenerError) {
			log.error(`Failed to remove ${interfaceType} PropertiesChanged listener`);
			console.error({ removePropertiesChangedListenerError });
		}
	}

	try {
		log.lib(`Setting PropertiesChanged event listener for ${interfaceType} interface '${status.bluetooth.interfaces[interfaceType]}'`);
		bluetooth.dbusInterfaces[interfaceType].on('PropertiesChanged', bluetooth.interfacePropertiesChangedHandlers[interfaceType]);

		bluetooth.propertiesChangedListenersSet[interfaceType] = true;
	}
	catch (setPropertiesChangedListenerError) {
		log.error(`Failed to set ${interfaceType} PropertiesChanged listener`);
		console.error({ setPropertiesChangedListenerError });
	}
} // async handleInterface(interfaceType, error, data)

async function getInterface(interfaceType) {
	if (status.bluetooth.interfaces[interfaceType] === null) {
		log.error(`${interfaceType} interface is null, cannot continue`);
		return;
	}

	log.lib(`Getting ${interfaceType} interface '${status.bluetooth.interfaces[interfaceType]}'`);

	let dbusPath = bluetooth.paths.dbus.prop;
	if (interfaceType === 'root') {
		dbusPath = bluetooth.paths.dbus.objMan;
	}

	bluetooth.service.getInterface(status.bluetooth.interfaces[interfaceType], dbusPath, async (error, data) => {
		await handleInterface(interfaceType, error, data);
	});
} // async getInterface(interfaceType)


async function handleInterfacePropertiesChanged(interfaceType, service, propertyData) {
	if (!propertyData[0])    return;
	if (!propertyData[0][0]) return;

	const propertyKey = propertyData[0][0].toLowerCase();

	let serviceFmt = service.replace('org.bluez.', '');

	// Reformat some service names for clarity
	switch (serviceFmt) {
		case 'percentage' : serviceFmt = 'batterypercentage'; break;
	}

	if (propertyKey !== 'position') {
		log.lib(`${interfaceType} '${status.bluetooth.interfaces[interfaceType]}' service '${serviceFmt}' property '${propertyKey}' changed`);
	}

	if (!propertyData[0][1])    return;
	if (!propertyData[0][1][1]) return;

	const value = propertyData[0][1][1][0];

	switch (typeof value) {
		case 'boolean' :
		case 'number'  :
		case 'string'  : break;
		default        : return;
	}

	if (typeof status.bluetooth.services                            === 'undefined') status.bluetooth.services                            = {};
	if (typeof status.bluetooth.services[interfaceType]             === 'undefined') status.bluetooth.services[interfaceType]             = {};
	if (typeof status.bluetooth.services[interfaceType][serviceFmt] === 'undefined') status.bluetooth.services[interfaceType][serviceFmt] = {};

	update.status(`bluetooth.services.${interfaceType}.${serviceFmt}.${propertyKey}`, value);

	if (interfaceType !== 'player') {
		update.status(`bluetooth.device.${propertyKey}`, value, false);
		return true;
	}

	// Return now if the value hasn't changed
	if (!update.status(`bluetooth.${interfaceType}.${propertyKey}`, value, false)) return;

	// Update misc information
	if (typeof propertyData[0][1][1][0] === 'object') {
		if (Array.isArray(propertyData[0][1][1][0])) {
			for (const key of propertyData[0][1][1][0]) {
				if (typeof key[1]       === 'undefined') continue;
				if (typeof key[1][1]    === 'undefined') continue;
				if (typeof key[1][1][0] === 'undefined') continue;

				update.status(`bluetooth.${interfaceType}.${key[0].toLowerCase()}`, key[1][1][0]);
			}
		}
	}
} // async handleInterfacePropertiesChanged(interfaceType, service, propertyData)

async function handleInterfacePropertiesChangedAdapter(service, propertyData) {	await handleInterfacePropertiesChanged('adapter', service, propertyData); }
async function handleInterfacePropertiesChangedDevice(service, propertyData)  { await handleInterfacePropertiesChanged('device',  service, propertyData); }
async function handleInterfacePropertiesChangedPlayer(service, propertyData)  { await handleInterfacePropertiesChanged('player',  service, propertyData); }


function managedObjectsCheck(objects) {
	if (typeof objects                                              === 'undefined') return false;
	if (typeof objects[bluetooth.deviceNumber]                      === 'undefined') return false;
	if (typeof objects[bluetooth.deviceNumber][1]                   === 'undefined') return false;
	if (typeof objects[bluetooth.deviceNumber][1][1]                === 'undefined') return false;

	if (typeof objects[bluetooth.deviceNumber][1][1][1]             === 'undefined') return false;
	if (typeof objects[bluetooth.deviceNumber][1][1][1][1]          === 'undefined') return false;
	if (typeof objects[bluetooth.deviceNumber][1][1][1][1][1]       === 'undefined') return false;
	if (typeof objects[bluetooth.deviceNumber][1][1][1][1][1][1]    === 'undefined') return false;
	if (typeof objects[bluetooth.deviceNumber][1][1][1][1][1][1][0] === 'undefined') return false;

	return true;
} // managedObjectsCheck(objects)

async function handleBlueZMainObjects(error, objects) {
	if (error !== null) {
		log.error(error);
		return false;
	}

	objects.as(bluetooth.paths.dbus.objMan).GetManagedObjects(async (error, objects) => {
		await handleBlueZManagedObjects(error, objects);
	});
} // async handleBlueZMainObjects(error, objects)

async function handleBlueZManagedObjects(error, objects) {
	if (error) {
		log.error(`Device number ${bluetooth.deviceNumber} experienced error`);
		console.error({ handleBlueZManagedObjectsError : error });
		return;
	}

	if (bluetooth.deviceNumber > 6) {
		log.error(`Device number ${bluetooth.deviceNumber} is invalid, resetting device number to ${bluetooth.deviceNumberDefault}`);
		bluetooth.deviceNumber = bluetooth.deviceNumberDefault;
		return;
	}

	if (managedObjectsCheck(objects) !== true) {
		log.lib(`Device number ${bluetooth.deviceNumber} is invalid, incrementing device counter`);
		await new Promise(resolve => setTimeout(resolve, invalidDeviceDelay));
		bluetooth.deviceNumber++;
		await init();
		return;
	}

	const parse = {
		name    : objects[bluetooth.deviceNumber][1][1][1][2][1][1][0],
		addr    : objects[bluetooth.deviceNumber][1][1][1][0][1][1][0],
		path    : objects[bluetooth.deviceNumber][0],
		service : objects[bluetooth.deviceNumber][1][1][0],
	};

	if (parse.addr !== config.media.bluetooth.device_mac) {
		log.lib(`Device number ${bluetooth.deviceNumber} => '${parse.name}' '${parse.addr}' ('${parse.path}') does not match config, incrementing device counter`);
		bluetooth.deviceNumber++;
		await init();
		return;
	}

	switch (parse.name) {
		case 'public'      :
		case '/NowPlaying' : {
			log.lib(`Device number ${bluetooth.deviceNumber} => '${parse.name}' '${parse.addr}' ('${parse.path}') is invalid, incrementing device counter`);
			await new Promise(resolve => setTimeout(resolve, invalidDeviceDelay));
			bluetooth.deviceNumber++;
			await init();
			return;
		}
	}

	// Set variables in status object appropriately
	update.status('bluetooth.device.name',    parse.name);
	update.status('bluetooth.device.service', parse.service);

	log.lib(`Using device number ${bluetooth.deviceNumber} '${parse.name}' '${parse.addr}' ('${parse.path}')`);

	if (config.media.bluetooth.text.mid === true) {
		update.status('mid.text.left', parse.name);
		MID.refresh_text();
	}

	await init_listeners();
} // async handleBlueZManagedObjects(error, objects)


async function init() {
	// Bounce if bluetooth disabled or wrong platform
	if (config.media.bluetooth.enable === false || os.platform() !== 'linux') return false;

	// systemd dbus libraries
	if (bluetooth.dbus === null) {
		bluetooth.dbus = require('dbus-native');
	}

	// systemd dbus handle
	if (bluetooth.systemDbus === null) {
		bluetooth.systemDbus = bluetooth.dbus.systemBus();
	}

	status.bluetooth = require('status-bluetooth-default').apply();

	if (bluetooth.service === null) {
		bluetooth.service = bluetooth.systemDbus.getService(bluetooth.paths.bluez.main);
	}

	log.lib('Initializing');

	// Update interface paths
	const btInterfaceRoot = '/';
	update.status('bluetooth.interfaces.root', btInterfaceRoot);

	const btInterfaceAdapter = '/org/bluez/hci0';
	update.status('bluetooth.interfaces.adapter', btInterfaceAdapter);

	// /org/bluez/hci0/dev_AA_BB_CC_DD_EE_FF
	const btInterfaceDevice = `${btInterfaceAdapter}/dev_${config.media.bluetooth.device_mac.replace(/:/g, '_')}`;
	update.status('bluetooth.interfaces.device', btInterfaceDevice);

	// /org/bluez/hci0/dev_AA_BB_CC_DD_EE_FF/avrcp/player0
	const btInterfacePlayer = `${btInterfaceDevice}/avrcp/player0`;
	update.status('bluetooth.interfaces.player', btInterfacePlayer);


	bluetooth.systemDbus.getObject(bluetooth.paths.bluez.main, '/', async (error, objects) => {
		await handleBlueZMainObjects(error, objects);
	});
} // async init()


// Read dbus and get 1st paired device's name, status, path, etc
async function init_listeners() {
	// Bounce if bluetooth is disabled, bluetooth event listeners have already been set up, or wrong platform
	if (config.media.bluetooth.enable === false || os.platform() !== 'linux') return false;

	if (bluetooth.listenersActive === true) {
		log.lib('Listeners already active');
		return;
	}

	update.on('status.bluetooth.device.connected', () => {
		update.status('bluetooth.device.connecting', false);
		update.status('bluetooth.device.disconnecting', false);
	});

	// Connect/disconnect bluetooth device on power module event
	power.on('active', async (power_state) => {
		log.lib(`Received power.onActive state ${power_state}`);
		await new Promise(resolve => setTimeout(resolve, 1000));

		switch (power_state) {
			case false : {
				if (status.bluetooth.player.status === 'playing') {
					await command('pause');
				}

				await new Promise(resolve => setTimeout(resolve, 1000));
				await command('disconnect');
				await new Promise(resolve => setTimeout(resolve, 1000));

				log.lib(`Device number is currently ${bluetooth.deviceNumber}, resetting device number to ${bluetooth.deviceNumberDefault}`);
				bluetooth.deviceNumber = bluetooth.deviceNumberDefault;
				break;
			}

			case true : {
				await command('connect');
			}
		}
	});


	// Man, all these setTimeouts sure are hokey
	await getInterface('root');

	await new Promise(resolve => setTimeout(resolve, 1000));
	await getInterface('adapter');

	await new Promise(resolve => setTimeout(resolve, 1000));
	await getInterface('device');

	// eslint require-atomic-updates
	bluetooth.listenersActive = true;

	log.lib('Initialized listeners');
} // async init_listeners()


module.exports = {
	dbus       : null,
	service    : null,
	systemDbus : null,

	deviceNumber        : 4,
	deviceNumberDefault : 2,

	listenersActive : false,

	propertiesChangedListenersSet : {
		adapter : false,
		device  : false,
		player  : false,
	},

	interfacePropertiesChangedHandlers : {
		adapter : handleInterfacePropertiesChangedAdapter,
		device  : handleInterfacePropertiesChangedDevice,
		player  : handleInterfacePropertiesChangedPlayer,
	},

	dbusInterfaces : {
		adapter : null,
		device  : null,
		player  : null,
		root    : null,
	},

	// BlueZ 5 dbus paths
	paths : {
		bluez : {
			main  : 'org.bluez',
			media : 'org.bluez.MediaPlayer1',
		},

		dbus : {
			objMan : 'org.freedesktop.DBus.ObjectManager',
			prop   : 'org.freedesktop.DBus.Properties',
		},
	},


	// Functions
	command,

	init,
	init_listeners,
};
