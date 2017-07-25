const object_path   = require('object-path');

const config_transform = {
	engine : {
		rpm : (input) => {
			return Math.round(input);
		},
	},
};

// update('system.host_data.refresh_interval', 15000);
function update_config(key, value_new) {
	let value_old = object_path.get(config, key);

	if (value_new === value_old) {
		return false;
	}

	let path_array = key.split('.');
	// let path_depth = path_array.length;

	log.change({
		src   : module_name,
		value : key,
		old   : value_old,
		new   : value_new,
	});

	object_path.set(config, key, value_new);
	socket.status_tx(path_array[0]);

	return true;
}

// update('engine.rpm', 1235);
function update_status(key, value_new) {
	let value_old = object_path.get(status, key);

	if (value_new === value_old) {
		return false;
	}

	let path_array = key.split('.');
	// let path_depth = path_array.length;

	log.change({
		src   : module_name,
		value : key,
		old   : value_old,
		new   : value_new,
	});

	object_path.set(status, key, value_new);
	socket.status_tx(path_array[0]);

	return true;
}

module.exports = {
	transform : config_transform,

	config : (key, value_new) => { update_config(key, value_new); },
	status : (key, value_new) => { update_status(key, value_new); },
};



