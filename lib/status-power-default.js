function apply() {
	return {
		active : false,

		waiting : {
			doors : {
				sealed   : false,
				unsealed : false,
			},

			ignition : {
				off : false,
				on  : true,
			},
		},
	};
}


export default {
	apply,
};
