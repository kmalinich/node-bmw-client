// TODO: Make this a class

const os = require('os');

const invalidDeviceDelay = 500;


// Send commands over systemd dbus to BlueZ to control device
async function command(action, connectOverride = false) {
	// Bounce if bluetooth disabled or wrong platform
	if (config.media.bluetooth.enable !== true || os.platform() !== 'linux') return false;

	log.lib(`Attempting to send '${action}' command to device '${status.bluetooth.interfaces.device}'`);

	// Handle an already connected or disconnected device
	if (connectOverride !== true) {
		switch (action) {
			case 'connect'    : if (status.bluetooth.device.connected === true) return; break;
			case 'disconnect' : if (status.bluetooth.device.connected !== true) return;
		}
	}


	switch (action) {
		case 'connect'    : update.status('bluetooth.device.connecting', true);  update.status('bluetooth.device.disconnecting', false); break;
		case 'disconnect' : update.status('bluetooth.device.connecting', false); update.status('bluetooth.device.disconnecting', true);  break;

		// Handle device not being connected yet
		default : {
			if (status.bluetooth.device.connected === true) break;

			IKE.text_override('BT reconnect');
			await command('disconnect');
			await new Promise(resolve => setTimeout(resolve, 1000));

			await command('connect');
			await new Promise(resolve => setTimeout(resolve, 1000));
		}
	}

	if (status.bluetooth.device.name === null) {
		log.error(`Device name is null; cannot send '${action}' command to device interface '${status.bluetooth.interfaces.device}'`);
		return;
	}

	TEL.setLEDs();

	switch (action) {
		case 'pause' : if (status.bluetooth.player.status === 'paused')  return log.lib(`Not sending ${action} command, status is already ${status.bluetooth.player.status}`); break;
		case 'play'  : if (status.bluetooth.player.status === 'playing') return log.lib(`Not sending ${action} command, status is already ${status.bluetooth.player.status}`);
	}


	let member = action.charAt(0).toUpperCase() + action.slice(1);
	if (action === 'fastforward') member = 'FastForward';


	let interfaceType;
	switch (action) {
		case 'connect'    :
		case 'disconnect' : interfaceType = 'device'; break;

		case 'fastforward' :
		case 'next'        :
		case 'pause'       :
		case 'play'        :
		case 'previous'    :
		case 'rewind'      :
		case 'toggle'      : interfaceType = 'player';
	}


	if (action !== 'disconnect' && status.power.active !== true) return;


	if (bluetooth.dbusInterfaces[interfaceType] === null) {
		log.error(`bluetooth.dbusInterfaces.${interfaceType} === null`);

		if (status.power.active !== true) return;

		IKE.text_override(`BT waiting (${interfaceType})`);

		await new Promise(resolve => setTimeout(resolve, 1000));
		await init();

		await new Promise(resolve => setTimeout(resolve, 2000));
		await command(action);

		return;
	}


	// Toggle playback based on current playback status
	if (action === 'toggle') {
		switch (status.bluetooth.player.status) {
			case 'playing' : await command('pause'); break;
			default        : await command('play');
		}

		return;
	}

	log.lib(`Sending '${action}' command to ${interfaceType} '${status.bluetooth.device.name}' ('${status.bluetooth.interfaces.device}')`);

	try {
		bluetooth.dbusInterfaces[interfaceType][member]();
	}
	catch (commandError) {
		log.error(commandError);
		console.error(commandError);
	}
} // async command(action, connectOverride)


async function handleInterface(interfaceType, propertiesInterface) {
	log.lib(`Handling ${interfaceType} interface`);

	bluetooth.dbusPropertiesInterfaces[interfaceType] = propertiesInterface;

	const listenerCount = propertiesInterface.listenerCount('PropertiesChanged');
	log.lib(`${listenerCount} PropertiesChanged event listeners for ${interfaceType} interface`);

	if (listenerCount > 0) {
		log.lib(`Removing PropertiesChanged event listenerd for ${interfaceType} interface '${status.bluetooth.interfaces[interfaceType]}'`);

		try {
			propertiesInterface.removeAllListeners('PropertiesChanged');
		}
		catch (removePropertiesChangedListenerError) {
			log.error(`Failed to remove ${interfaceType} PropertiesChanged listener`);
			console.error({ removePropertiesChangedListenerError });
		}
	}

	try {
		log.lib(`Setting PropertiesChanged event listener for ${interfaceType} interface '${status.bluetooth.interfaces[interfaceType]}'`);
		await propertiesInterface.$subscribe('PropertiesChanged', bluetooth.interfacePropertiesChangedHandlers[interfaceType]);
	}
	catch (setPropertiesChangedListenerError) {
		log.error(`Failed to set ${interfaceType} PropertiesChanged listener`);
		console.error({ setPropertiesChangedListenerError });
	}
} // async handleInterface(interfaceType, propertiesInterface)

async function getInterface(interfaceType) {
	if (status.bluetooth.interfaces[interfaceType] === null) {
		log.error(`${interfaceType} interface is null, cannot continue`);
		return;
	}

	log.lib(`Getting ${interfaceType} interface '${status.bluetooth.interfaces[interfaceType]}'`);

	let interfaceName;
	switch (interfaceType) {
		case 'device' : interfaceName = 'org.bluez.Device1';      break;
		case 'player' : interfaceName = 'org.bluez.MediaPlayer1'; break;
	}

	try {
		bluetooth.dbusInterfaces[interfaceType] = await bluetooth.bluezService.getInterface(status.bluetooth.interfaces[interfaceType], interfaceName);
		// console.dir({ interfaceObj : bluetooth.dbusInterfaces[interfaceType] });

		if (interfaceType === 'device') {
			bluetooth.dbusInterfaces.control = bluetooth.dbusInterfaces[interfaceType].$parent.proxy['org.bluez.MediaControl1'];
		}

		const propertiesInterface = bluetooth.dbusInterfaces[interfaceType].$parent.proxy['org.freedesktop.DBus.Properties'];
		await handleInterface(interfaceType, propertiesInterface);
	}
	catch (getInterfaceError) {
		log.error(getInterfaceError);
		console.error(getInterfaceError);
	}
} // async getInterface(interfaceType)


async function handleInterfacePropertiesChanged(interfaceType, service, propertyData) {
	// console.dir({ interfaceType, service, propertyData }, { depth : Infinity });
	if (!propertyData) return;

	for await (const key of Object.keys(propertyData)) {
		// console.log('%s : %o', key, propertyData[key]);

		if (key === 'Track') {
			for await (const trackKey of Object.keys(propertyData[key])) {
				// console.log('trackKey %s : %o', trackKey, propertyData[key][trackKey]);
				update.status(`bluetooth.player.${trackKey.toLowerCase()}`, propertyData[key][trackKey], false);
			}

			continue;
		}


		const propertyKey = key.toLowerCase();

		// if (propertyKey !== 'position') log.lib(`${interfaceType} interface service property '${propertyKey}' changed`);

		const value = propertyData[key];

		switch (typeof value) {
			case 'boolean' :
			case 'number'  :
			case 'string'  : break;
			default        : continue;
		}

		if (typeof status.bluetooth[interfaceType] === 'undefined') status.bluetooth[interfaceType] = {};
		update.status(`bluetooth.${interfaceType}.${propertyKey}`, value, false);
	}
} // async handleInterfacePropertiesChanged(interfaceType, service, propertyData)

async function handleInterfacePropertiesChangedDevice(service, propertyData) { await handleInterfacePropertiesChanged('device',  service, propertyData); }
async function handleInterfacePropertiesChangedPlayer(service, propertyData) { await handleInterfacePropertiesChanged('player',  service, propertyData); }


function managedObjectsCheck(blueZManagedObjects) {
	const btDeviceIntf = status.bluetooth.interfaces.device;
	if (typeof blueZManagedObjects                                            === 'undefined') return 1;
	if (typeof blueZManagedObjects[btDeviceIntf]                              === 'undefined') return 2;
	if (typeof blueZManagedObjects[btDeviceIntf]['org.bluez.Device1']         === 'undefined') return 3;
	if (typeof blueZManagedObjects[btDeviceIntf]['org.bluez.Device1'].Name    === 'undefined') return 4;
	if (typeof blueZManagedObjects[btDeviceIntf]['org.bluez.Device1'].Address === 'undefined') return 5;

	return true;
} // managedObjectsCheck(blueZManagedObjects)


async function init() {
	// Bounce if bluetooth disabled or wrong platform
	if (config.media.bluetooth.enable !== true || os.platform() !== 'linux') return false;

	log.lib('Initializing');

	// system dbus libraries, handle, and BlueZ service
	if (bluetooth.dbus         === null) bluetooth.dbus         = require('dbus-native');
	if (bluetooth.systemDbus   === null) bluetooth.systemDbus   = bluetooth.dbus.systemBus();
	if (bluetooth.bluezService === null) bluetooth.bluezService = bluetooth.systemDbus.getService('org.bluez');


	// status.bluetooth = require('status-bluetooth-default').apply();
	status.bluetooth.device.connected     = null;
	status.bluetooth.device.connecting    = false;
	status.bluetooth.device.disconnecting = false;
	status.bluetooth.device.player        = null;


	let blueZMainObjects;
	try {
		blueZMainObjects = await bluetooth.systemDbus.getObject('org.bluez', '/');
	}
	catch (getMainObjectsError) {
		log.error(getMainObjectsError);
		console.error(getMainObjectsError);
		return;
	}

	let blueZManagedObjects;
	try {
		blueZManagedObjects = await blueZMainObjects.as('org.freedesktop.DBus.ObjectManager').GetManagedObjects();
	}
	catch (getManagedObjectsError) {
		log.error(getManagedObjectsError);
		console.error(getManagedObjectsError);
		return;
	}


	const managedObjectsStatus = managedObjectsCheck(blueZManagedObjects);

	if (managedObjectsStatus !== true) {
		log.lib(`managedObjectsStatus = ${managedObjectsStatus} (managedObjectsStatus !== true)`);
		await new Promise(resolve => setTimeout(resolve, invalidDeviceDelay));
		await init();
		return;
	}

	const btDeviceIntf = status.bluetooth.interfaces.device;
	const btDevice = blueZManagedObjects[btDeviceIntf]['org.bluez.Device1'];

	await handleInterfacePropertiesChanged('device', 'org.bluez.Device1', btDevice);


	const parse = {
		name : btDevice.Name,
		addr : btDevice.Address,
	};

	if (parse.addr !== config.media.bluetooth.device_mac) {
		log.lib(`Device '${parse.name}' '${parse.addr}' does not match config`);
		await new Promise(resolve => setTimeout(resolve, invalidDeviceDelay));
		await init();
		return;
	}

	switch (parse.name) {
		case 'public'      :
		case '/NowPlaying' : {
			log.lib(`Device '${parse.name}' '${parse.addr}' is invalid, (parse.name == (public|/nowPlaying))`);
			await new Promise(resolve => setTimeout(resolve, invalidDeviceDelay));
			await init();
			return;
		}
	}

	log.lib(`Device is valid, proceeding`);

	// Set variables in status object
	update.status('bluetooth.device.name', parse.name);

	log.lib(`Using device '${parse.name}' '${parse.addr}'`);

	if (config.media.bluetooth.text.mid === true) {
		update.status('mid.text.left', parse.name);
	}

	await initListeners();

	// await new Promise(resolve => setTimeout(resolve, 1000));
	await getInterface('device');
} // async init()


async function initListeners() {
	// Bounce if bluetooth is disabled, or wrong platform
	if (config.media.bluetooth.enable !== true || os.platform() !== 'linux') return false;

	// Bounce if bluetooth event listeners have already been set up
	if (bluetooth.listenersActive === true) {
		log.lib('Listeners already active');
		return;
	}

	update.on('status.bluetooth.device.connected', connectedState => {
		update.status('bluetooth.device.connecting',    false);
		update.status('bluetooth.device.disconnecting', false);

		switch (connectedState.new) {
			case false : {
				update.status('status.bluetooth.device.player', null);
				break;
			}

			case true : {
				command('play');
			}
		}
	});

	update.on('status.bluetooth.device.player', async devicePlayer => {
		if (devicePlayer.new === null) return;
		await new Promise(resolve => setTimeout(resolve, 250));
		await getInterface('player');
	});

	// Connect/disconnect bluetooth device on power module event
	power.on('active', async powerState => {
		log.lib(`Received power.onActive state ${powerState}`);

		switch (powerState) {
			case false : await command('disconnect'); break;
			case true  : await command('connect');
		}
	});


	bluetooth.listenersActive = true;

	log.lib('Initialized listeners');
} // async initListeners()


module.exports = {
	dbus       : null,
	systemDbus : null,

	bluezService : null,

	listenersActive : false,

	interfacePropertiesChangedHandlers : {
		device : handleInterfacePropertiesChangedDevice,
		player : handleInterfacePropertiesChangedPlayer,
	},

	dbusInterfaces : {
		control : null,
		device  : null,
		player  : null,
	},

	dbusPropertiesInterfaces : {
		control : null,
		device  : null,
		player  : null,
	},

	// Functions
	command,

	init,
	initListeners,
};
