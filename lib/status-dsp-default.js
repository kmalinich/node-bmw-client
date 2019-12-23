function apply() {
	return {
		ready : false,
		reset : true,

		echo      : 0,
		m_audio   : false,
		mode      : null,
		room_size : 0,

		eq : [ 0, 0, 0, 0, 0, 0, 0 ],
	};
}


module.exports = {
	apply,
};
