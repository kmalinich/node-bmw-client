function apply() {
	return {
		ready : false,
		reset : true,

		lcd : {
			aspect_ratio : null,
			on           : false,
			refresh_rate : 0,
			zoom         : false,

			source_name : null,
			source      : {
				gt   : false,
				navj : false,
				tv   : false,
			},
		},
	};
}


module.exports = {
	apply : apply,
};
