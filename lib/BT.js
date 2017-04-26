var module_name = __filename.slice(__dirname.length + 1, -3);

// Only pull in libraries if bluetooth is enabled
if (config.media.bluetooth === true) {
	// systemd dbus libraries
	var dbus = require('dbus-native');
	// systemd dbus handle
	var bus = dbus.systemBus();
}

module.exports = {
	// Read dbus and get 1st paired device's name, status, path, etc
	autoconfig : (callback = null) => {
		if (config.media.bluetooth === false) {
			if (typeof callback === 'function') { callback(); }
			return false;
		}

		bus.getObject('org.bluez', '/', (error, objects) => {
			objects.as('org.freedesktop.DBus.ObjectManager').GetManagedObjects((error_obj, return_obj) => {
				var connected  = return_obj[2][1][1][1][9][1][1][0];
				var name       = return_obj[2][1][1][1][1][1][1][0];
				var path       = return_obj[2][0];
				var service    = return_obj[2][1][1][0];

				// Set variables in status object appropriately
				status.bt_device.connected = connected;
				status.bt_device.name      = name;
				status.bt_device.path      = path;
				status.bt_device.service   = service;
				// status.bt_device.link_alert = link_alert;
				// status.bt_device.network    = network;
				log.msg({ src : module_name, msg : 'Configured bluetooth device \''+name+'\' ('+path+')' });

				// console.log(return_obj[3][1][1][1][2][1][1][0]); // Track info (Android)
				// console.log(return_obj[3][1][1][1][2][1][1][0][0][1][1][0]); // Track name (Android)
				// console.log(return_obj[3][1][1][1][2][1][1][0][1][1][1][0]); // Duration (Android)
				// console.log(return_obj[3][1][1][1][2][1][1][0][2][1][1][0]); // Album (Android)
				// console.log(return_obj[3][1][1][1][2][1][1][0][3][1][1][0]); // Current track # (Android)
				// console.log(return_obj[3][1][1][1][2][1][1][0][4][1][1][0]); // Artist (Android)
				// console.log(return_obj[3][1][1][1][2][1][1][0][5][1][1][0]); // # of total tracks (Android)
				// console.log(return_obj[3][1][1][1][2][1][1][0][6][1][1][0]); // Genre (Android)

				MID.text(name);
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
					path        : status.bt_device.path+'/player0',
					destination : 'org.bluez',
					'interface' : 'org.bluez.MediaControl1',
					member      : 'Pause',
					type        : dbus.messageType.methodCall
				});
				break;

			case 'play':
				// Send play command to BlueZ
				bus.invoke({
					path        : status.bt_device.path+'/player0',
					destination : 'org.bluez',
					'interface' : 'org.bluez.MediaControl1',
					member      : 'Play',
					type        : dbus.messageType.methodCall
				});
				break;

			case 'previous':
				// Send previous track command to BlueZ
				bus.invoke({
					path        : status.bt_device.path+'/player0',
					destination : 'org.bluez',
					'interface' : 'org.bluez.MediaControl1',
					member      : 'Previous',
					type        : dbus.messageType.methodCall
				});
				break;

			case 'next':
				// Send next track command to BlueZ
				bus.invoke({
					path        : status.bt_device.path+'/player0',
					destination : 'org.bluez',
					'interface' : 'org.bluez.MediaControl1',
					member      : 'Next',
					type        : dbus.messageType.methodCall
				});
				break;
		}

		log.msg({ src : module_name, msg : 'Sending \''+action+'\' command to bluetooth device \''+status.bt_device.name+'\'' });
	},
};
