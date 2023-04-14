/* eslint require-atomic-updates : 0 */

// TODO: Make this a class

const os = require('os');

const invalidDeviceDelay = 500;


// Send commands over systemd dbus to BlueZ 5 to control device
async function command(action) {
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
	switch (action) {
		case 'connect'    : if (status.bluetooth.device.connected === true) return; break;
		case 'disconnect' : if (status.bluetooth.device.connected !== true) return; break;
	}

	// Handle device not being connected yet
	if (action !== 'connect' && action !== 'disconnect') {
		if (status.bluetooth.device.connected !== true) {
			IKE.text_override('BT reconnect');
			await command('connect');
			await new Promise(resolve => setTimeout(resolve, 2000));
		}
	}

	// dbus invoke object
	const dbus_base = {
		destination : bluetooth.paths.bluez.main,
		type        : bluetooth.dbus.messageType.methodCall,
	};

	// Capitalize first letter of action
	const member = action.charAt(0).toUpperCase() + action.slice(1);

	// TEL LED commands for connect/disconnect
	switch (member) {
		case 'Connect'    : TEL.led({ flash_yellow : true, solid_red   : true }); break;
		case 'Disconnect' : TEL.led({ flash_yellow : true, solid_green : true });
	}

	log.lib(`Sending '${member}' command to device '${status.bluetooth.device.name}' ('${status.bluetooth.interfaces.device}')`);

	switch (member) {
		case 'Connect'    : // Connect/disconnect commands with dbus_main object
		case 'Disconnect' : {
			const dbus_main = {
				'interface' : status.bluetooth.device.service,
				path        : status.bluetooth.interfaces.device,
				...dbus_base,
			};

			await bluetooth.system_dbus.invoke({ ...dbus_main, member });

			// Wait here a bit for it to disconnect so the connected property is accurately updated when stopping the application
			// TODO: Really it should /actually/ wait until it's updated, not just wait some amount of time after which it /should/ be updated
			await new Promise(resolve => setTimeout(resolve, 2000));
			break;
		}

		case 'Next'     : // Media-related commands with dbus_media object
		case 'Pause'    :
		case 'Play'     :
		case 'Previous' : {
			// Bounce if attempting a media-related command without a player
			if (status.bluetooth.interfaces.player === null) {
				IKE.text_override('BT reinit');
				await new Promise(resolve => setTimeout(resolve, 1000));
				await init();
				return;
			}

			const dbus_media = {
				'interface' : bluetooth.paths.bluez.media,
				path        : status.bluetooth.interfaces.player,
				...dbus_base,
			};

			await bluetooth.system_dbus.invoke({ ...dbus_media, member });
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
} // async command(action)


function interface_objects_root() {
	log.lib(`Getting interface objects for root interface '${status.bluetooth.interfaces.root}'`);

	// Interfaces added/removed
	bluetooth.service.getInterface(status.bluetooth.interfaces.root, bluetooth.paths.dbus.obj_man, (error, data) => {
		if (error !== null) {
			log.error(error);
			return false;
		}


		// Previously passed 2nd arg data1
		data.on('InterfacesAdded', bt_interface => {
			switch (bt_interface) {
				case status.bluetooth.interfaces.adapter : {
					log.lib(`Adapter interface '${bt_interface}' added`);
					break;
				}

				case status.bluetooth.interfaces.device : {
					log.lib(`Device interface '${bt_interface}' added`);
					break;
				}

				case status.bluetooth.interfaces.player : {
					log.lib(`Player interface '${bt_interface}' added`);
					interface_properties_player();
					break;
				}

				default : {
					log.lib(`Interface '${bt_interface}' added`);
				}
			}
		});


		// Previous passed 2nd arg data1
		data.on('InterfacesRemoved', bt_interface => {
			// console.dir({ data1 });

			switch (bt_interface) {
				case status.bluetooth.interfaces.adapter : {
					log.lib(`Adapter interface '${bt_interface}' removed`);

					try {
						bluetooth.dbusInterfaces.adapter.removeListener('PropertiesChanged', interface_properties_changed_adapter);
					}
					catch (removeAdapterPropertiesChangedListenerError) {
						log.error('Failed to remove adapter PropertiesChanged listener');
						console.error({ removeAdapterPropertiesChangedListenerError });
					}

					break;
				}

				case status.bluetooth.interfaces.device : {
					log.lib(`Device interface '${bt_interface}' removed`);

					try {
						bluetooth.dbusInterfaces.device.removeListener('PropertiesChanged', interface_properties_changed_device);
					}
					catch (removeDevicePropertiesChangedListenerError) {
						log.error('Failed to remove device PropertiesChanged listener');
						console.error({ removeDevicePropertiesChangedListenerError });
					}

					break;
				}

				case status.bluetooth.interfaces.player : {
					log.lib(`Player interface '${bt_interface}' removed`);

					try {
						bluetooth.dbusInterfaces.player.removeListener('PropertiesChanged', interface_properties_changed_player);
					}
					catch (removePlayerPropertiesChangedListenerError) {
						log.error('Failed to remove player PropertiesChanged listener');
						console.error({ removePlayerPropertiesChangedListenerError });
					}

					break;
				}

				default : {
					log.lib(`Interface '${bt_interface}' removed`);
				}
			}
		});
	});
} // interface_objects_root()


function interface_properties_adapter() {
	if (status.bluetooth.interfaces.adapter === null) {
		log.error('Adapter interface is null, cannot get properties');
		return;
	}

	log.lib(`Setting PropertiesChanged event listener for adapter interface '${status.bluetooth.interfaces.adapter}'`);

	bluetooth.service.getInterface(status.bluetooth.interfaces.adapter, bluetooth.paths.dbus.prop, (error, data) => {
		if (error !== null) {
			log.error('Adapter interface experienced error');
			console.error(error);
			return false;
		}

		bluetooth.dbusInterfaces.adapter = data;
		bluetooth.dbusInterfaces.adapter.on('PropertiesChanged', interface_properties_changed_adapter);
	});
} // interface_properties_adapter()

function interface_properties_device() {
	if (status.bluetooth.interfaces.device === null) {
		log.error('Device interface is null, cannot get properties');
		return;
	}

	log.lib(`Setting PropertiesChanged event listener for device interface '${status.bluetooth.interfaces.device}'`);

	bluetooth.service.getInterface(status.bluetooth.interfaces.device, bluetooth.paths.dbus.prop, (error, data) => {
		if (error !== null) {
			log.error('Device interface experienced error');
			console.error(error);
			return false;
		}

		bluetooth.dbusInterfaces.device = data;
		bluetooth.dbusInterfaces.device.on('PropertiesChanged', interface_properties_changed_device);
	});
} // interface_properties_device()

function interface_properties_player() {
	if (status.bluetooth.interfaces.player === null) {
		log.error('Player interface is null, cannot get properties');
		return;
	}

	log.lib(`Setting PropertiesChanged event listener for player interface '${status.bluetooth.interfaces.player}'`);

	bluetooth.service.getInterface(status.bluetooth.interfaces.player, bluetooth.paths.dbus.prop, (error, data) => {
		if (error !== null) {
			log.error('Player interface experienced error');
			console.error(error);
			return false;
		}

		bluetooth.dbusInterfaces.player = data;
		bluetooth.dbusInterfaces.player.on('PropertiesChanged', interface_properties_changed_player);
	});
} // interface_properties_player()


function interface_properties_changed_adapter(service, data1) {
	if (!data1[0])    return;
	if (!data1[0][0]) return;

	const propertyKey = data1[0][0].toLowerCase();

	log.lib(`Adapter ${status.bluetooth.interfaces.adapter} service '${service}' property '${propertyKey}' changed`);

	const value = data1[0][1][1][0];

	if (typeof status.bluetooth.services === 'undefined') status.bluetooth.services = {};
	if (typeof status.bluetooth.services.adapter === 'undefined') status.bluetooth.services.adapter = {};
	if (typeof status.bluetooth.services.adapter[service] === 'undefined') status.bluetooth.services.adapter[service] = {};
	update.status(`bluetooth.services.adapter.${service}.${propertyKey}`, value);

	update.status(`bluetooth.adapter.${propertyKey}`, value);
} // interface_properties_changed_adapter(service, data1)

function interface_properties_changed_device(service, data1) {
	if (!data1[0])    return;
	if (!data1[0][0]) return;

	const propertyKey = data1[0][0].toLowerCase();

	log.lib(`Device ${status.bluetooth.interfaces.device} service '${service}' property '${propertyKey}' changed`);

	if (!data1[0][1])    return;
	if (!data1[0][1][1]) return;

	const value = data1[0][1][1][0];

	switch (typeof value) {
		case 'boolean' :
		case 'number'  :
		case 'string'  : break;
		default        : return;
	}

	if (typeof status.bluetooth.services === 'undefined') status.bluetooth.services = {};
	if (typeof status.bluetooth.services.device === 'undefined') status.bluetooth.services.device = {};
	if (typeof status.bluetooth.services.device[service] === 'undefined') status.bluetooth.services.device[service] = {};
	update.status(`bluetooth.services.device.${service}.${propertyKey}`, value);

	update.status(`bluetooth.device.${propertyKey}`, value, false);
} // interface_properties_changed_device(service, data1)

function interface_properties_changed_player(service, data1) {
	if (!data1[0])    return;
	if (!data1[0][0]) return;

	const propertyKey = data1[0][0].toLowerCase();

	// Skip track position update message since it spams the logs
	if (propertyKey !== 'position') {
		log.lib(`Player ${status.bluetooth.interfaces.player} service '${service}' property '${propertyKey}' changed`);
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

	if (typeof status.bluetooth.services === 'undefined') status.bluetooth.services = {};
	if (typeof status.bluetooth.services.player === 'undefined') status.bluetooth.services.player = {};
	if (typeof status.bluetooth.services.player[service] === 'undefined') status.bluetooth.services.player[service] = {};
	update.status(`bluetooth.services.player.${service}.${propertyKey}`, value);

	// Return now if the value hasn't changed
	if (!update.status(`bluetooth.player.${propertyKey}`, value, false)) return;

	// Update misc information
	if (typeof data1[0][1][1][0] === 'object') {
		if (Array.isArray(data1[0][1][1][0])) {
			for (const key of data1[0][1][1][0]) {
				if (typeof key[1] === 'undefined') continue;
				if (typeof key[1][1] === 'undefined') continue;
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
} // interface_properties_changed_player(service, data1)


async function handleBlueZMainObjects(error, objects) {
	if (error !== null) {
		log.error(error);
		return false;
	}

	objects.as(bluetooth.paths.dbus.obj_man).GetManagedObjects(async (error, objects) => {
		await handleBlueZManagedObjects(error, objects);
	});
} // async handleBlueZMainObjects(error, objects)

function managedObjectsCheck(objects) {
	if (typeof objects                                            === 'undefined') return false;
	if (typeof objects[bluetooth.device_num]                      === 'undefined') return false;
	if (typeof objects[bluetooth.device_num][1]                   === 'undefined') return false;
	if (typeof objects[bluetooth.device_num][1][1]                === 'undefined') return false;

	if (typeof objects[bluetooth.device_num][1][1][1]             === 'undefined') return false;
	if (typeof objects[bluetooth.device_num][1][1][1][1]          === 'undefined') return false;
	if (typeof objects[bluetooth.device_num][1][1][1][1][1]       === 'undefined') return false;
	if (typeof objects[bluetooth.device_num][1][1][1][1][1][1]    === 'undefined') return false;
	if (typeof objects[bluetooth.device_num][1][1][1][1][1][1][0] === 'undefined') return false;

	return true;
} // managedObjectsCheck(objects)

async function handleBlueZManagedObjects(error, objects) {
	if (error) {
		log.error(`Device number ${bluetooth.device_num} experienced error`);
		console.error(error);
		return;
	}

	if (bluetooth.device_num > 6) {
		log.error(`Device number ${bluetooth.device_num} is invalid, resetting device number to 1`);
		bluetooth.device_num = 1;
		return;
	}

	if (managedObjectsCheck(objects) !== true) {
		log.lib(`Device number ${bluetooth.device_num} is invalid, incrementing device counter`);
		await new Promise(resolve => setTimeout(resolve, invalidDeviceDelay));
		bluetooth.device_num++;
		await init();
		return;
	}

	const parse = {
		name    : objects[bluetooth.device_num][1][1][1][2][1][1][0],
		addr    : objects[bluetooth.device_num][1][1][1][0][1][1][0],
		path    : objects[bluetooth.device_num][0],
		service : objects[bluetooth.device_num][1][1][0],
	};

	if (parse.addr !== config.media.bluetooth.device_mac) {
		log.lib(`Device number ${bluetooth.device_num} => '${parse.name}' '${parse.addr}' ('${parse.path}') does not match config, incrementing device counter`);
		bluetooth.device_num++;
		await init();
		return;
	}

	switch (parse.name) {
		case 'public'      :
		case '/NowPlaying' : {
			log.lib(`Device number ${bluetooth.device_num} => '${parse.name}' '${parse.addr}' ('${parse.path}') is invalid, incrementing device counter`);
			await new Promise(resolve => setTimeout(resolve, invalidDeviceDelay));
			bluetooth.device_num++;
			await init();
			return;
		}
	}

	// Set variables in status object appropriately
	update.status('bluetooth.device.name',    parse.name);
	update.status('bluetooth.device.service', parse.service);

	log.lib(`Using device number ${bluetooth.device_num} '${parse.name}' '${parse.addr}' ('${parse.path}')`);

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
	if (bluetooth.system_dbus === null) {
		bluetooth.system_dbus = bluetooth.dbus.systemBus();
	}

	status.bluetooth = require('status-bluetooth-default').apply();

	if (bluetooth.service === null) {
		bluetooth.service = bluetooth.system_dbus.getService(bluetooth.paths.bluez.main);
	}

	log.lib('Initializing');

	// Wait one second
	// await new Promise(resolve => setTimeout(resolve, 1000));


	// Update interface paths
	const btInterfaceRoot = '/';
	update.status('bluetooth.interfaces.root', btInterfaceRoot);

	const btInterfaceAdapter = '/org/bluez/hci0';
	update.status('bluetooth.interfaces.adapter', btInterfaceAdapter);

	// /org/bluez/hci0/dev_AA_BB_CC_DD_EE_FF"
	const btInterfaceDevice = `${btInterfaceAdapter}/dev_${config.media.bluetooth.device_mac.replace(/:/g, '_')}`;
	update.status('bluetooth.interfaces.device', btInterfaceDevice);

	// /org/bluez/hci0/dev_AA_BB_CC_DD_EE_FF/player0
	const btInterfacePlayer = `${btInterfaceDevice}/player0`;
	update.status('bluetooth.interfaces.player', btInterfacePlayer);


	bluetooth.system_dbus.getObject(bluetooth.paths.bluez.main, '/', async (error, objects) => {
		await handleBlueZMainObjects(error, objects);
	});
} // async init()


// Read dbus and get 1st paired device's name, status, path, etc
async function init_listeners() {
	// Bounce if bluetooth is disabled, bluetooth event listeners have already been set up, or wrong platform
	if (config.media.bluetooth.enable === false || os.platform() !== 'linux') return false;

	log.lib('Initializing listeners');

	if (bluetooth.listeners_active === true) {
		log.lib('Listeners already active');
		return;
	}

	// Update TEL LED
	update.on('status.bluetooth.device.connected', data => {
		if (data.new === false) {
			update.status('bluetooth.player.status', 'paused', false);
		}

		TEL.led({
			solid_red   : !data.new,
			solid_green : data.new,
		});
	});

	interface_objects_root();
	interface_properties_adapter();
	interface_properties_device();

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

				bluetooth.device_num = 1;
				break;
			}

			case true : {
				await command('connect');
			}
		}
	});

	// eslint require-atomic-updates
	bluetooth.listeners_active = true;

	log.lib('Initialized listeners');
} // async init_listeners()


module.exports = {
	dbus        : null,
	service     : null,
	system_dbus : null,

	device_num : 1,

	listeners_active : false,

	dbusInterfaces : {
		adapter : null,
		device  : null,
		player  : null,
	},

	// BlueZ 5 dbus paths
	paths : {
		bluez : {
			main  : 'org.bluez',
			media : 'org.bluez.MediaPlayer1',
		},
		dbus : {
			obj_man : 'org.freedesktop.DBus.ObjectManager',
			prop    : 'org.freedesktop.DBus.Properties',
		},
	},


	// Functions
	command,

	init,
	init_listeners,
};
