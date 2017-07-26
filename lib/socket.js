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
	console.dir(data, { showHidden: true, depth: null, colors: true});

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
	socket.interfaces[app_type].send([ app_type+'-tx', amp_message.toBuffer() ]);

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
		// When a peer connects
		socket.interfaces[interface].on('connect', () => {
			log.module({
				src : module_name,
				msg : 'Peer connected',
			});
		});

		// When a peer disconnects
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
				msg : topic+' message received via '+interface,
			});

			// Decode AMP message
			decode_amp(message);
		});
	});

	socket.interfaces[app_type].on('bind', () => {
		update.status('server.connected', true);

		update.status('server.connecting',   false);
		update.status('server.reconnecting', false);

		// Send this host's data to zeroMQ clients to update them
		host_data.send();

		if (app_type == 'client') {
			// Refresh all data on first connect if enabled
			// This should ACTUALLY be more event-driven and reside in modules/IKE.js
			setTimeout(() => {
				switch (config.options.obc_refresh_on_start) {
					case true : IKE.obc_refresh(); break;
					default   : IKE.request('ignition');
				}
			}, 250);
		}
	});

	socket.interfaces[app_type].on('unbind', () => {
		update.status('server.connected', false);

		if (app_type == 'client') {
			// Reset basic vars
			json.status_reset_basic(() => {});
		}
	});

	log.module({ src : module_name, msg : 'Initialized event listeners' });

	pass();
	return true;
}

// Return full zeroMQ URL from config data
function get_url(interface) {
	let zmq_conf = config.zeromq;
	return zmq_conf.proto+'://'+zmq_conf.urls[interface]+':'+zmq_conf.ports[interface];
}

// Return zeroMQ socket type from config data
function get_type(interface) {
	if (interface === app_type) return 'pub';
	return 'sub';
}

// Initialize zeroMQ server
function init(pass, fail) {
	log.msg({ src : module_name, msg : 'Initializing' });

	// Setup events
	event_config(() => {
		// Bind server
		socket.interfaces[app_type].bind(get_url(app_type), (error) => {
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
					socket.interfaces[interface].connect(get_url(interface));
					socket.interfaces[interface].subscribe(interface+'-tx');
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

	// Disconnect interfaces
	Object.keys(socket.interfaces).forEach((interface) => {
		if (interface != app_type) {
			socket.interfaces[interface].disconnect(get_url(interface));
			log.module({ src : module_name, msg : interface+' disconnected' });
		}
	});

	if (!status.server.connected) {
		log.module({
			src : module_name,
			msg : 'zeroMQ server already unbound',
		});

		pass();
		return true;
	}

	// Unbind server
	socket.interfaces[app_type].unbind(get_url(app_type), (error) => {
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
		status.server.reconnecting = true;
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
	interfaces : {
		can0   : zeromq.socket(get_type('can0')),
		can1   : zeromq.socket(get_type('can1')),
		client : zeromq.socket(get_type('client')),
		daemon : zeromq.socket(get_type('daemon')),
		dbus   : zeromq.socket(get_type('dbus')),
		ibus   : zeromq.socket(get_type('ibus')),
		kbus   : zeromq.socket(get_type('kbus')),
		lcd    : zeromq.socket(get_type('lcd')),
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
