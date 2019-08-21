function apply() {
	return {
		ready : false,
		reset : true,

		button : {
			active : {
				backrest : {
					driver : {
						state : null,
					},

					passenger : {
						state : null,
					},
				},

				seat : {
					driver : {
						state : null,
					},

					passenger : {
						state : null,
					},
				},
			},

			pdc : {
				state : null,
			},

			rdc : {
				state : null,
			},
		},

		seats : {
			front : {
				driver : {
					active      : null,
					heating     : null,
					ventilation : null,
				},

				passenger : {
					active      : null,
					heating     : null,
					ventilation : null,
				},
			},

			rear : {
				driver : {
					active      : null,
					heating     : null,
					ventilation : null,
				},

				passenger : {
					active      : null,
					heating     : null,
					ventilation : null,
				},
			},
		},
	};
}


module.exports = {
	apply : apply,
};
