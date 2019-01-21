function apply() {
	return {
		ready : false,
		reset : true,

		echo      : null,
		m_audio   : null,
		mode      : null,
		room_size : null,

		eq : {
			band0 : null,
			band1 : null,
			band2 : null,
			band3 : null,
			band4 : null,
			band5 : null,
			band6 : null,
		},
	};
}


module.exports = {
	apply : apply,
};
