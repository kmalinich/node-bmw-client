module.exports = {
	dbus        : null,
	service     : null,
	system_dbus : null,

	listeners_active : false,

	init : (init_callback = null) => {
		if (config.media.bluetooth === false) {
			if (typeof init_callback === 'function') init_callback();
			init_callback = undefined;
			return false;
		}

		// systemd dbus libraries
		BT.dbus = require('dbus-native');

		// systemd dbus handle
		BT.system_dbus = BT.dbus.systemBus();

		if (BT.service === null) BT.service = BT.system_dbus.getService('org.bluez');

		log.module({ msg : 'Initializing' });

		BT.system_dbus.getObject('org.bluez', '/', (error, objects) => {
			if (error !== null) {
				log.module({ msg : 'Error: ' + error });
				return false;
			}

			objects.as('org.freedesktop.DBus.ObjectManager').GetManagedObjects((error_obj, return_obj) => {
				if (return_obj[2]) {
					var name    = return_obj[2][1][1][1][1][1][1][0];
					var path    = return_obj[2][0];
					var service = return_obj[2][1][1][0];

					// Set variables in status object appropriately
					status.bt_device.name    = name;
					status.bt_device.path    = path;
					status.bt_device.service = service;

					log.module({ msg : 'Using device \'' + name + '\' (' + path + ')' });

					status.mid.text_left = name;
					MID.refresh_text();

					BT.init_listeners(() => {
						BT.interface_properties_device(path);
						if (typeof init_callback === 'function') init_callback();
						init_callback = undefined;
					});
				}
				else {
					BT.init_listeners(() => {
						if (typeof init_callback === 'function') init_callback();
						init_callback = undefined;
					});
				}
			});
		});
	},

	// Read dbus and get 1st paired device's name, status, path, etc
	init_listeners : (init_listeners_callback = null) => {
		if (config.media.bluetooth === false) {
			if (typeof init_listeners_callback === 'function') init_listeners_callback();
			init_listeners_callback = undefined;
			return false;
		}

		// Only run this once
		if (BT.listeners_active !== false) {
			log.module({ msg : 'Listeners already active' });
			if (typeof init_listeners_callback === 'function') init_listeners_callback();
			init_listeners_callback = undefined;
			return;
		}

		log.module({ msg : 'Setting up listeners' });

		// Adapter properties interface
		BT.interface_properties_adapter('/org/bluez/hci0');

		// Interfaces added/removed
		BT.service.getInterface('/', 'org.freedesktop.DBus.ObjectManager', (error, data) => {
			if (error !== null) {
				log.module({ msg : 'Error: ' + error });
				return false;
			}

			// Also passes data1 arg
			data.on('InterfacesRemoved', (bt_interface) => {
				log.module({ msg : 'Interface \'' + bt_interface + '\' removed' });
			});

			// Also passes data1 arg
			data.on('InterfacesAdded', (bt_interface) => {
				// Device bt_interface
				if (new RegExp('^/org/bluez/hci[0-9]/dev_[A-F0-9][A-F0-9]_[A-F0-9][A-F0-9]_[A-F0-9][A-F0-9]_[A-F0-9][A-F0-9]_[A-F0-9][A-F0-9]_[A-F0-9][A-F0-9]$').test(bt_interface)) {
					log.module({ msg : 'Device bt_interface \'' + bt_interface + '\' added' });
					BT.bt_interface_properties_device(bt_interface);
				}

				// MediaPlayer1 bt_interface
				else if (new RegExp('/player[0-9]$').test(bt_interface)) {
					log.module({ msg : 'MediaPlayer1 bt_interface \'' + bt_interface + '\' added' });
					BT.bt_interface_properties_player(bt_interface);
				}
				else {
					// log.module({ msg: 'Interface \''+bt_interface+'\' added' });
				}
			});
		});

		BT.listeners_active = true;

		// BT.command('disconnect');

		setTimeout(() => {
			BT.command('connect');
			if (typeof init_listeners_callback === 'function') init_listeners_callback();
			init_listeners_callback = undefined;
		}, 3000);
	},

	interface_properties_device : (bt_interface) => {
		BT.service.getInterface(bt_interface, 'org.freedesktop.DBus.Properties', (error, data) => {
			if (error !== null) {
				log.module({ msg : 'Error: ' + error });
				return false;
			}

			data.on('PropertiesChanged', (property, data1) => {
				if (data1[0]) {
					// log.module({ msg: 'Device \''+bt_interface+'\' property \''+data1[0][0].toLowerCase()+'\' changed' });

					if (data1[0][1]) {
						if (data1[0][1][1]) {
							if (typeof data1[0][1][1][0] === 'string' || typeof data1[0][1][1][0] === 'number' || typeof data1[0][1][1][0] === 'boolean') {
								if (status.bt_device[data1[0][0].toLowerCase()] != data1[0][1][1][0]) {
									log.change({
										value : data1[0][0],
										old   : status.bt_device[data1[0][0].toLowerCase()],
										new   : data1[0][1][1][0],
									});

									status.bt_device[data1[0][0].toLowerCase()] = data1[0][1][1][0];
									MID.refresh_text();
								}
							}
						}
					}
				}
			});
		});
	},

	interface_properties_player : (bt_interface) => {
		BT.service.getInterface(bt_interface, 'org.freedesktop.DBus.Properties', (error, data) => {
			if (error !== null) {
				log.module({ msg : 'Error: ' + error });
				return false;
			}

			// Set mediaplayer path in status vars
			status.bt_device.path_player = bt_interface;

			data.on('PropertiesChanged', (property, data1) => {
				// log.module({ msg: 'MediaPlayer1 \''+bt_interface+'\' property \''+data1[0][0].toLowerCase()+'\' changed' });

				if (data1[0][1]) {
					if (data1[0][1][1]) {
						if (typeof data1[0][1][1][0] === 'string' || typeof data1[0][1][1][0] === 'number' || typeof data1[0][1][1][0] === 'boolean') {
							if (status.bt_device[data1[0][0].toLowerCase()] != data1[0][1][1][0]) {
								log.change({
									value : data1[0][0],
									old   : status.bt_device[data1[0][0].toLowerCase()],
									new   : data1[0][1][1][0],
								});

								status.bt_device[data1[0][0].toLowerCase()] = data1[0][1][1][0];
								MID.refresh_text();
							}
						}

						else {
							for (var field = 0; field < data1[0][1][1][0].length; field++) {
								var field_name  = data1[0][1][1][0][field][0].toLowerCase();
								var field_value = data1[0][1][1][0][field][1][1];

								// Track information
								if (status.bt_device.media[field_name] != field_value) {
									log.change({
										value : field_name,
										old   : status.bt_device.media[field_name],
										new   : field_value,
									});

									status.bt_device.media[field_name] = field_value;

									TEL.led({
										solid_green : status.bt_device.connected,
										solid_red   : !status.bt_device.connected,
									});
								}
							}

							status.mid.text_right = status.bt_device.media.title + ' - ' + status.bt_device.media.artist;
							MID.refresh_text();
						}
					}
				}
			});
		});
	},

	interface_properties_adapter : (bt_interface) => {
		BT.service.getInterface(bt_interface, 'org.freedesktop.DBus.Properties', (error, data) => {
			if (error !== null) {
				log.module({ msg : 'Error: ' + error });
				return false;
			}

			data.on('PropertiesChanged', (property, data1) => {
				log.module({ msg : 'Adapter property \'' + data1[0][0].toLowerCase() + '\' changed' });

				if (status.bt_adapter[data1[0][0].toLowerCase()] != data1[0][1][1][0]) {
					log.change({
						value : data1[0][0],
						old   : status.bt_adapter[data1[0][0].toLowerCase()],
						new   : data1[0][1][1][0],
					});

					status.bt_adapter[data1[0][0].toLowerCase()] = data1[0][1][1][0];
				}
			});
		});
	},

	// Send commands over systemd dbus to BlueZ 5 to control device
	command : (action) => {
		if (config.media.bluetooth === false) return;
		if (status.bt_device.path == null) return;

		switch (action) {
			case 'connect':
				// Send connect command to BlueZ
				BT.system_dbus.invoke({
					path        : status.bt_device.path,
					destination : 'org.bluez',
					'interface' : status.bt_device.service,
					member      : 'Connect',
					type        : BT.dbus.messageType.methodCall,
				});
				break;

			case 'disconnect':
				// Send disconnect command to BlueZ
				BT.system_dbus.invoke({
					path        : status.bt_device.path,
					destination : 'org.bluez',
					'interface' : status.bt_device.service,
					member      : 'Disconnect',
					type        : BT.dbus.messageType.methodCall,
				});

				TEL.led({ solid_red : true });
				break;

			case 'pause':
				if (status.bt_device.path_player == null) return;
				// Send pause command to BlueZ
				BT.system_dbus.invoke({
					path        : status.bt_device.path_player,
					destination : 'org.bluez',
					'interface' : 'org.bluez.MediaPlayer1',
					member      : 'Pause',
					type        : BT.dbus.messageType.methodCall,
				});
				break;

			case 'play':
				if (status.bt_device.path_player == null) return;
				// Send play command to BlueZ
				BT.system_dbus.invoke({
					path        : status.bt_device.path_player,
					destination : 'org.bluez',
					'interface' : 'org.bluez.MediaPlayer1',
					member      : 'Play',
					type        : BT.dbus.messageType.methodCall,
				});
				break;

			case 'previous':
				if (status.bt_device.path_player == null) return;
				// Send previous track command to BlueZ
				BT.system_dbus.invoke({
					path        : status.bt_device.path_player,
					destination : 'org.bluez',
					'interface' : 'org.bluez.MediaPlayer1',
					member      : 'Previous',
					type        : BT.dbus.messageType.methodCall,
				});
				break;

			case 'next':
				if (status.bt_device.path_player == null) return;
				// Send next track command to BlueZ
				BT.system_dbus.invoke({
					path        : status.bt_device.path_player,
					destination : 'org.bluez',
					'interface' : 'org.bluez.MediaPlayer1',
					member      : 'Next',
					type        : BT.dbus.messageType.methodCall,
				});
				break;
		}

		log.module({ msg : 'Sending \'' + action + '\' command to device \'' + status.bt_device.name + '\'' });
	},

};
