const module_name = __filename.slice(__dirname.length + 1, -3);

const amp    = require('amp-message');
const zeromq = require('zeromq');


// Output log message to kodi notification and log.msg
function kodi_log(message) {
	kodi.notify(module_name, message);

	log.msg({
		src : module_name,
		msg : message,
	});
}


// Handle incoming messages
function on_data(data) {
	switch (data.event) {
		case 'bus-rx'            : bus_data.receive(data.data); break;
		case 'host-data'         : on_host_data(data);          break;
		case 'host-data-request' : host_data.send();            break;
		case 'status-request'    : socket.status_tx(data.data); break;

			// case 'log-bus'     : log.bus   (data.message); break;
			// case 'log-msg'     : log.socket(data);         break; // Broken, fix this
			// case 'bus-tx'      :
			// case 'lcd-color'   :
			// case 'lcd-command' :
			// case 'lcd-text'    :
			// default            :
	}

	return;
	log.socket({
		method : 'rx',
		type   : data.host.type,
		event  : data.event,
		string : data.host.host.short,
	});
}

// Handle incoming host-data messages
function on_host_data(data) {
	return;

	log.socket({
		method : 'rx',
		type   : data.data.type,
		event  : data.data.host.short+' => temp',
		string : data.data.temperature+'c',
	});
}

// Send data over zeroMQ
function send(event, data) {
	// Don't bother sending anything if we're not connected
	if (status.server.connected === false) {
		log.msg({
			src : module_name,
			msg : 'Server not connected, cannot send message',
		});

		return;
	}

	let message = {
		host  : status.system,
		event : event,
		data  : data,
	};

	// Encode object as AMP message
	let amp_message = new amp;
	amp_message.push(message);

	// Send AMP message over zeroMQ
	socket.interfaces.client.send([ 'client-tx', amp_message.toBuffer() ]);

	return;

	log.socket({
		method : 'tx',
		type   : status.system.type,
		event  : event,
		string : '',
	});
}

// Decode AMP-encoded messages from zeroMQ
function decode_amp(message) {
	let data = new amp(message).shift();
	// console.log(JSON.stringify(data, null, 2));

	// Parse received data
	on_data(data);
}


// Configure event handlers
function event_config(pass) {
	Object.keys(socket.interfaces).forEach((interface) => {
		// When a client connects
		socket.interfaces[interface].on('connect', () => {
			log.module({
				src : module_name,
				msg : 'Peer connected',
			});
		});

		// When a client disconnects
		socket.interfaces[interface].on('disconnect', () => {
			log.module({
				src : module_name,
				msg : 'Peer disconnected',
			});
		});

		socket.interfaces[interface].on('error', (error) => {
			log.module({
				src : module_name,
				msg : 'Error '+error,
			});
		});

		socket.interfaces[interface].on('message', (topic, message) => {
			log.module({
				src : module_name,
				msg : topic+' message received',
			});

			// Decode AMP message
			decode_amp(message);
		});
	});

	socket.interfaces.client.on('bind', () => {
		update.status('server.connected', true);
	});

	socket.interfaces.client.on('unbind', () => {
		update.status('server.connected', false);

		// Reset basic vars
		json.status_reset_basic(() => {});
	});

	log.module({ src : module_name, msg : 'Initialized event listeners' });

	pass();
	return true;
}

// Initialize zeroMQ server
function init(pass, fail) {
	log.msg({ src : module_name, msg : 'Initializing' });

	// Setup events
	event_config(() => {

		// Bind client
		socket.interfaces.client.bind('tcp://127.0.0.1:'+socket.ports.client, (error) => {
			if (error) {
				log.module({
					src : module_name,
					msg : 'zeroMQ server bind '+error,
				});

				fail();
				return false;
			}

			// Connect interfaces and subscribe to topics
			Object.keys(socket.interfaces).forEach((interface) => {
				if (interface != app_type) {
					socket.interfaces[interface].connect('tcp://127.0.0.1:'+socket.ports[interface]);
					socket.interfaces[interface].subscribe('daemon-tx');
					socket.interfaces[interface].subscribe('client-tx');
					socket.interfaces[interface].subscribe('bus-rx');
					log.module({ src : module_name, msg : interface+' connected' });
				}
			})

			log.module({ src : module_name, msg : 'Initialized' });

			pass();
			return true;
		});
	});
}

// Terminate zeroMQ server
function term(pass, fail) {
	log.msg({ src : module_name, msg : 'Terminating' });

	// Disconnect daemon
	socket.interfaces.daemon.disconnect('tcp://127.0.0.1:'+socket.ports.daemon);

	if (!status.server.connected) {
		log.module({
			src : module_name,
			msg : 'zeroMQ server already unbound',
		});

		pass();
		return true;
	}

	// Unbind client
	socket.interfaces.client.unbind('tcp://127.0.0.1:'+socket.ports.client, (error) => {
		if (error) {
			log.module({
				src : module_name,
				msg : 'zeroMQ server unbind '+error,
			});

			fail();
			return false;
		}

		log.msg({ src : module_name, msg : 'Terminated' });

		pass();
		return true;
	});
}


// Initialize websocket
function init_old_ws(init_callback = null) {
	socket.io.on('connect', () => {
		kodi_log('Connected to '+config.server.host+':'+config.server.port);

		// Refresh all data on first connect if enabled, otherwise, just request ignition
		// This should be event based and reside in modules/IKE.js
		if (status.server.reconnecting !== true) {
			switch (config.options.obc_refresh_on_start) {
				case true:
					setTimeout(() => {
						IKE.obc_refresh();
					}, 1000);
					break;

				default:
					setTimeout(() => {
						IKE.request('ignition');
					}, 1000);
			}
		}

		status.server.connected    = true;
		status.server.connecting   = false;
		status.server.reconnecting = false;

		// Send this host's data to zeroMQ clients to update them
		host_data.send();
	});

	socket.io.on('connect_error', (error) => {
		status.server.connected = false;
		if (status.server.reconnecting === false) {
			kodi_log('Connect error: '+error.description.code);
		}
	});

	socket.io.on('connect_timeout', () => {
		status.server.connected = false;
	});

	socket.io.on('reconnect', (number) => {
		status.server.connected  = true;
		status.server.connecting = false;

		// Request ignition on reconnect
		IKE.request('ignition');
	});

	socket.io.on('reconnect_attempt', () => {
		status.server.connected    = false;
		status.server.connecting   = true;

		if (status.server.reconnecting === false) {
			status.server.reconnecting = true;
		}
	});

	socket.io.on('reconnecting', (number) => {
		status.server.connected    = false;
		status.server.connecting   = true;
		status.server.reconnecting = true;
	});

	socket.io.on('reconnect_error', (error) => {
		status.server.connected = false;
	});

	socket.io.on('reconnect_failed', () => {
		status.server.connected    = false;
		status.server.connecting   = false;
		status.server.reconnecting = false;
	});

	socket.io.on('pong', (number) => {
		status.server.connected    = true;
		status.server.connecting   = false;
		status.server.reconnecting = false;

		// Only display message if the value changed
		if (status.server.latency !== number) {
			// Only display message if the value is greater than 10, or was previously greater than 10
			if (number > 10 || status.server.latency > 10) {
				log.msg({
					src : module_name,
					msg : 'Latency '+number+'ms',
				});
			}

			status.server.latency = number;
		}
	});
}


module.exports = {
	ports : {
		can0   : 4000,
		can1   : 4001,
		client : 4002,
		daemon : 4003,
		dbus   : 4004,
		ibus   : 4005,
		kbus   : 4006,
		lcd    : 4007,
	},

	interfaces : {
		client : zeromq.socket('pub'),

		daemon : zeromq.socket('sub'),
		can0   : zeromq.socket('sub'),
		can1   : zeromq.socket('sub'),
		dbus   : zeromq.socket('sub'),
		ibus   : zeromq.socket('sub'),
		kbus   : zeromq.socket('sub'),
		lcd    : zeromq.socket('sub'),
	},


	// Start/stop functions
	init : (pass, fail) => { return init(pass, fail); },
	term : (pass, fail) => { return term(pass, fail); },


	// Data sender-wrapper
	send : (event, data) => { send(event, data); },


	// Send USB LCD commands/text to bmwd
	lcd_color_tx   : (data) => { send('lcd-color',   data); },
	lcd_command_tx : (data) => { send('lcd-command', data); },
	lcd_text_tx    : (data) => { send('lcd-text',    data); },


	// Send vehicle bus data to bmwi instance
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
			log.msg({
				src : module_name,
				msg : 'Sending full status',
			});

			send('status', status);
			host_data.send();
			return;
		}

		log.module({
			src : module_name,
			msg : 'Sending \''+module+'\' status',
		});

		let msg = {};
		msg[module] = status[module];
		send('status', msg);
	},


	// Send bus log messages to bmwd
	log_bus : (data) => {
		return;
		send('log-bus', data);
	},

	// Send app log messages to bmwd
	log_msg : (data) => {
		return;
		send('log-msg', data);
	},
};
