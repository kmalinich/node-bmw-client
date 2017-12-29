/* eslint no-console : 0 */

const objfmt = require('object-format');

const Bluez     = require('bluez');
const bluetooth = new Bluez();


function event_log(action, type, properties) {
	console.log('\n======== Event : %s (%s) ========', type, action);
	console.log(objfmt(properties));
	console.log('======== Event : %s (%s) ========\n', type, action);
}

// Register callbacks for changed properties
bluetooth.on('changed-Adapter',        async (properties) => { event_log('Changed', 'Adapter',        properties); });
bluetooth.on('changed-Device',         async (properties) => { event_log('Changed', 'Device',         properties); });
bluetooth.on('changed-Filesystem',     async (properties) => { event_log('Changed', 'Filesystem',     properties); });
bluetooth.on('changed-MediaControl',   async (properties) => { event_log('Changed', 'MediaControl',   properties); });
bluetooth.on('changed-MediaItem',      async (properties) => { event_log('Changed', 'MediaItem',      properties); });
bluetooth.on('changed-MediaPlayer',    async (properties) => { event_log('Changed', 'MediaPlayer',    properties); });
bluetooth.on('changed-MediaTransport', async (properties) => { event_log('Changed', 'MediaTransport', properties); });
bluetooth.on('changed-Network',        async (properties) => { event_log('Changed', 'Network',        properties); });

// Register callbacks for new interfaces
bluetooth.on('added-Adapter',        async (properties) => { event_log('Added', 'Adapter',        properties); });
bluetooth.on('added-Filesystem',     async (properties) => { event_log('Added', 'Filesystem',     properties); });
bluetooth.on('added-MediaControl',   async (properties) => { event_log('Added', 'MediaControl',   properties); });
bluetooth.on('added-MediaItem',      async (properties) => { event_log('Added', 'MediaItem',      properties); });
bluetooth.on('added-MediaPlayer',    async (properties) => { event_log('Added', 'MediaPlayer',    properties); });
bluetooth.on('added-MediaTransport', async (properties) => { event_log('Added', 'MediaTransport', properties); });
bluetooth.on('added-Network',        async (properties) => { event_log('Added', 'Network',        properties); });

bluetooth.on('added-Device', async (properties) => {
	event_log('Added', 'Device', properties);

	event_log('DeviceInterface', 'Log', 'Attempting to get interface of device with address ' + properties.Address);
	let device = await bluetooth.getDevice(properties.Address);

	if (properties.Connected === false) {
		event_log('DeviceConnect', 'Log', 'Attempting to connect to device with address ' + properties.Address);

		await device.Connect().catch((err) => {
			event_log('DeviceConnect', 'Error', 'Error while attempting to connect to device with address ' + properties.Address + ': ' + err.message);
		});
	}
});


// Initialize bluetooth interface
bluetooth.init().then(async () => {
	event_log('Init', 'Log', 'bluetooth.init()');
});
