function apply() {
	return {
		adapter : {
			class : null,

			discoverable : false,
			discovering  : false,

			name    : null,
			path    : null,
			powered : false,
			service : null,
		},

		device : {
			connected : false,
			modalias  : null,

			name   : null,
			paired : false,

			paths : {
				main   : null,
				player : null,
			},

			player   : null,
			position : 0,
			rssi     : 0,

			service          : null,
			servicesresolved : false,

			status  : null,
			track   : 0,
			trusted : false,
			type    : null,
		},

		media : {
			album          : null,
			artist         : null,
			duration       : 0,
			genre          : null,
			item           : null,
			numberoftracks : 0,
			title          : null,
			tracknumber    : 0,
		},
	};
}

module.exports = {
	apply : apply,
};
