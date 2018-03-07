function apply() {
	return {
		adapter : {
			class        : null,
			discoverable : false,
			discovering  : false,
			name         : null,
			path         : null,
			powered      : false,
			service      : null,
		},
		device : {
			connected : false,
			modalias  : null,
			name      : null,
			paired    : false,
			paths     : {
				main   : null,
				player : null,
			},
			player           : null,
			position         : null,
			rssi             : null,
			service          : null,
			servicesresolved : false,
			status           : null,
			track            : null,
			trusted          : false,
			type             : null,
		},
		media : {
			album          : null,
			artist         : null,
			duration       : null,
			genre          : null,
			item           : null,
			numberoftracks : null,
			title          : null,
			tracknumber    : null,
		},
	};
}

module.exports = {
	apply : apply,
};
