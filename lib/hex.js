var module_name = __filename.slice(__dirname.length + 1, -3);

// ASCII to hex for IKE/MID message
function a2h(str) {
	var array = [];

	for (var n = 0, l = str.length; n < l; n ++) {
		var hex = str.charCodeAt(n);
		array.push(hex);
	}

	return array;
}

// Convert hex to ASCII
function h2a(data) {
	data    = data.toString();
	var str = '';

	for (var i = 0; i < data.length; i += 2)
		str += String.fromCharCode(parseInt(data.substr(i, 2), 16));

	return str;
}

// Convert hex to string
function h2s(data) {
	data = Buffer.from(data);

	// IKE text, BMBT/MID/GT menu text
	if (data[0] === 0x23) data = data.slice(4);
	if (data[0] === 0x24) data = data.slice(3);

	// Cleanup
	if (data[0] === 0x06) data = data.slice(1);
	if (data[0] === 0x50) data = data.slice(1);
	if (data[0] === 0x0E) data = data.slice(1);
	if (data[0] === 0x00) data = data.slice(1);

	// IKE text suffix
	if (data[data.length-1] === 0x04) data = data.slice(0, -1);

	// Format
	data = data.toString();
	data = data.replace(/�/g, '°');
	data = data.replace(/\ \ /g, ' ');

	data = data.trim();
	return data;
}

// Convert integer to hex string
function i2s(data) {
	let hexstr = data.toString(16).toUpperCase();
	let prefix = hexstr.length === 1 && '0x0' || '0x';
	return prefix+hexstr;
}

module.exports = {
	a2h : (data) => { return a2h(data); },
	h2a : (data) => { return h2a(data); },
	h2s : (data) => { return h2s(data); },
	i2s : (data) => { return i2s(data); },
};
