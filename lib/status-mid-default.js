function apply() {
	let status_text = {
		left  : 'Node.js',
		right : process.version,
	};

	if (typeof status === 'object') {
		if (typeof status.mid === 'object') {
			if (typeof status.mid.text === 'object') {
				if (typeof status.mid.text.left  === 'string') status_text.left  = status.mid.text.left;
				if (typeof status.mid.text.right === 'string') status_text.right = status.mid.text.right;
			}
		}
	}

	return {
		ready : false,
		reset : true,

		text : status_text,

		menu : {
			button_1  : 'Pair',
			button_2  : 'Unpa',
			button_3  : 'Conn',
			button_4  : 'Dscn',
			button_5  : 'Back',
			button_6  : 'Next',
			button_7  : 'Paus',
			button_8  : 'Play',
			button_9  : 'Rpt',
			button_10 : 'Shf',
			button_11 : 'AL-',
			button_12 : 'AL+',
		},
	};
}


module.exports = {
	apply : apply,
};
