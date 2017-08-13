/* eslint no-console:0     */
/* eslint no-undef:0       */
/* eslint no-unused-vars:0 */

const amp    = require('amp-message');
const zeromq = require('zeromq');


// Return zeroMQ socket type from config data
function get_type() {
	let type = app_type == 'client' && 'router' || 'dealer';
	log.msg({ msg : 'get_type: \''+type+'\'' });
	return type;
}

// Return full zeroMQ URL from config data
function get_url(socket_intf) {
	let zmq_conf = config.zeromq;
	return zmq_conf.proto+'://*:4001';
}


// Send data over zeroMQ
function send(event, data) {
	// Don't bother sending anything if we're disconnected
	if (status.server.connected === false) {
		log.msg({ msg : 'Server disconnected, cannot send message' });
		return;
	}

	if (event !== 'bus-tx') return;

	let dst = data.bus;

	let message = {
		host  : status.system,
		event : event,
		data  : data,
	};

	// Encode object as AMP message
	let amp_message = new amp;
	amp_message.push(message);

	// Send AMP message over zeroMQ
	socket.intf.send([ dst, app_type+'-tx', amp_message.toBuffer() ]);
}

// Handle incoming messages
function recv(message) {
	// Decode AMP-encoded messages from zeroMQ
	let data = new amp(message).shift();
	// console.dir(message, { showHidden: false, depth: null, colors: true});
	// console.dir(data, { showHidden: false, depth: null, colors: true});

	switch (data.event) {
		case 'bus-rx'            : bus.data.receive(data.data.bus); break;


		case 'host-data-request' : host_data.send();                break;
		case 'status-request'    : socket.status_tx(data.data);     break;
	}
}


// Configure event handlers
function event_config(pass, fail) {
	let socket_intf = 'client';


	socket.intf.on('accept', () => {
		log.msg({ msg : 'accept' });
	});

	socket.intf.on('accept_error', (error) => {
		log.msg({ msg : 'accept error '+error });
		// console.error(error);
	});


	socket.intf.on('bind', () => {
		log.msg({ msg : 'bind' });
		update.status('server.connected', true);

		update.status('server.connecting',   false);
		update.status('server.reconnecting', false);

		// Send this host's data to zeroMQ clients to update them
		host_data.send();

		// Refresh all data on first connect if enabled
		// This should ACTUALLY be more event-driven and reside in modules/IKE.js
		setTimeout(() => {
			switch (config.options.obc_refresh_on_start) {
				case true : IKE.obc_refresh(); break;
				default   : IKE.request('ignition');
			}
		}, 250);
	});

	socket.intf.on('bind_error', (error) => {
		log.msg({ msg : 'bind error '+error });
		// console.error(error);
	});


	socket.intf.on('close', () => {
		log.msg({ msg : 'close' });
	});

	socket.intf.on('close_error', (error) => {
		log.msg({ msg : 'close error '+error });
		// console.error(error);
	});


	socket.intf.on('connect', () => {
		log.msg({ msg : 'connect' });
		update.status('server.connected',    true);
		update.status('server.connecting',   false);
		update.status('server.reconnecting', false);

		// Send this host's data to zeroMQ clients to update them
		host_data.send();
	});

	socket.intf.on('connect_delay', () => {
		log.msg({ msg : 'connect_delay' });
		update.status('server.connected',    false);
		update.status('server.connecting',   true);
		update.status('server.reconnecting', true);
	});

	socket.intf.on('connect_retry', () => {
		log.msg({ msg : 'connect_retry' });
		update.status('server.connected',    false);
		update.status('server.connecting',   true);
		update.status('server.reconnecting', true);
	});


	socket.intf.on('disconnect', () => {
		log.msg({ msg : 'disconnect' });
	});


	socket.intf.on('error', (error) => {
		log.msg({ msg : 'error '+error });
		console.error(error);
	});


	socket.intf.on('error', (error) => {
		log.msg({ msg : 'error '+error });
		// console.error(error);
	});


	socket.intf.on('listen', () => {
		log.msg({ msg : 'listen' });
	});


	socket.intf.on('monitor_error', (error) => {
		log.msg({ msg : 'monitor_error '+error });
		// console.error(error);
	});


	socket.intf.on('unbind', () => {
		log.msg({ msg : 'unbind' });
		update.status('server.connected', false);

		// Reset basic vars
		json.status_reset_basic();
	});


	socket.intf.on('message', (identity, topic, message) => {
		log.msg({ msg : topic+' message received' });
		// Decode AMP message
		recv(message);
	});

	// Enable monitor to utilize events
	socket.intf.monitor();

	log.msg({ msg : 'Initialized event listeners' });

	// Configure interfaces
	process.nextTick(() => {
		intf_config(pass, fail);
		log.msg({ msg : 'Initialized' });
	});
}

// Bind interface
function intf_config(pass, fail) {
	let socket_intf = 'client';

	socket.intf.identity = app_type;
	log.msg({ msg : 'Set '+get_type(app_type)+' identity: \''+app_type+'\'' });

	log.msg({ msg : 'Binding interface: \''+socket_intf+'\'' });
	socket.intf.bind(get_url(socket_intf));
	// console.dir(socket.intf, { showHidden: true, depth: null, colors: true});

	process.nextTick(pass);
}


// Initialize zeroMQ server
function init(pass, fail) {
	log.msg({ msg : 'Initializing' });

	// Setup events
	process.nextTick(() => {
		event_config(pass, fail);
	});
}

// Terminate zeroMQ server
function term(pass, fail) {
	log.msg({ msg : 'Terminating' });

	// Disconnect interfaces
	let socket_intf = 'client';

	// console.dir(socket.intf, { showHidden: true, depth: null, colors: true});
	socket.intf.close();
	switch (status.server.connected) {
		case true:
			// socket.intf.close();
			break;
		case false:
			log.msg({ msg : 'zeroMQ router socket already disconnected' });
	}

	process.nextTick(pass);
	log.msg({ msg : 'Terminated' });
}


module.exports = {
	intf : zeromq.socket(get_type()),


	// Start/stop functions
	init : (pass, fail) => { return init(pass, fail); },
	term : (pass, fail) => { return term(pass, fail); },


	// Data sender-wrapper
	send : (event, data) => { send(event, data); },


	// Send USB LCD commands/text to bmwd
	lcd_color_tx   : (data) => { send('lcd-color',   data); },
	lcd_command_tx : (data) => { send('lcd-command', data); },
	lcd_text_tx    : (data) => { send('lcd-text',    data); },


	// Send and receive vehicle bus data
	bus_rx : (bus, data) => {
		send('bus-rx', {
			bus  : bus,
			data : data,
		});
	},

	bus_tx : (bus, data) => {
		send('bus-tx', {
			bus  : bus,
			data : data,
		});
	},

	// Send status data object for use by other zeroMQ clients
	status_tx : (module) => {
		// If the entire status object was requested
		if (module == 'all') {
			log.msg({ msg : 'Sending full status' });

			send('status', status);
			host_data.send();
			return;
		}

		// log.msg({ msg : 'Sending \''+module+'\' status' });

		let msg = {};
		msg[module] = status[module];
		send('status', msg);
	},
};
