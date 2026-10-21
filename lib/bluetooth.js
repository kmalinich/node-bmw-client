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

	// Capitalize first letter of action
	const member = action.charAt(0).toUpperCase() + action.slice(1);

	switch (member) {
		case 'Connect'    : update.status('bluetooth.device.connecting');        update.status('bluetooth.device.disconnecting', false); break;
		case 'Disconnect' : update.status('bluetooth.device.connecting', false); update.status('bluetooth.device.disconnecting');
	}

	if (status.bluetooth.device.name === null) {
		log.err(`Device name is null; cannot send '${member}' command to device interface '${status.bluetooth.interfaces.device}'`);

		TEL.led({
			flash_red    : true,
			flash_yellow : true,
			flash_green  : true,
		});

		return;
	}


	log.lib(`Sending '${member}' command to device '${status.bluetooth.device.name}' ('${status.bluetooth.interfaces.device}')`);


	switch (member) {
		case 'Connect'    : // Connect/disconnect commands with dbusMain object
		case 'Disconnect' : {
			// TEL LED commands for connect/disconnect
			TEL.setLEDs();

			try {
				bluetooth.dbusInterfaces.device[member]();
			}
			catch (commandError) {
				log.error(commandError);
				console.error(commandError);
				await new Promise(resolve => setTimeout(resolve, 1000));
				await init();
				return;
			}

			// Wait here a bit for it to disconnect so the connected property is accurately updated when stopping the application
			// TODO: Really it should /actually/ wait until it's updated, not just wait some amount of time after which it /should/ be updated
			await new Promise(resolve => setTimeout(resolve, 2000));
			break;
		}

		case 'Next'     : // Media-related commands with dbusMedia object
		case 'Pause'    :
		case 'Play'     :
		case 'Previous' : {
			// Bounce if attempting a media-related command without an AVRCP interface present
			if (status.bluetooth.interfaces.player === null) {
				IKE.text_override('BT reinit');

				TEL.led({
					solid_red    : true,
					flash_yellow : true,
				});

				await new Promise(resolve => setTimeout(resolve, 1000));
				await init();
				return;
			}

			try {
				bluetooth.dbusInterfaces.player[member]();
			}
			catch (commandError) {
				log.error(commandError);
				console.error(commandError);
			}

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

	let interfaceName;
	switch (interfaceType) {
		case 'device' : interfaceName = 'org.bluez.Device1'; break;
		case 'player' : interfaceName = 'org.bluez.Media1';  break;
	}

	bluetooth.bluezService.getInterface(status.bluetooth.interfaces[interfaceType], interfaceName, async (error, data) => {
		await handleInterface(interfaceType, error, data);
	});
} // async getInterface(interfaceType)


async function handleInterfacePropertiesChanged(interfaceType, service, propertyData) {
	console.dir({ interfaceType, service, propertyData }, { depth : Infinity });
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

async function handleInterfacePropertiesChangedDevice(service, propertyData)  { await handleInterfacePropertiesChanged('device',  service, propertyData); }
async function handleInterfacePropertiesChangedPlayer(service, propertyData)  { await handleInterfacePropertiesChanged('player',  service, propertyData); }


function managedObjectsCheck(objects) {
	const btDeviceIntf = status.bluetooth.interfaces.device;
	if (typeof objects                                            === 'undefined') return 1;
	if (typeof objects[btDeviceIntf]                              === 'undefined') return 2;
	if (typeof objects[btDeviceIntf]['org.bluez.Device1']         === 'undefined') return 3;
	if (typeof objects[btDeviceIntf]['org.bluez.Device1'].Name    === 'undefined') return 4;
	if (typeof objects[btDeviceIntf]['org.bluez.Device1'].Address === 'undefined') return 4;

	return true;
} // managedObjectsCheck(objects)

async function handleBlueZMainObjects(error, objects) {
	if (error !== null) {
		log.error(error);
		return false;
	}

	objects.as('org.freedesktop.DBus.ObjectManager').GetManagedObjects(async (error, objects) => {
		await handleBlueZManagedObjects(error, objects);
	});
} // async handleBlueZMainObjects(error, objects)

async function handleBlueZManagedObjects(error, objects) {
	if (error) {
		log.error(`experienced error`);
		console.error({ handleBlueZManagedObjectsError : error });
		return;
	}

	const managedObjectsStatus = managedObjectsCheck(objects);

	if (managedObjectsStatus !== true) {
		log.lib(`managedObjectsStatus == ${managedObjectsStatus} (managedObjectsStatus !== true)`);
		await new Promise(resolve => setTimeout(resolve, invalidDeviceDelay));
		await init();
		return;
	}

	const btDeviceIntf = status.bluetooth.interfaces.device;
	const btDevice = objects[btDeviceIntf]['org.bluez.Device1'];

	const parse = {
		name : btDevice.Name,
		addr : btDevice.Address,
		path : btDeviceIntf,
		// service : objects[bluetooth.deviceNumber][1][1][0],
	};

	if (parse.addr !== config.media.bluetooth.device_mac) {
		log.lib(`Device '${parse.name}' '${parse.addr}' ('${parse.path}') does not match config`);
		await new Promise(resolve => setTimeout(resolve, invalidDeviceDelay));
		await init();
		return;
	}

	switch (parse.name) {
		case 'public'      :
		case '/NowPlaying' : {
			log.lib(`Device '${parse.name}' '${parse.addr}' ('${parse.path}') is invalid, (parse.name == (public|/nowPlaying))`);
			await new Promise(resolve => setTimeout(resolve, invalidDeviceDelay));
			await init();
			return;
		}
	}

	log.lib(`Device is valid, proceeding`);

	// Set variables in status object
	update.status('bluetooth.device.name', parse.name);

	// TODO: This is a bad hack, but is apparently not used for anything?
	// Man, I could really write some spaghetti back in the day
	update.status('bluetooth.device.service', 'org.bluez');

	log.lib(`Using device '${parse.name}' '${parse.addr}' ('${parse.path}')`);

	if (config.media.bluetooth.text.mid === true) {
		update.status('mid.text.left', parse.name);
		MID.refresh_text();
	}

	await init_listeners();
} // async handleBlueZManagedObjects(error, objects)


async function init() {
	// Bounce if bluetooth disabled or wrong platform
	if (config.media.bluetooth.enable === false || os.platform() !== 'linux') return false;

	log.lib('Initializing');

	// systemd dbus libraries
	if (bluetooth.dbus === null) {
		bluetooth.dbus = require('dbus-native');
	}

	// systemd dbus handle
	if (bluetooth.systemDbus === null) {
		bluetooth.systemDbus = bluetooth.dbus.systemBus();
	}

	if (bluetooth.bluezService === null) {
		bluetooth.bluezService = bluetooth.systemDbus.getService('org.bluez');
	}

	status.bluetooth = require('status-bluetooth-default').apply();

	// Set interface paths

	// /org/bluez/hci0/dev_AA_BB_CC_DD_EE_FF
	const btInterfaceDevice = `/org/bluez/hci0/dev_${config.media.bluetooth.device_mac.replace(/:/g, '_')}`;
	// /org/bluez/hci0/dev_AA_BB_CC_DD_EE_FF/avrcp/player0
	const btInterfacePlayer = `${btInterfaceDevice}/avrcp/player0`;

	update.status('bluetooth.interfaces.device', btInterfaceDevice);
	update.status('bluetooth.interfaces.player', btInterfacePlayer);


	bluetooth.systemDbus.getObject('org.bluez', '/', async (error, objects) => {
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
	power.on('active', async power_state => {
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
				break;
			}

			case true : {
				await command('connect');
			}
		}
	});


	// Man, all these setTimeouts sure are hokey
	await new Promise(resolve => setTimeout(resolve, 1000));
	await getInterface('device');

	// eslint require-atomic-updates
	bluetooth.listenersActive = true;

	log.lib('Initialized listeners');
} // async init_listeners()


module.exports = {
	dbus       : null,
	systemDbus : null,

	bluezService : null,

	listenersActive : false,

	propertiesChangedListenersSet : {
		device : false,
		player : false,
	},

	interfacePropertiesChangedHandlers : {
		device : handleInterfacePropertiesChangedDevice,
		player : handleInterfacePropertiesChangedPlayer,
	},

	dbusInterfaces : {
		device : null,
		player : null,
	},

	// Functions
	command,

	init,
	init_listeners,
};
