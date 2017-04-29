var module_name = __filename.slice(__dirname.length + 1, -3);

// Convert hex to ascii
function hex2a(data) {
	data = Buffer.from(data);
	data = data.slice(4);
	data = data.toString();
	data = data.replace(/�/g, '°');
	data = data.slice(0, -1);
	return data;
}

module.exports = {
	hex2a : (data) => { hex2a(data); },
};
