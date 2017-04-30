var module_name = __filename.slice(__dirname.length + 1, -3);

// Convert hex to string
function h2s(data) {
	console.log('DATA IN: \'%s\'', data);
	data = Buffer.from(data);

	// if (data[data.length] === 0x04) data = data.slice(4);
	if (data[0] === 0x23) data = data.slice(1);
	if (data[0] === 0x24) data = data.slice(1);
	if (data[0] === 0x0E) data = data.slice(1);

	data = data.toString();
	data = data.replace(/�/g, '°');

	if (data[data.length] === 0x04) data = data.slice(0, -1);

	data = data.trim();
	console.log('DATA OUT: \'%s\'', data);
	return data;
}

module.exports = {
	h2a : (data) => { h2a(data); },
};
