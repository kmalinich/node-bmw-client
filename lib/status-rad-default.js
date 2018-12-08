function apply() {
	return {
		ready : false,
		reset : true,

		dsp0 : 0,
		dsp1 : 0,

		balance : 0,
		fader   : 0,

		bass   : 0,
		treble : 0,

		source      : 0,
		source_name : 'off',
	};
}


module.exports = {
	apply : apply,
};
