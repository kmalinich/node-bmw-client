const module_name = __filename.slice(__dirname.length + 1, -3);

app_path = __dirname;
app_name = 'bmwcd';
app_type = 'client';

const input = require('input').input;
// const input = require('input-short').input;
// const input = require('input-329').input;
// console.log(input);


// npm libraries
convert = require('node-unit-conversion');
moment  = require('moment');
now     = require('performance-now');
os      = require('os');
pad     = require('pad');
suncalc = require('suncalc');

// node-bmw libraries
bitmask      = require('bitmask');
bus_arbids   = require('bus-arbids');
bus_commands = require('bus-commands');
bus_modules  = require('bus-modules');
hex          = require('hex');
log          = require('log-output');
obc_values   = require('obc-values');
socket       = require('socket');
object_format       = require('object-format');

ASC1 = require('ASC1');
DME1 = require('DME1');

function hex_f(val) {
	let prefix;
	let suffix = val.toString(16).toUpperCase();

	switch (suffix.length) {
		case 1  : prefix = '0x0'; break;
		default : prefix = '0x'; break;
	}

	return prefix+suffix;
}


input.forEach((message) => {
	// console.log(message);

	let src_id = message.shift();

	let data = {
		bus : 'can0',
		src : {
			id : src_id,
			id_f : hex_f(src_id),
			name : null,
		},
		msg_f : [
			hex_f(message[0]),
			hex_f(message[1]),
			hex_f(message[2]),
			hex_f(message[3]),
			hex_f(message[4]),
			hex_f(message[5]),
			hex_f(message[6]),
			hex_f(message[7]),
		],
		msg : Buffer.from(message),
		// msg : message,
	};

	data.src.name = bus_arbids.h2n(src_id);

	// console.log(JSON.stringify(data.src, null, 2));
	// console.log(data);

	switch (data.src.name) {
		// case 'ASC1' : ASC1.parse_out(data); break;
		case 'DME1' : DME1.parse_out(data); break;
	}

	// console.log('');
});

