function apply() {
	return {
		text_left : app_name,
		text_right : status.system.host.short,
		menu : {
			button_1 : 'Pair',
			button_2 : 'Unpa',
			button_3 : 'Conn',
			button_4 : 'Dscn',
			button_5 : 'Back',
			button_6 : 'Next',
			button_7 : 'Paus',
			button_8 : 'Play',
			button_9 : 'Rpt',
			button_10 : 'Shf',
			button_11 : 'AL-',
			button_12 : 'AL+',
		},
	};
}

module.exports = {
	apply : () => { apply(); },
};
