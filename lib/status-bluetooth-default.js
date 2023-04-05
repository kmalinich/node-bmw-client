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
			connected : false,
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
			album    : null,
			artist   : null,
			duration : 0,
			genre    : null,
			item     : null,
			title    : null,

			numberoftracks : 0,
			tracknumber    : 0,
		},
	};
}


module.exports = {
	apply,
};
