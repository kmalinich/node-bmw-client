/* eslint no-console : 0 */

const objfmt = require('object-format');

const Bluez     = require('bluez');
const bluetooth = new Bluez();


function event_log(action, type, properties) {
	console.log('\n====== Event : %s (%s) ======\n', type, action);
	console.log(objfmt(properties));
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
bluetooth.on('Adapter',        async (properties) => { event_log('Added', 'Adapter',        properties); });
bluetooth.on('Filesystem',     async (properties) => { event_log('Added', 'Filesystem',     properties); });
bluetooth.on('MediaControl',   async (properties) => { event_log('Added', 'MediaControl',   properties); });
bluetooth.on('MediaItem',      async (properties) => { event_log('Added', 'MediaItem',      properties); });
bluetooth.on('MediaPlayer',    async (properties) => { event_log('Added', 'MediaPlayer',    properties); });
bluetooth.on('MediaTransport', async (properties) => { event_log('Added', 'MediaTransport', properties); });
bluetooth.on('Network',        async (properties) => { event_log('Added', 'Network',        properties); });

bluetooth.on('Device', async (properties) => {
	event_log('Added', 'Device', properties);

	let device = await bluetooth.getDevice(properties.address);

	if (properties.Connected === false) {
		await device.Connect().catch((err) => {
			console.error('Error while connecting to device ' + properties.address + ': ' + err.message);
		});
		await console.log('Connected to device ' + properties.address);
	}
});


// Initialize bluetooth interface
bluetooth.init().then(async () => {
	console.log('init()');
});
