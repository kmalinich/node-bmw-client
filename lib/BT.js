module.exports = {
	dbus        : null,
	service     : null,
	system_dbus : null,

	listeners_active : false,

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


	// Send commands over systemd dbus to BlueZ 5 to control device
	command : (action) => {
		// Bounce if BT disabled or no device found
		if (config.media.bluetooth             === false) return;
		if (status.bluetooth.device.paths.main === null)  return;

		// Bounce if attempting a media-related command without a player
		switch (action) {
			case 'next'     :
			case 'pause'    :
			case 'play'     :
			case 'previous' :
			case 'toggle'   : if (status.bluetooth.device.paths.player === null) return;
		}

		// Base dbus invoke objects
		let dbus_base = {
			destination : BT.paths.bluez.main,
			type        : BT.dbus.messageType.methodCall,
		};

		let dbus_main = {
			'interface' : status.bluetooth.device.service,
			path        : status.bluetooth.device.paths.main,
		};

		let dbus_media = {
			'interface' : BT.paths.bluez.media,
			path        : status.bluetooth.device.paths.player,
		};

		// Use ES6 object merge to build base dbus command objects
		Object.assign(dbus_main,  dbus_base);
		Object.assign(dbus_media, dbus_base);

		// Capitalize first letter of action
		action = action.charAt(0).toUpperCase() + action.slice(1);

		// TEL LED commands for connect/disconnect
		switch (action) {
			case 'Connect'    : TEL.led({ flash_yellow : true, solid_green : true }); break;
			case 'Disconnect' : TEL.led({ flash_yellow : true, solid_red   : true });
		}

		switch (action) {
			case 'Connect'    : // Connect/disconnect commands with dbus_main  object
			case 'Disconnect' : {
				BT.system_dbus.invoke(Object.assign(dbus_main, { member : action }));
				break;
			}

			case 'Next'     : // Media-related commands with dbus_media object
			case 'Pause'    :
			case 'Play'     :
			case 'Previous' : {
				BT.system_dbus.invoke(Object.assign(dbus_media, { member : action }));
				break;
			}

			case 'Toggle' : { // Toggle playback based on current playback status
				switch (status.bluetooth.device.status) {
					case 'playing' : BT.command('pause'); break;
					case 'paused'  : BT.command('play');
				}

				// Return here to skip log message output
				return;
			}
		}

		log.module({ msg : 'Sending \'' + action + '\' command to device \'' + status.bluetooth.device.name + '\'' });
	},


	init : (init_cb = null) => {
		if (config.media.bluetooth === false) {
			typeof init_cb === 'function' && process.nextTick(init_cb);
			init_cb = undefined;
			return false;
		}

		// systemd dbus libraries
		BT.dbus = require('dbus-native');

		// systemd dbus handle
		BT.system_dbus = BT.dbus.systemBus();

		if (BT.service === null) BT.service = BT.system_dbus.getService(BT.paths.bluez.main);

		log.module({ msg : 'Initializing' });

		BT.system_dbus.getObject(BT.paths.bluez.main, '/', (error, objects) => {
			if (error !== null) {
				log.module({ msg : 'Error: ' + error });
				return false;
			}

			// Device number
			// 1: Local BT controller
			// 2: 1st paired device
			// 3: 2nd paired device
			// 4: 3rd paired device
			// ... so on and so forth
			let device_num = config.media.bluetooth.device_num;

			objects.as(BT.paths.dbus.obj_man).GetManagedObjects((error_obj, return_obj) => {
				if (!return_obj[device_num]) {
					log.module({ msg : 'Error: No device information found' });

					return BT.init_listeners(() => {
						typeof init_cb === 'function' && process.nextTick(init_cb);
						init_cb = undefined;
					});
				}

				let parse = {
					name    : return_obj[device_num][1][1][1][1][1][1][0],
					path    : return_obj[device_num][0],
					service : return_obj[device_num][1][1][0],
				};

				// Set variables in status object appropriately
				update.status('bluetooth.device.name',       parse.name);
				update.status('bluetooth.device.paths.main', parse.path);
				update.status('bluetooth.device.service',    parse.service);

				log.module({ msg : 'Using device \'' + parse.name + '\' (' + parse.path + ')' });

				update.status('mid.text_left', parse.name);
				MID.refresh_text();

				BT.init_listeners(() => {
					BT.interface_properties_device(parse.path);

					TEL.led({ solid_yellow : true });

					typeof init_cb === 'function' && process.nextTick(init_cb);
					init_cb = undefined;
				});
			});
		});
	},

	// Read dbus and get 1st paired device's name, status, path, etc
	init_listeners : (init_listeners_cb = null) => {
		// Bounce if BT is disabled or BT event listeners have already been set up
		if (config.media.bluetooth === false || BT.listeners_active === true) {
			if (BT.listeners_active === true) log.module({ msg : 'Listeners already active' });

			typeof init_listeners_cb === 'function' && process.nextTick(init_listeners_cb);
			init_listeners_cb = undefined;
			return false;
		}

		log.module({ msg : 'Setting up listeners' });

		// Connect/disconnect BT device on IKE ignition event
		IKE.on('ignition-poweroff', () => { BT.command('disconnect'); });
		IKE.on('ignition-powerup',  () => {
			BT.command('connect');

			// After 2s, if BT device is connected, send play command
			setTimeout(() => {
				if (status.bluetooth.device.connected === true) {
					BT.command('play');
				}
			}, 2000);
		});

		// Adapter properties interface
		BT.interface_properties_adapter('/org/bluez/hci0');

		// Interfaces added/removed
		BT.service.getInterface('/', BT.paths.dbus.obj_man, (error, data) => {
			if (error !== null) {
				log.module({ msg : 'Error: ' + error });
				return false;
			}

			// Previously passed 2nd arg data1
			data.on('InterfacesRemoved', (bt_interface) => {
				log.module({ msg : 'Interface \'' + bt_interface + '\' removed' });
			});

			// Previously passed 2nd arg data1
			data.on('InterfacesAdded', (bt_interface) => {
				// Device interface
				if (new RegExp('^/org/bluez/hci[0-9]/dev_[A-F0-9][A-F0-9]_[A-F0-9][A-F0-9]_[A-F0-9][A-F0-9]_[A-F0-9][A-F0-9]_[A-F0-9][A-F0-9]_[A-F0-9][A-F0-9]$').test(bt_interface)) {
					log.module({ msg : 'Device interface \'' + bt_interface + '\' added' });
					BT.interface_properties_device(bt_interface);
				}

				// MediaPlayer1 interface
				else if (new RegExp('/player[0-9]$').test(bt_interface)) {
					log.module({ msg : 'MediaPlayer1 interface \'' + bt_interface + '\' added' });
					BT.interface_properties_player(bt_interface);
				}
				else {
					log.module({ msg : 'Interface \'' + bt_interface + '\' added' });
				}
			});
		});

		BT.listeners_active = true;

		// BT.command('disconnect');

		// setTimeout(() => {
		// 	BT.command('connect');
		// 	typeof init_listeners_cb === 'function' && process.nextTick(init_listeners_cb);
		// 	init_listeners_cb = undefined;
		// }, 3000);

		typeof init_listeners_cb === 'function' && process.nextTick(init_listeners_cb);
		init_listeners_cb = undefined;
	},


	interface_properties_adapter : (bt_interface) => {
		BT.service.getInterface(bt_interface, BT.paths.dbus.prop, (error, data) => {
			if (error !== null) {
				log.module({ msg : 'Error: ' + error });
				return false;
			}

			data.on('PropertiesChanged', (property, data1) => {
				log.module({ msg : 'Adapter property \'' + data1[0][0].toLowerCase() + '\' changed' });

				let field_name  = data1[0][0].toLowerCase();
				let field_value = data1[0][1][1][0];

				update.status('bluetooth.adapter.' + field_name, field_value);
			});
		});
	},

	interface_properties_device : (bt_interface) => {
		BT.service.getInterface(bt_interface, BT.paths.dbus.prop, (error, data) => {
			if (error !== null) {
				log.module({ msg : 'Error: ' + error });
				return false;
			}

			data.on('PropertiesChanged', (property, data1) => {
				if (!data1[0])    return;
				if (!data1[0][0]) return;

				log.module({ msg : 'Device \'' + bt_interface + '\' property \'' + data1[0][0].toLowerCase() + '\' changed' });

				if (!data1[0][1])    return;
				if (!data1[0][1][1]) return;

				switch (typeof data1[0][1][1][0]) {
					case 'boolean' :
					case 'number'  :
					case 'string'  : break;
					default        : return;
				}

				let field_name  = data1[0][0].toLowerCase();
				let field_value = data1[0][1][1][0];

				if (update.status('bluetooth.device.' + field_name, field_value)) {
					if (field_name === 'connected') {
						TEL.led({
							solid_green : status.bluetooth.device.connected,
							solid_red   : !status.bluetooth.device.connected,
						});

						// Set playback status to paused upon device disconnection
						if (status.bluetooth.device.connected === false) update.status('bluetooth.device.status', 'paused');
					}

					MID.refresh_text();
				}
			});
		});
	},

	interface_properties_player : (bt_interface) => {
		BT.service.getInterface(bt_interface, BT.paths.dbus.prop, (error, data) => {
			if (error !== null) {
				log.module({ msg : 'Error: ' + error });
				return false;
			}

			// Set mediaplayer path in status vars
			update.status('bluetooth.device.paths.player', bt_interface);

			data.on('PropertiesChanged', (property, data1) => {
				if (!data1[0])    return;
				if (!data1[0][0]) return;

				log.module({ msg : 'Player \'' + bt_interface + '\' property \'' + data1[0][0].toLowerCase() + '\' changed' });

				if (!data1[0][1])    return;
				if (!data1[0][1][1]) return;

				switch (typeof data1[0][1][1][0]) {
					case 'boolean' :
					case 'number'  :
					case 'string'  : {
						let field_name  = data1[0][0].toLowerCase();
						let field_value = data1[0][1][1][0];

						if (update.status('bluetooth.device.' + field_name, field_value)) {
							MID.refresh_text();
						}
						break;
					}

					default:
						for (let field = 0; field < data1[0][1][1][0].length; field++) {
							let field_name  = data1[0][1][1][0][field][0].toLowerCase();
							let field_value = data1[0][1][1][0][field][1][1][0];

							// Track information
							update.status('bluetooth.media.' + field_name, field_value);
						}

						if (update.status('mid.text_right', status.bluetooth.media.artist + ' - ' + status.bluetooth.media.title)) {
							MID.refresh_text();
							IKE.text_override(status.bluetooth.media.artist + ' - ' + status.bluetooth.media.title);
						}
				}
			});
		});
	},

};
