module.exports = {
	// Bitmasks in hex and dec
	bit     : [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0xFF],
	bit_dec : [   1,    2,    4,    8,   16,   32,   64,  128,  255],

	// Test number for bitmask
	bit_test : (num, bit) => {
		if ((num & bit) !== 0) {
			return true;
		}
		return false;
	},

	// Set a bit in a bitmask
	bit_set : (num, bit) => {
		num |= bit;
		return num;
	},
};

