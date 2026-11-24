function apply() {
	return {
		// adapter : {
		// 	class        : null,
		// 	discoverable : false,
		// 	discovering  : false,
		// 	name         : null,
		// 	powered      : false,
		// 	service      : null,
		// },

		device : {
			batterypercentage : null,
			connected         : false,
			connecting        : false,
			disconnecting     : false,
			modalias          : null,
			name              : null,
			paired            : false,
			position          : 0,
			rssi              : 0,
			service           : null,
			servicesresolved  : false,
			status            : null,
			track             : 0,
			trusted           : false,
			type              : null,
		},

		interfaces : {
			// adapter : '/org/bluez/hci0',
			device : `/org/bluez/hci0/dev_${config.media.bluetooth.device_mac.replace(/:/g, '_')}`,
			player : `/org/bluez/hci0/dev_${config.media.bluetooth.device_mac.replace(/:/g, '_')}/avrcp/player0`,
			root   : '/',
		},

		player : {
			album          : null,
			artist         : null,
			duration       : null,
			equalizer      : null,
			genre          : null,
			item           : null,
			numberoftracks : null,
			position       : null,
			title          : null,
			tracknumber    : null,
		},

		services : {
			// Adapter1 : {
			// },

			Device1 : {
				connected        : false,
				servicesresolved : false,
			},

			MediaControl1 : {
				connected : false,
				player    : null,
			},

			MediaPlayer1 : {
				equalizer : null,
				position  : null,
				status    : null,
				type      : null,
			},
		},
	};
}


module.exports = {
	apply,
};
