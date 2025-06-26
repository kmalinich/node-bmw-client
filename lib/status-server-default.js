function apply() {
	return {
		sockets : {
			can0 : {
				connected    : false,
				connecting   : false,
				reconnecting : false,
			},
			can1 : {
				connected    : false,
				connecting   : false,
				reconnecting : false,
			},
			dbus : {
				connected    : false,
				connecting   : false,
				reconnecting : false,
			},
			ibus : {
				connected    : false,
				connecting   : false,
				reconnecting : false,
			},
			kbus : {
				connected    : false,
				connecting   : false,
				reconnecting : false,
			},
		},

		interfaces : {
			can0 : false,
			can1 : false,
			dbus : false,
			ibus : false,
			kbus : false,
		},
	};
}


module.exports = {
	apply,
};
