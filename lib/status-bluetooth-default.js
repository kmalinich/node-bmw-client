const os = require('os');


function getBtDeviceMac() {
	// Bounce if bluetooth disabled or wrong platform
	if (config?.media?.bluetooth?.enable !== true || os.platform() !== 'linux') return null;

	if (config?.media?.bluetooth?.device_mac === null) return null;

	const btDeviceMac = config?.media?.bluetooth?.device_mac;

	return btDeviceMac;
}

function getInterfaces() {
	// Bounce if bluetooth disabled or wrong platform
	if (config?.media?.bluetooth?.enable !== true || os.platform() !== 'linux') return {};

	const btDeviceMac = getBtDeviceMac();

	if (btDeviceMac === null) return {};

	return {
		device : `/org/bluez/hci0/dev_${btDeviceMac.replace(/:/g, '_')}`,
		player : `/org/bluez/hci0/dev_${btDeviceMac.replace(/:/g, '_')}/avrcp/player0`,
	};
}

function apply() {
	return {
		device : {
			adapter           : '/org/bluez/hci0',
			address           : getBtDeviceMac(),
			addresstype       : 'public',
			alias             : null,
			batterypercentage : null,
			blocked           : false,
			bonded            : false,
			cablepairing      : false,
			class             : null,
			connectable       : null,
			connected         : false,
			connecting        : false,
			disconnecting     : false,
			icon              : 'phone',
			legacypairing     : null,
			modalias          : null,
			modalias          : null,
			name              : null,
			paired            : false,
			player            : null,
			position          : 0,
			rssi              : 0,
			service           : 'org.bluez',
			servicesresolved  : false,
			status            : null,
			track             : 0,
			trusted           : false,
			type              : null,
		},

		interfaces : getInterfaces(),

		player : {
			album          : null,
			artist         : null,
			browsable      : null,
			duration       : null,
			equalizer      : null,
			genre          : null,
			item           : null,
			name           : null,
			numberoftracks : null,
			playlist       : null,
			position       : null,
			repeat         : null,
			shuffle        : null,
			status         : null,
			subtype        : null,
			title          : null,
			tracknumber    : null,
			type           : null,
		},
	};
}


module.exports = {
	apply,
};
