module.exports = {
	// Convert hex to ascii
	hex2a : (hexx) => {
		var hex = hexx.toString();
		var str = '';
		for (var i = 0; i < hex.length; i += 2)
			str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
		return str;
	},
};
