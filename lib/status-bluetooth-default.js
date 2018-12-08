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

			player   : null,
			position : 0,
			rssi     : 0,

			service          : null,
			servicesresolved : false,

			status  : null,
			track   : 0,
			trusted : false,
			type    : null,

			paths : {
				main   : null,
				player : null,
			},
		},

		media : {
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
	apply : apply,
};
