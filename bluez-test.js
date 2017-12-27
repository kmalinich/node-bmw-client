const objfmt = require('object-format');

const Bluez     = require('bluez');
// const bluetooth = new Bluez({ objectPath : '/org/bluez' });
const bluetooth = new Bluez();

// console.dir(Bluez);

const BT = {
	adapter : null,
	device  : null,
};

bluetooth.userService.bus.on('InterfacesAdded', () =>   { console.log('\n=== BEvent: %s ===\n', 'InterfacesAdded'); });
bluetooth.userService.bus.on('InterfacesRemoved', () => { console.log('\n=== BEvent: %s ===\n', 'InterfacesRemoved'); });
bluetooth.userService.bus.on('PropertiesChanged', () => { console.log('\n=== BEvent: %s ===\n', 'PropertiesChanged'); });
bluetooth.userService.bus.on('request', () =>           { console.log('\n=== BEvent: %s ===\n', 'request'); });

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


// Register callback for new players
bluetooth.on('Filesystem', async (props) => {
	console.log('\n=== Event: %s ===\n', 'Filesystem');
	console.log(objfmt(props));
});
bluetooth.on('MediaPlayer', async (props) => {
	console.log('\n=== Event: %s ===\n', 'MediaPlayer');
	console.log(objfmt(props));
});
bluetooth.on('MediaTransport', async (props) => {
	console.log('\n=== Event: %s ===\n', 'MediaTransport');
	console.log(objfmt(props));
});
bluetooth.on('MediaControl', async (props) => {
	console.log('\n=== Event: %s ===\n', 'MediaControl');
	console.log(objfmt(props));
});
bluetooth.on('MediaItem', async (props) => {
	console.log('\n=== Event: %s ===\n', 'MediaItem');
	console.log(objfmt(props));
});
bluetooth.on('Network', async (props) => {
	console.log('\n=== Event: %s ===\n', 'Network');
	console.log(objfmt(props));
});
bluetooth.on('Adapter', async (props) => {
	console.log('\n=== Event: %s ===\n', 'Adapter');
	console.log(objfmt(props));
});

// Register callback for new devices
bluetooth.on('Device', async (props) => {
	console.log('\n=== DEvent: %s ===\n', 'Device');
	console.log(objfmt(props));

	return;
	if (props.Name !== 'kdm-cell') return;

	// BT.adapter.StopDiscovery();

	// console.log('Found device \'%s\', MAC %s\n', props.Name, props.address);
	// console.log(objfmt(props));

	BT.device = await bluetooth.getDevice(props.address);

	// await console.dir(BT.device, {colors:true,depth:null,showHidden:false});

	if (props.Connected === false) {
		await BT.device.Connect().catch((err) => {
			console.error('Error while connecting to device ' + props.address + ': ' + err.message);
		});
		await console.log('Connected to device ' + props.address);
	}

	// Connect to AVRCP
	// console.log('AVRCP UUID : %s\n', Bluez.AVRCProfile.uuid);
	// await BT.device._interface.ConnectProfile(Bluez.AVRCProfile.uuid)
	// 	.then(() => {
	// 		console.log('\nConnected AVRCP on device %s\n', props.address);
	// 	})
	// 	.catch((err) => {
	// 		console.error('Error while connecting AVRCP to device ' + props.address + ': ' + err.message);
	// 	});

	// await console.log('\nConnected AVRCP on device %s\n', props.address);

	// await console.log('      RSSI : %s\n', BT.device.RSSI());
	// await BT.device.on('InterfacesAdded', () =>   { console.log('\n=== DEvent: %s ===\n', 'InterfacesAdded'); });
});

// Initialize bluetooth interface
bluetooth.init().then(async () => {
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

	// listen on first bluetooth adapter
	// BT.adapter = await bluetooth.getAdapter('hci0');

	// await BT.adapter.StartDiscovery();
	// console.log('Discovering');
	// console.log('');
});
