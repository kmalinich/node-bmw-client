/* eslint no-console : 0 */

const objfmt = require('object-format');

const Bluez     = require('bluez');
const bluetooth = new Bluez();


function event_log(action, type, data) {
	console.log('\n======== Event : %s (%s) ========', type, action);
	console.log(objfmt(data));
	console.log('======== Event : %s (%s) ========\n', type, action);
}

// Register callbacks for changed properties
bluetooth.on('changed-Adapter',        async (data) => { event_log('Changed', 'Adapter',        data); });
bluetooth.on('changed-Device',         async (data) => { event_log('Changed', 'Device',         data); });
bluetooth.on('changed-Filesystem',     async (data) => { event_log('Changed', 'Filesystem',     data); });
bluetooth.on('changed-MediaControl',   async (data) => { event_log('Changed', 'MediaControl',   data); });
bluetooth.on('changed-MediaItem',      async (data) => { event_log('Changed', 'MediaItem',      data); });
bluetooth.on('changed-MediaPlayer',    async (data) => { event_log('Changed', 'MediaPlayer',    data); });
bluetooth.on('changed-MediaTransport', async (data) => { event_log('Changed', 'MediaTransport', data); });
bluetooth.on('changed-Network',        async (data) => { event_log('Changed', 'Network',        data); });

// Register callbacks for new interfaces
bluetooth.on('added-Filesystem',   async (data) => { event_log('Added', 'Filesystem',   data); });
bluetooth.on('added-MediaControl', async (data) => { event_log('Added', 'MediaControl', data); });
bluetooth.on('added-MediaItem',    async (data) => { event_log('Added', 'MediaItem',    data); console.dir(bluetooth.items); });
bluetooth.on('added-Network',      async (data) => { event_log('Added', 'Network',      data); });


bluetooth.on('added-Adapter', async (data) => {
	event_log('Added', 'Adapter', data);

	event_log('AdapterInterface', 'Log', 'Attempting to get interface of adapter with path ' + data.object);
	let adapter = await bluetooth.getAdapter(data.object);

	let adapter_properties = await adapter.getProperties();
	await event_log('AdapterProperties', 'Log', adapter_properties);

	await adapter.Pairable(true);
	await adapter.Discoverable(true);

	// Register Agent that accepts everything and uses key 1234
	await bluetooth.registerDefaultAgent();
	await event_log('Agent', 'Log', 'Registered default agent');

	adapter_properties = await adapter.getProperties();
	await event_log('AdapterProperties', 'Log', adapter_properties);
});


bluetooth.on('added-Device', async (data) => {
	event_log('Added', 'Device', data);

	event_log('DeviceInterface', 'Log', 'Attempting to get Device interface with address ' + data.properties.Address);
	let device = await bluetooth.getDevice(data.properties.Address);

	if (data.properties.Trusted === false) {
		await device.Trusted(true);
	}

	let device_properties = await device.getProperties();
	await event_log('DeviceProperties', 'Log', device_properties);

	// if (data.properties.Connected === false) {
	// 	event_log('DeviceConnect', 'Log', 'Attempting to connect to device with address ' + data.properties.Address);

	// 	await device.Connect().catch((err) => {
	// 		event_log('DeviceConnect', 'Error', 'Error while attempting to connect to device with address ' + data.properties.Address + ': ' + err.message);
	// 	});
	// }

	if (data.properties.Connected === true) {
		event_log('DeviceConnectProfile', 'Log', 'Attempting to connect MAS profile on device with address ' + data.properties.Address);
		await device.ConnectProfile('00001132-0000-1000-8000-00805f9b34fb').catch((err) => {
			event_log('DeviceConnectProfile', 'Error', 'Error while attempting to connect MAS profile on device with address ' + data.properties.Address + ': ' + err.message);
		});
	}
});


bluetooth.on('added-MediaPlayer', async (data) => {
	event_log('Added', 'MediaPlayer', data);

	event_log('MediaPlayerInterface', 'Log', 'Attempting to get MediaPlayer interface with path ' + data.object);
	let MediaPlayer = await bluetooth.getMediaPlayer(data.object);

	let MediaPlayer_properties = await MediaPlayer.getProperties();
	await event_log('MediaPlayerProperties', 'Log', MediaPlayer_properties);

	setTimeout(async () => {
		await MediaPlayer.Pause();
	}, 1500);

	setTimeout(async () => {
		await MediaPlayer.Play();
	}, 3000);
});


bluetooth.on('added-MediaTransport', async (data) => {
	event_log('Added', 'MediaTransport', data);

	event_log('MediaTransportInterface', 'Log', 'Attempting to get MediaTransport interface with path ' + data.object);
	let MediaTransport = await bluetooth.getMediaTransport(data.object);

	let MediaTransport_properties = await MediaTransport.getProperties();
	await event_log('MediaTransportProperties', 'Log', MediaTransport_properties);

	setTimeout(async () => {
		await MediaTransport.Volume(127);
	}, 4500);
});


// Initialize bluetooth interface
bluetooth.init().then(async () => {
	event_log('Init', 'Log', 'bluetooth.init()');
});
