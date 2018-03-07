function apply() {
	return {
		active  : false,
		waiting : {
			ignition : {
				off : false,
				on  : true,
			},
			doors : {
				sealed   : false,
				unsealed : false,
			},
		},
	};
}

module.exports = {
	apply : apply,
};
