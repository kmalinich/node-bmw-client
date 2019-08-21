function apply() {
	return {
		intf : 'client',
		type : 'client',

		up : 0,

		temperature : 0,

		cpu : {
			arch  : null,
			count : 0,

			load     : [ 0, 0, 0 ],
			load_pct : 0,

			model : null,
			speed : 0,
		},

		host : {
			full  : null,
			short : null,
		},

		memory : {
			free     : 0,
			free_pct : 0,

			total : 0,
		},

		os : {
			platform : null,
			release  : null,
			type     : null,
		},
	};
}


module.exports = {
	apply : apply,
};
