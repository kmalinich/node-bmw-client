const module_name = __filename.slice(__dirname.length + 1, -3);


// Parse data sent from module
function parse_out(data) {
	if (data.dst === null || typeof data.dst === 'undefined') {
		data.dst = {
			id   : 0x56,
			name : module_name,
		};
	}

	if (data.msg === null || typeof data.msg === 'undefined') {
		data.msg = [ 0xFF ];
	}

	return data;
}


module.exports = {
	parse_out : parse_out,
};
