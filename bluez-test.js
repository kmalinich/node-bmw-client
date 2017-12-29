/* eslint no-console        : 0 */
/* eslint no-unreachable    : 0 */
/* eslint no-useless-return : 0 */

/* global adapter : true */
/* global device  : true */

const objfmt = require('object-format');

const Bluez     = require('bluez');
// const bluetooth = new Bluez({ objectPath : '/org/bluez' });
const bluetooth = new Bluez();

// console.dir(Bluez);

adapter = null;
device  = null;


function event_log(action, type, properties) {
	console.log('\n\n======== Event : %s (%s) ========', type, action);
	console.log(objfmt(properties));
	console.log('======== Event : %s (%s) ========\n\n', type, action);
}


bluetooth.userService.bus.on('InterfacesAdded',   () => { console.log('\n=== BEvent: %s ===\n', 'InterfacesAdded'); });
bluetooth.userService.bus.on('InterfacesRemoved', () => { console.log('\n=== BEvent: %s ===\n', 'InterfacesRemoved'); });
bluetooth.userService.bus.on('PropertiesChanged', () => { console.log('\n=== BEvent: %s ===\n', 'PropertiesChanged'); });
bluetooth.userService.bus.on('request',           () => { console.log('\n=== BEvent: %s ===\n', 'request'); });

// bluetooth.userService.bus.on('signal', (data1, data2, data3, data4, data5, data6, data7) => {
// 	console.log('\n=== BEvent: %s ===', 'signal');
// 	console.dir(data1);
// 	console.dir(data2);
// 	console.dir(data3);
// 	console.dir(data4);
// 	console.dir(data5);
// 	console.dir(data6);
// 	console.dir(data7);
// });


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
bluetooth.on('added-Device',         async (properties) => { event_log('Added', 'Device',         properties); });
bluetooth.on('added-Filesystem',     async (properties) => { event_log('Added', 'Filesystem',     properties); });
bluetooth.on('added-MediaControl',   async (properties) => { event_log('Added', 'MediaControl',   properties); });
bluetooth.on('added-MediaItem',      async (properties) => { event_log('Added', 'MediaItem',      properties); });
bluetooth.on('added-MediaPlayer',    async (properties) => { event_log('Added', 'MediaPlayer',    properties); });
bluetooth.on('added-MediaTransport', async (properties) => { event_log('Added', 'MediaTransport', properties); });
bluetooth.on('added-Network',        async (properties) => { event_log('Added', 'Network',        properties); });

bluetooth.on('added-Device', async (properties) => {
	console.log('\n=== DEvent: %s ===\n', 'Device');
	console.log(objfmt(properties));

	return;
	if (properties.Name !== 'kdm-cell') return;

	// adapter.StopDiscovery();

	// console.log('Found device \'%s\', MAC %s\n', properties.Name, properties.address);
	// console.log(objfmt(properties));

	device = await bluetooth.getDevice(properties.address);

	// await console.dir(device, {colors:true,depth:null,showHidden:false});

	if (properties.Connected === false) {
		await device.Connect().catch((err) => {
			console.error('Error while connecting to device ' + properties.address + ': ' + err.message);
		});
		await console.log('Connected to device ' + properties.address);
	}

	// Connect to AVRCP
	// console.log('AVRCP UUID : %s\n', Bluez.AVRCProfile.uuid);
	// await device._interface.ConnectProfile(Bluez.AVRCProfile.uuid)
	// 	.then(() => {
	// 		console.log('\nConnected AVRCP on device %s\n', properties.address);
	// 	})
	// 	.catch((err) => {
	// 		console.error('Error while connecting AVRCP to device ' + properties.address + ': ' + err.message);
	// 	});

	// await console.log('\nConnected AVRCP on device %s\n', properties.address);

	// await console.log('      RSSI : %s\n', device.RSSI());
	// await device.on('InterfacesAdded', () =>   { console.log('\n=== DEvent: %s ===\n', 'InterfacesAdded'); });
});

// Initialize bluetooth interface
bluetooth.init().then(async () => {
	console.log('init()');

	// Register Agent that accepts everything and uses key 1234
	// await bluetooth.registerDefaultAgent();
	// console.log('\nAgent registered\n');

	// Register AVRCP
	// await bluetooth.registerAVRCProfile(async (device, socket) => {
	// 	console.log('\nAVRCP connection\n');
	// 	const name = await device.Name();
	// 	console.log('\nAVRCP connection from %s\n', name);

	// 	// socket is a non blocking duplex stream similar to net.Socket

	// 	// Print everything
	// 	socket.pipe(process.stdout);
	// 	// socket.on('data', (data) => process.stdout.write(data));

	// 	socket.on('error', console.error);
	// });
	// await console.log('\nAVRCP registered\n');

	// Listen on first bluetooth adapter
	adapter = await bluetooth.getAdapter('hci0');

	// await adapter.StartDiscovery();
	// console.log('Discovering');
	// console.log('');
});
