const values = {
	'arrival'          : 0x08,
	'aux-heating-off'  : 0x11,
	'aux-heating-on'   : 0x12,
	'aux-vent-off'     : 0x13,
	'aux-vent-on'      : 0x14,
	'auxheatvent'      : 0x1B,
	'average-speed'    : 0x0A,
	'checkcontrol'     : 0x24,
	'cluster'          : 0x50,
	'code'             : 0x0D,
	'consumption-1'    : 0x04,
	'consumption-2'    : 0x05,
	'date'             : 0x02,
	'display'          : 0x40,
	'distance'         : 0x07,
	'emergency-disarm' : 0x16,
	'end-stellmode'    : 0x15,
	'interim'          : 0x1A,
	'limit'            : 0x09,
	'memo'             : 0x0C,
	'outside-temp'     : 0x03,
	'phone'            : 0x00,
	'radio'            : 0x62,
	'range'            : 0x06,
	'stopwatch'        : 0x0E,
	'test-mode'        : 0x1F,
	'time'             : 0x01,
	'timer-1'          : 0x0F,
	'timer-2'          : 0x10,
};

module.exports = {
	values : values,

	// 0x0E -> stopwatch
	h2n : (hex) => {
		for (let name in values) {
			if (values[name] === hex) {
				return name;
			}
		}
		// Didn't find it
		return 'unk';
	},

	// stopwatch -> 0x0E
	n2h : (name) => {
		if (typeof values[name] !== 'undefined' && values[name]) {
			return values[name];
		}
		// Didn't find it
		return 0x00;
	},
};
