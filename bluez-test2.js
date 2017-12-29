/* eslint no-console        : 0 */
/* eslint no-unreachable    : 0 */
/* eslint no-useless-return : 0 */

const objfmt = require('object-format');

const Bluez     = require('bluez');
const bluetooth = new Bluez();


bluetooth.on('Adapter', async (props) => {
	console.log('\n=== Event: %s ===\n', 'added-Adapter');
	console.log(objfmt(props));
});

bluetooth.on('Device', async (props) => {
	console.log('\n=== DEvent: %s ===\n', 'added-Device');
	console.log(objfmt(props));
});

bluetooth.on('Filesystem', async (props) => {
	console.log('\n=== Event: %s ===\n', 'added-Filesystem');
	console.log(objfmt(props));
});

bluetooth.on('MediaControl', async (props) => {
	console.log('\n=== Event: %s ===\n', 'added-MediaControl');
	console.log(objfmt(props));
});

bluetooth.on('MediaItem', async (props) => {
	console.log('\n=== Event: %s ===\n', 'added-MediaItem');
	console.log(objfmt(props));
});

bluetooth.on('MediaPlayer', async (props) => {
	console.log('\n=== Event: %s ===\n', 'added-MediaPlayer');
	console.log(objfmt(props));
});

bluetooth.on('MediaTransport', async (props) => {
	console.log('\n=== Event: %s ===\n', 'added-MediaTransport');
	console.log(objfmt(props));
});

bluetooth.on('Network', async (props) => {
	console.log('\n=== Event: %s ===\n', 'added-Network');
	console.log(objfmt(props));
});


bluetooth.on('changed-Adapter', async (props) => {
	console.log('\n=== Event: %s ===\n', 'changed-Adapter');
	console.log(objfmt(props));
});

bluetooth.on('changed-Device', async (props) => {
	console.log('\n=== DEvent: %s ===\n', 'changed-Device');
	console.log(objfmt(props));
});

bluetooth.on('changed-Filesystem', async (props) => {
	console.log('\n=== Event: %s ===\n', 'changed-Filesystem');
	console.log(objfmt(props));
});

bluetooth.on('changed-MediaControl', async (props) => {
	console.log('\n=== Event: %s ===\n', 'changed-MediaControl');
	console.log(objfmt(props));
});

bluetooth.on('changed-MediaItem', async (props) => {
	console.log('\n=== Event: %s ===\n', 'changed-MediaItem');
	console.log(objfmt(props));
});

bluetooth.on('changed-MediaPlayer', async (props) => {
	console.log('\n=== Event: %s ===\n', 'changed-MediaPlayer');
	console.log(objfmt(props));
});

bluetooth.on('changed-MediaTransport', async (props) => {
	console.log('\n=== Event: %s ===\n', 'changed-MediaTransport');
	console.log(objfmt(props));
});

bluetooth.on('changed-Network', async (props) => {
	console.log('\n=== Event: %s ===\n', 'changed-Network');
	console.log(objfmt(props));
});


// Initialize bluetooth interface
bluetooth.init().then(async () => {
	console.log('init()');
});
