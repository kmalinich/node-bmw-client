function apply() {
	return {
		interfaces : {
			adapter : '/org/bluez/hci0',
			device  : null,
			player  : null,
			root    : '/',
		},

		adapter : {
			class : null,

			discoverable : false,
			discovering  : false,

			name    : null,
			powered : false,
			service : null,
		},

		device : {
			batterypercentage : null,

			connected : false,

			connecting    : false,
			disconnecting : false,

			modalias  : null,

			name   : null,
			paired : false,

			position : 0,
			rssi     : 0,

			service          : null,
			servicesresolved : false,

			status  : null,
			track   : 0,
			trusted : false,
			type    : null,
		},

		player : {
			album  : null,
			artist : null,
			genre  : null,
			item   : null,
			title  : null,

			position : null,
			duration : null,

			equalizer : null,

			numberoftracks : null,
			tracknumber    : null,
		},

		services : {
			adapter : {
				Adapter1 : {
				},
			},

			device : {
				Device1 : {
					connected        : false,
					servicesresolved : false,
				},

				MediaControl1 : {
					connected : false,
					player    : null,
				},
			},

			player : {
				MediaPlayer1 : {
					equalizer : null,
					position  : null,
					status    : null,
					type      : null,
				},
			},
		},
	};
}


module.exports = {
	apply,
};
