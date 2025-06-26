/* eslint require-atomic-updates : 0 */

// TODO: Make this a class
// TODO: Switch to dbus-next https://acrisci.github.io/doc/node-dbus-next/

import os from 'os';

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
		case 'Connect'    : update.status('bluetooth.device.connecting', true); update.status('bluetooth.device.disconnecting', false); break;
		case 'Disconnect' : update.status('bluetooth.device.connecting', false); update.status('bluetooth.device.disconnecting', true);
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
			if (status.bluetooth.interfaces.avrcp === null) {
				IKE.text_override('BT reinit');
				await new Promise(resolve => setTimeout(resolve, 1000));
				await init();
				return;
			}

			const dbus_media = {
				'interface' : bluetooth.paths.bluez.media,
				path        : status.bluetooth.interfaces.avrcp,
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


async function interfaceObjectsRoot() {
	log.lib(`Getting interface objects for root interface '${status.bluetooth.interfaces.root}'`);

	// Interfaces added/removed
	bluetooth.service.getInterface(status.bluetooth.interfaces.root, bluetooth.paths.dbus.objMan, async (error, data) => {
		if (error !== null) {
			log.error(error);
			return false;
		}

		bluetooth.dbusInterfaces.root = data;

		// Previously passed 2nd arg data1
		data.on('InterfacesAdded', async (btInterface) => {
			switch (btInterface) {
				case status.bluetooth.interfaces.adapter : {
					log.lib(`Adapter interface '${btInterface}' added`);
					break;
				}

				case status.bluetooth.interfaces.device : {
					log.lib(`Device interface '${btInterface}' added`);
					await interfacePropertiesDevice();
					break;
				}

				case status.bluetooth.interfaces.player : {
					log.lib(`Player interface '${btInterface}' added`);
					await interfacePropertiesPlayer();
					break;
				}

				case status.bluetooth.interfaces.avrcp : {
					log.lib(`AVRCP interface '${btInterface}' added`);
					await interfacePropertiesAvrcp();
					break;
				}

				default : {
					log.lib(`Interface '${btInterface}' added`);
				}
			}
		});


		// Previous passed 2nd arg data1
		data.on('InterfacesRemoved', btInterface => {
			// console.dir({ data1 });

			switch (btInterface) {
				case status.bluetooth.interfaces.adapter : {
					log.lib(`Adapter interface '${btInterface}' removed`);

					if (bluetooth.propertiesChangedListenersSet.adapter === true) {
						try {
							log.lib('Calling removeListener for PropertiesChanged event for adapter interface');
							bluetooth.dbusInterfaces.adapter.removeListener('PropertiesChanged', interfacePropertiesAdapterChanged);

							bluetooth.propertiesChangedListenersSet.adapter = false;
						}
						catch (removeAdapterPropertiesChangedListenerError) {
							log.error('Failed to remove adapter PropertiesChanged listener');
							console.error({ removeAdapterPropertiesChangedListenerError });
						}
					}

					break;
				}

				case status.bluetooth.interfaces.device : {
					log.lib(`Device interface '${btInterface}' removed`);

					if (bluetooth.propertiesChangedListenersSet.device === true) {
						try {
							log.lib('Calling removeListener for PropertiesChanged event for device interface');
							bluetooth.dbusInterfaces.device.removeListener('PropertiesChanged', interfacePropertiesDeviceChanged);

							bluetooth.propertiesChangedListenersSet.device = false;
						}
						catch (removeDevicePropertiesChangedListenerError) {
							log.error('Failed to remove device PropertiesChanged listener');
							console.error({ removeDevicePropertiesChangedListenerError });
						}
					}

					break;
				}

				case status.bluetooth.interfaces.avrcp : {
					log.lib(`AVRCP interface '${btInterface}' removed`);

					if (bluetooth.propertiesChangedListenersSet.avrcp === true) {
						try {
							log.lib('Calling removeListener for PropertiesChanged event for AVRCP interface');
							bluetooth.dbusInterfaces.avrcp.removeListener('PropertiesChanged', interfacePropertiesAvrcpChanged);

							bluetooth.propertiesChangedListenersSet.player = false;
						}
						catch (removeAvrcpPropertiesChangedListenerError) {
							log.error('Failed to remove AVRCP PropertiesChanged listener');
							console.error({ removeAvrcpPropertiesChangedListenerError });
						}
					}

					break;
				}

				case status.bluetooth.interfaces.player : {
					log.lib(`Player interface '${btInterface}' removed`);

					if (bluetooth.propertiesChangedListenersSet.player === true) {
						try {
							log.lib('Calling removeListener for PropertiesChanged event for player interface');
							bluetooth.dbusInterfaces.player.removeListener('PropertiesChanged', interfacePropertiesPlayerChanged);

							bluetooth.propertiesChangedListenersSet.player = false;
						}
						catch (removePlayerPropertiesChangedListenerError) {
							log.error('Failed to remove player PropertiesChanged listener');
							console.error({ removePlayerPropertiesChangedListenerError });
						}
					}

					break;
				}

				default : {
					log.lib(`Interface '${btInterface}' removed`);
				}
			}
		});
	});
} // async interfaceObjectsRoot()


async function interfacePropertiesAdapter() {
	if (status.bluetooth.interfaces.adapter === null) {
		log.error('Adapter interface is null, cannot get properties');
		return;
	}

	log.lib(`Getting interface properties for adapter interface '${status.bluetooth.interfaces.adapter}'`);

	bluetooth.service.getInterface(status.bluetooth.interfaces.adapter, bluetooth.paths.dbus.prop, async (error, data) => {
		if (error !== null) {
			log.error('Adapter interface experienced error');
			console.error(error);
			return false;
		}

		bluetooth.dbusInterfaces.adapter = data;

		if (bluetooth.propertiesChangedListenersSet.adapter === true) {
			try {
				log.lib(`Removing PropertiesChanged event listener for adapter interface '${status.bluetooth.interfaces.adapter}'`);
				bluetooth.dbusInterfaces.adapter.removeListener('PropertiesChanged', interfacePropertiesAdapterChanged);

				bluetooth.propertiesChangedListenersSet.adapter = false;
			}
			catch (removeAdapterPropertiesChangedListenerError) {
				log.error('Failed to remove adapter PropertiesChanged listener');
				console.error({ removeAdapterPropertiesChangedListenerError });
				return false;
			}
		}

		try {
			log.lib(`Setting PropertiesChanged event listener for adapter interface '${status.bluetooth.interfaces.adapter}'`);
			bluetooth.dbusInterfaces.adapter.on('PropertiesChanged', interfacePropertiesAdapterChanged);

			bluetooth.propertiesChangedListenersSet.adapter = true;
		}
		catch (setAdapterPropertiesChangedListenerError) {
			log.error('Failed to set adapter PropertiesChanged listener');
			console.error({ setAdapterPropertiesChangedListenerError });
		}
	});
} // async interfacePropertiesAdapter()

async function interfacePropertiesDevice() {
	if (status.bluetooth.interfaces.device === null) {
		log.error('Device interface is null, cannot get properties');
		return;
	}

	log.lib(`Getting interface properties for device interface '${status.bluetooth.interfaces.device}'`);

	bluetooth.service.getInterface(status.bluetooth.interfaces.device, bluetooth.paths.dbus.prop, async (error, data) => {
		if (error !== null) {
			log.error('Device interface experienced error');
			console.error(error);
			return false;
		}

		bluetooth.dbusInterfaces.device = data;

		if (bluetooth.propertiesChangedListenersSet.device === true) {
			try {
				log.lib(`Removing PropertiesChanged event listener for device interface '${status.bluetooth.interfaces.device}'`);
				bluetooth.dbusInterfaces.device.removeListener('PropertiesChanged', interfacePropertiesDeviceChanged);

				bluetooth.propertiesChangedListenersSet.device = false;
			}
			catch (removeDevicePropertiesChangedListenerError) {
				log.error('Failed to remove device PropertiesChanged listener');
				console.error({ removeDevicePropertiesChangedListenerError });
				return false;
			}
		}

		try {
			log.lib(`Setting PropertiesChanged event listener for device interface '${status.bluetooth.interfaces.device}'`);
			bluetooth.dbusInterfaces.device.on('PropertiesChanged', interfacePropertiesDeviceChanged);

			bluetooth.propertiesChangedListenersSet.device = true;
		}
		catch (setDevicePropertiesChangedListenerError) {
			log.error('Failed to set device PropertiesChanged listener');
			console.error({ setDevicePropertiesChangedListenerError });
		}
	});
} // async interfacePropertiesDevice()

async function interfacePropertiesAvrcp() {
	if (status.bluetooth.interfaces.avrcp === null) {
		log.error('AVRCP interface is null, cannot get properties');
		return;
	}

	log.lib(`Getting interface properties for AVRCP interface '${status.bluetooth.interfaces.avrcp}'`);

	bluetooth.service.getInterface(status.bluetooth.interfaces.avrcp, bluetooth.paths.dbus.prop, async (error, data) => {
		if (error !== null) {
			// Ignore the error if it's just the interface not being present yet
			if (error.message === 'No such interface found') {
				log.lib(`AVRCP interface '${status.bluetooth.interfaces.avrcp}' not currently available`);
				return;
			}

			log.error(`AVRCP interface experienced error: '${error.message}'`);
			log.error(error);
			return false;
		}

		bluetooth.dbusInterfaces.avrcp = data;

		if (bluetooth.propertiesChangedListenersSet.avrcp === true) {
			try {
				log.lib(`Removing PropertiesChanged event listener for AVRCP interface '${status.bluetooth.interfaces.avrcp}'`);
				bluetooth.dbusInterfaces.avrcp.removeListener('PropertiesChanged', interfacePropertiesAvrcpChanged);

				bluetooth.propertiesChangedListenersSet.avrcp = false;
			}
			catch (removeAvrcpPropertiesChangedListenerError) {
				log.error('Failed to remove AVRCP PropertiesChanged listener');
				console.error({ removeAvrcpPropertiesChangedListenerError });
				return false;
			}
		}

		try {
			log.lib(`Setting PropertiesChanged event listener for AVRCP interface '${status.bluetooth.interfaces.avrcp}'`);
			bluetooth.dbusInterfaces.avrcp.on('PropertiesChanged', interfacePropertiesAvrcpChanged);

			bluetooth.propertiesChangedListenersSet.avrcp = true;
		}
		catch (setAvrcpPropertiesChangedListenerError) {
			log.error('Failed to set AVRCP PropertiesChanged listener');
			console.error({ setAvrcpPropertiesChangedListenerError });
		}
	});
} // async interfacePropertiesAvrcp()

async function interfacePropertiesPlayer() {
	if (status.bluetooth.interfaces.player === null) {
		log.error('Player interface is null, cannot get properties');
		return;
	}

	log.lib(`Getting interface properties for player interface '${status.bluetooth.interfaces.player}'`);

	bluetooth.service.getInterface(status.bluetooth.interfaces.player, bluetooth.paths.dbus.prop, async (error, data) => {
		if (error !== null) {
			// Ignore the error if it's just the interface not being present yet
			if (error.message === 'No such interface found') {
				log.lib(`Player interface '${status.bluetooth.interfaces.player}' not currently available`);
				return;
			}

			log.error(`Player interface experienced error: '${error.message}'`);
			log.error(error);
			return false;
		}

		bluetooth.dbusInterfaces.player = data;

		if (bluetooth.propertiesChangedListenersSet.player === true) {
			try {
				log.lib(`Removing PropertiesChanged event listener for player interface '${status.bluetooth.interfaces.player}'`);
				bluetooth.dbusInterfaces.player.removeListener('PropertiesChanged', interfacePropertiesPlayerChanged);

				bluetooth.propertiesChangedListenersSet.player = false;
			}
			catch (removePlayerPropertiesChangedListenerError) {
				log.error('Failed to remove player PropertiesChanged listener');
				console.error({ removePlayerPropertiesChangedListenerError });
				return false;
			}
		}

		try {
			log.lib(`Setting PropertiesChanged event listener for player interface '${status.bluetooth.interfaces.player}'`);
			bluetooth.dbusInterfaces.player.on('PropertiesChanged', interfacePropertiesPlayerChanged);

			bluetooth.propertiesChangedListenersSet.player = true;
		}
		catch (setPlayerPropertiesChangedListenerError) {
			log.error('Failed to set player PropertiesChanged listener');
			console.error({ setPlayerPropertiesChangedListenerError });
		}
	});
} // async interfacePropertiesPlayer()


function interfacePropertiesAdapterChanged(service, data1) {
	if (!data1[0])    return;
	if (!data1[0][0]) return;

	const propertyKey = data1[0][0].toLowerCase();

	const serviceFmt = service.replace('org.bluez.', '');

	log.lib(`Adapter '${status.bluetooth.interfaces.adapter}' service '${serviceFmt}' property '${propertyKey}' changed`);

	const value = data1[0][1][1][0];

	if (typeof status.bluetooth.services                     === 'undefined') status.bluetooth.services                     = {};
	if (typeof status.bluetooth.services.adapter             === 'undefined') status.bluetooth.services.adapter             = {};
	if (typeof status.bluetooth.services.adapter[serviceFmt] === 'undefined') status.bluetooth.services.adapter[serviceFmt] = {};

	update.status(`bluetooth.services.adapter.${serviceFmt}.${propertyKey}`, value);

	update.status(`bluetooth.adapter.${propertyKey}`, value);
} // interfacePropertiesAdapterChanged(service, data1)

function interfacePropertiesDeviceChanged(service, data1) {
	if (!data1[0])    return;
	if (!data1[0][0]) return;

	const propertyKey = data1[0][0].toLowerCase();

	let serviceFmt = service.replace('org.bluez.', '');

	// Reformat some service names for clarity
	switch (serviceFmt) {
		case 'percentage' : serviceFmt = 'batterypercentage'; break;
	}

	log.lib(`Device '${status.bluetooth.interfaces.device}' service '${serviceFmt}' property '${propertyKey}' changed`);

	if (!data1[0][1])    return;
	if (!data1[0][1][1]) return;

	const value = data1[0][1][1][0];

	switch (typeof value) {
		case 'boolean' :
		case 'number'  :
		case 'string'  : break;
		default        : return;
	}

	if (typeof status.bluetooth.services                    === 'undefined') status.bluetooth.services                    = {};
	if (typeof status.bluetooth.services.device             === 'undefined') status.bluetooth.services.device             = {};
	if (typeof status.bluetooth.services.device[serviceFmt] === 'undefined') status.bluetooth.services.device[serviceFmt] = {};

	update.status(`bluetooth.services.device.${serviceFmt}.${propertyKey}`, value);

	update.status(`bluetooth.device.${propertyKey}`, value, false);
} // interfacePropertiesDeviceChanged(service, data1)

function interfacePropertiesAvrcpChanged(service, data1) {
	if (!data1[0])    return;
	if (!data1[0][0]) return;

	const propertyKey = data1[0][0].toLowerCase();

	const serviceFmt = service.replace('org.bluez.', '');

	// Skip track position update message since it spams the logs
	if (propertyKey !== 'position') {
		log.lib(`AVRCP '${status.bluetooth.interfaces.avrcp}' service '${serviceFmt}' property '${propertyKey}' changed`);
	}

	if (!data1[0][1])    return;
	if (!data1[0][1][1]) return;

	const value = data1[0][1][1][0];

	switch (typeof value) {
		case 'boolean' :
		case 'number'  :
		case 'string'  : break;
		default        : return;
	}

	if (typeof status.bluetooth.services                    === 'undefined') status.bluetooth.services                    = {};
	if (typeof status.bluetooth.services.player             === 'undefined') status.bluetooth.services.player             = {};
	if (typeof status.bluetooth.services.player[serviceFmt] === 'undefined') status.bluetooth.services.player[serviceFmt] = {};

	update.status(`bluetooth.services.player.${serviceFmt}.${propertyKey}`, value);

	// Return now if the value hasn't changed
	if (!update.status(`bluetooth.player.${propertyKey}`, value, false)) return;

	// Update misc information
	if (typeof data1[0][1][1][0] === 'object') {
		if (Array.isArray(data1[0][1][1][0])) {
			for (const key of data1[0][1][1][0]) {
				if (typeof key[1]       === 'undefined') continue;
				if (typeof key[1][1]    === 'undefined') continue;
				if (typeof key[1][1][0] === 'undefined') continue;

				update.status(`bluetooth.player.${key[0].toLowerCase()}`, key[1][1][0]);
			}
		}
	}

	// Update MID text if configured
	if (config.media.bluetooth.text.mid === true) {
		if (update.status('mid.text.right', `${status.bluetooth.player.artist} - ${status.bluetooth.player.title}`)) {
			MID.refresh_text();
		}
	}

	// Update IKE text if configured
	if (config.media.bluetooth.text.ike !== true) return;

	// TODO: Probably add what this doesn't catch, and move it out to a separate function

	// Lowercase 'Feat' to 'feat'
	const strings = {
		artist : status.bluetooth.player.artist.replace(/feat/gi, 'feat'),
		title  : status.bluetooth.player.title.replace(/feat/gi, 'feat'),
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

	IKE.text_override(`${strings.artist} - ${strings.title}`);
} // interfacePropertiesAvrcpChanged(service, data1)

function interfacePropertiesPlayerChanged(service, data1) {
	if (!data1[0])    return;
	if (!data1[0][0]) return;

	const propertyKey = data1[0][0].toLowerCase();

	const serviceFmt = service.replace('org.bluez.', '');

	// Skip track position update message since it spams the logs
	if (propertyKey !== 'position') {
		log.lib(`Player '${status.bluetooth.interfaces.player}' service '${serviceFmt}' property '${propertyKey}' changed`);
	}

	if (!data1[0][1])    return;
	if (!data1[0][1][1]) return;

	const value = data1[0][1][1][0];

	switch (typeof value) {
		case 'boolean' :
		case 'number'  :
		case 'string'  : break;
		default        : return;
	}

	if (typeof status.bluetooth.services                    === 'undefined') status.bluetooth.services                    = {};
	if (typeof status.bluetooth.services.player             === 'undefined') status.bluetooth.services.player             = {};
	if (typeof status.bluetooth.services.player[serviceFmt] === 'undefined') status.bluetooth.services.player[serviceFmt] = {};

	update.status(`bluetooth.services.player.${serviceFmt}.${propertyKey}`, value);

	// Return now if the value hasn't changed
	if (!update.status(`bluetooth.player.${propertyKey}`, value, false)) return;

	// Update misc information
	if (typeof data1[0][1][1][0] === 'object') {
		if (Array.isArray(data1[0][1][1][0])) {
			for (const key of data1[0][1][1][0]) {
				if (typeof key[1]       === 'undefined') continue;
				if (typeof key[1][1]    === 'undefined') continue;
				if (typeof key[1][1][0] === 'undefined') continue;

				update.status(`bluetooth.player.${key[0].toLowerCase()}`, key[1][1][0]);
			}
		}
	}

	// Update MID text if configured
	if (config.media.bluetooth.text.mid === true) {
		if (update.status('mid.text.right', `${status.bluetooth.player.artist} - ${status.bluetooth.player.title}`)) {
			MID.refresh_text();
		}
	}

	// Update IKE text if configured
	if (config.media.bluetooth.text.ike !== true) return;

	// TODO: Probably add what this doesn't catch, and move it out to a separate function

	// Lowercase 'Feat' to 'feat'
	const strings = {
		artist : status.bluetooth.player.artist.replace(/feat/gi, 'feat'),
		title  : status.bluetooth.player.title.replace(/feat/gi, 'feat'),
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

	IKE.text_override(`${strings.artist} - ${strings.title}`);
} // interfacePropertiesPlayerChanged(service, data1)


async function handleBlueZMainObjects(error, objects) {
	if (error !== null) {
		log.error(error);
		return false;
	}

	objects.as(bluetooth.paths.dbus.objMan).GetManagedObjects(async (error, objects) => {
		await handleBlueZManagedObjects(error, objects);
	});
} // async handleBlueZMainObjects(error, objects)

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

async function handleBlueZManagedObjects(error, objects) {
	if (error) {
		log.error(`Device number ${bluetooth.deviceNumber} experienced error`);
		console.error(error);
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

	// Wait one second
	// await new Promise(resolve => setTimeout(resolve, 1000));

	// Update interface paths
	const btInterfaceRoot = '/';
	update.status('bluetooth.interfaces.root', btInterfaceRoot);

	const btInterfaceAdapter = '/org/bluez/hci0';
	update.status('bluetooth.interfaces.adapter', btInterfaceAdapter);

	// /org/bluez/hci0/dev_AA_BB_CC_DD_EE_FF
	const btInterfaceDevice = `${btInterfaceAdapter}/dev_${config.media.bluetooth.device_mac.replace(/:/g, '_')}`;
	update.status('bluetooth.interfaces.device', btInterfaceDevice);

	// /org/bluez/hci0/dev_AA_BB_CC_DD_EE_FF/player0
	const btInterfacePlayer = `${btInterfaceDevice}/player0`;
	update.status('bluetooth.interfaces.player', btInterfacePlayer);

	// /org/bluez/hci0/dev_AA_BB_CC_DD_EE_FF/avrcp/player0
	const btInterfaceAvrcp = `${btInterfaceDevice}/avrcp/player0`;
	update.status('bluetooth.interfaces.avrcp', btInterfaceAvrcp);


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
	await interfaceObjectsRoot();

	await new Promise(resolve => setTimeout(resolve, 200));
	await interfacePropertiesAdapter();

	await new Promise(resolve => setTimeout(resolve, 200));
	await interfacePropertiesDevice();

	await new Promise(resolve => setTimeout(resolve, 200));
	await interfacePropertiesPlayer();

	await new Promise(resolve => setTimeout(resolve, 200));
	await interfacePropertiesAvrcp();

	// eslint require-atomic-updates
	bluetooth.listenersActive = true;

	log.lib('Initialized listeners');
} // async init_listeners()


export default {
	dbus       : null,
	service    : null,
	systemDbus : null,

	deviceNumber        : 2,
	deviceNumberDefault : 2,

	listenersActive : false,

	propertiesChangedListenersSet : {
		adapter : false,
		avrcp   : false,
		device  : false,
		player  : false,
	},

	dbusInterfaces : {
		adapter : null,
		avrcp   : null,
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
