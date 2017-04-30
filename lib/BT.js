var module_name = __filename.slice(__dirname.length + 1, -3);

// Only pull in libraries if bluetooth is enabled
if (config.media.bluetooth === true) {
	// systemd dbus libraries
	var dbus = require('dbus-native');
	// systemd dbus handle
	var bus = dbus.systemBus();
}

module.exports = {
	listener_active : false,

	// Read dbus and get 1st paired device's name, status, path, etc
	autoconfig : (callback = null) => {
		if (config.media.bluetooth === false) {
			if (typeof callback === 'function') { callback(); }
			return false;
		}

		log.msg({ src : module_name, msg : 'Performing autoconfig' });

		bus.getObject('org.bluez', '/', (error, objects) => {
			objects.as('org.freedesktop.DBus.ObjectManager').GetManagedObjects((error_obj, return_obj) => {
				var connected   = return_obj[2][1][1][1][9][1][1][0];
				var name        = return_obj[2][1][1][1][1][1][1][0];
				var path        = return_obj[2][0];
				var service     = return_obj[2][1][1][0];

				// console.log(return_obj[2][1][4][1][0][1]); // Potential track info (iOS)

				if (return_obj[3]) {
					var path_player = return_obj[3][0];
					if (return_obj[3][1][1][1][2][1][1][0]) { // Track info (Android)
						if (return_obj[3][1][1][1][2][1][1][0][0][0][1]) { // Track info (Android)
							log.msg({ src : module_name, msg : 'Track name'+return_obj[3][1][1][1][2][1][1][0][0][1][1][0] });
							log.msg({ src : module_name, msg : 'Duration'+return_obj[3][1][1][1][2][1][1][0][1][1][1][0] });
							log.msg({ src : module_name, msg : 'Album'+return_obj[3][1][1][1][2][1][1][0][2][1][1][0] });
							log.msg({ src : module_name, msg : 'Current track #'+return_obj[3][1][1][1][2][1][1][0][3][1][1][0] });
							log.msg({ src : module_name, msg : 'Artist'+return_obj[3][1][1][1][2][1][1][0][4][1][1][0] });
							log.msg({ src : module_name, msg : '# of total tracks'+return_obj[3][1][1][1][2][1][1][0][5][1][1][0] });
							log.msg({ src : module_name, msg : 'Genre'+return_obj[3][1][1][1][2][1][1][0][6][1][1][0] });
						}
					}
				}

				if (BT.listener_active === false) {
					bus.getService('org.bluez').getInterface('/', 'org.freedesktop.DBus.ObjectManager', (err, data) => {
						data.on('InterfacesAdded', (interface, data1, data2) => {
							console.log('Interface added: %s', interface);
							console.log(data1);
							console.log(data2);

							if (new RegExp('/player[0-9]$').test(interface)) {
								console.log('MediaPlayer1 interface '+interface+' added');
							}
						});
					});

					bus.getService('org.bluez').getInterface(status.bt_device.path, 'org.freedesktop.DBus.Properties', (err, data) => {
						data.on('PropertiesChanged', (property, data1, data2) => {
							console.log('Property changed: %s', property);

							if (property == 'org.bluez.Device1') {
								console.log('device1 data');

								if (data1[0][0] == 'Connected') {
									// If newly connected/disconnected
									if (status.bt_device.connected != data1[0][1][1][0]) {
										log.change({
											src   : module_name,
											value : 'Device connected',
											old   : status.bt_device.connected,
											new   : data1[0][1][1][0],
										});
										status.bt_device.connected = data1[0][1][1][0];
										MID.refresh_text();
									}

									if (status.bt_device.connected) {
										TEL.led({ solid_green : true });
									}
									else {
										TEL.led({ solid_red : true });
									}
								}
							}

							// Track info
							if (property == 'org.bluez.MediaPlayer1') {
								console.log('mediaplayer1 data');
							}
							if (property == 'org.bluez.MediaControl1') {
								console.log('MediaControl1 data');
								console.log(data1);
							}
						});
					});
				}

				// Set variables in status object appropriately
				status.bt_device.connected   = connected;
				status.bt_device.name        = name;
				status.bt_device.path        = path;
				status.bt_device.path        = path;
				status.bt_device.path_player = path_player;
				status.bt_device.service     = service;
				// status.bt_device.link_alert = link_alert;
				// status.bt_device.network    = network;

				if (status.bt_device.connected) {
					TEL.led({ solid_green : true });
				}
				else {
					TEL.led({ solid_red : true });
				}

				log.msg({ src : module_name, msg : 'Using device \''+name+'\' ('+path_player+'), connected: '+connected });

				status.mid.text = name;
				MID.refresh_text();
			});
		});

		if (typeof callback === 'function') { callback(); }
	},

	// Send commands over systemd dbus to BlueZ 5 to control bluetooth device
	command : (action) => {
		if (config.media.bluetooth === false) {
			return false;
		}

		switch (action) {
			case 'connect':
				// Send connect command to BlueZ
				bus.invoke({
					path        : status.bt_device.path,
					destination : 'org.bluez',
					'interface' : status.bt_device.service,
					member      : 'Connect',
					type        : dbus.messageType.methodCall
				});
				break;

			case 'disconnect':
				// Send disconnect command to BlueZ
				bus.invoke({
					path        : status.bt_device.path,
					destination : 'org.bluez',
					'interface' : status.bt_device.service,
					member      : 'Disconnect',
					type        : dbus.messageType.methodCall
				});
				break;

			case 'pause':
				// Send pause command to BlueZ
				bus.invoke({
					path        : status.bt_device.path_player,
					destination : 'org.bluez',
					'interface' : 'org.bluez.MediaPlayer1',
					member      : 'Pause',
					type        : dbus.messageType.methodCall
				});
				break;

			case 'play':
				// Send play command to BlueZ
				bus.invoke({
					path        : status.bt_device.path_player,
					destination : 'org.bluez',
					'interface' : 'org.bluez.MediaPlayer1',
					member      : 'Play',
					type        : dbus.messageType.methodCall
				});
				break;

			case 'previous':
				// Send previous track command to BlueZ
				bus.invoke({
					path        : status.bt_device.path_player,
					destination : 'org.bluez',
					'interface' : 'org.bluez.MediaPlayer1',
					member      : 'Previous',
					type        : dbus.messageType.methodCall
				});
				break;

			case 'next':
				// Send next track command to BlueZ
				bus.invoke({
					path        : status.bt_device.path_player,
					destination : 'org.bluez',
					'interface' : 'org.bluez.MediaPlayer1',
					member      : 'Next',
					type        : dbus.messageType.methodCall
				});
				break;
		}

		BT.autoconfig(() => {});

		log.msg({ src : module_name, msg : 'Sending \''+action+'\' command to bluetooth device \''+status.bt_device.name+'\'' });
	},
};