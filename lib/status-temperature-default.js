function apply() {
	let temp_obj = {
		c : 0,
		f : 0,
	};

	let temp_obj_exterior = {
		c : 0,
		f : 0,

		obc : temp_obj,
	};

	return {
		coolant  : temp_obj,
		exhaust  : temp_obj,
		exterior : temp_obj_exterior,
		intake   : temp_obj,
		oil      : temp_obj,
	};
}


module.exports = {
	apply : apply,
};
