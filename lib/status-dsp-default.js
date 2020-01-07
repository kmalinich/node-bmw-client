function apply() {
	return {
		ready : false,
		reset : true,

		m_audio : false,
		mode    : null,

		eq : {
			band      : [ 0, 0, 0, 0, 0, 0, 0 ],
			echo      : 0,
			room_size : 0,
		},
	};
}


module.exports = {
	apply,
};
