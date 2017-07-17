const config_data = {
	engine : {
		rpm : 1247,
	},
};

const config_transform = {
	engine : {
		rpm : (input) => {
			return Math.round(input);
		},
	},
};


function update(key, value) {
}


module.exports = {
	data      : config_data,
	transform : config_transform,

	update : (key, value) => { update(key, value); },
};
