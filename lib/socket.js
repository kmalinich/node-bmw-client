const module_name = __filename.slice(__dirname.length + 1, -3);



// Handle incoming client messages
function on_client_tx(data) {
	log.socket({
		method : 'rx',
		type   : data.host.type,
		event  : data.event,
		string : data.host.host.short,
	});

	switch (data.event) {
		case 'host-data-request' : host_data.send(); break;

		case 'bus-rx'      : break;
		case 'bus-tx'      : break;
		case 'lcd-color'   : break;
		case 'lcd-command' : break;
		case 'lcd-text'    : break;

		case 'log-bus'     : log.bus     (data.message); break;
		case 'log-msg'     : log.socket  (data);         break; // Broken, fix this
		case 'host-data'   : on_host_data(data);         break;

		default :
			console.log(log.chalk.red('================= CLIENT RX ================='));
			console.log(JSON.stringify(data, null, 2));
			console.log(log.chalk.red('============================================='));
	}
}

// Handle incoming daemon messages
function on_daemon_tx(data) {
	log.socket({
		method : 'rx',
		type   : data.host.type,
		event  : data.event,
		string : data.host.host.short,
	});

	switch (data.event) {
		case 'host-data-request' : host_data.send();  break;

		case 'bus-rx'      : bus_data.receive(data.data);    break;
		case 'host-data'   : on_host_data    (data);         break;
		case 'log-bus'     : log.bus         (data.message); break;
		case 'log-msg'     : log.socket      (data);         break; // Broken, fix this

		case 'bus-tx'      : break;
		case 'lcd-color'   : break;
		case 'lcd-command' : break;
		case 'lcd-text'    : break;

		default :
			console.log(log.chalk.red('================= DAEMON RX ================='));
			console.log(JSON.stringify(data, null, 2));
			console.log(log.chalk.red('============================================='));
	}
}

// Handle incoming host-data messages
function on_host_data(data) {
	log.socket({
		method : 'rx',
		type   : data.data.type,
		event  : data.data.host.short+' => temp',
		string : data.data.temperature+'c',
	});
}


// Send data over WebSocket
function send(event, data) {
	// Don't bother sending anything if we're not connected
	if (status.server.connected === false) return;

	log.socket({
		method : 'tx',
		type   : status.system.type,
		event  : event,
		string : '',
	});

	let message = {
		host  : status.system,
		event : event,
		data  : data,
	};

	socket.io.emit('client-tx', message);
}

// Initialize WebSocket client
function startup(startup_callback = null) {
	if (status.server.connected === true) {
		log.msg({
			src : module_name,
			msg : 'Client already connected',
		});

		if (typeof startup_callback === 'function') startup_callback();
		startup_callback = undefined;
		return;
	}

	kodi_log('Connecting to '+config.server.host+':'+config.server.port);

	let url = 'http://'+config.server.host+':'+config.server.port;

	socket.manager = require('socket.io-client').Manager(url, socket.options);
	socket.io      = socket.manager.socket('/');

	// Recieve data from other bmwcd instances
	socket.io.on('client-tx', (data) => { on_client_tx(data); });

	// Receive data from bmwd
	socket.io.on('daemon-tx', (data) => { on_daemon_tx(data); });

	socket.io.on('connect', () => {
		kodi_log('Connected to '+config.server.host+':'+config.server.port);

		// Refresh all data on first connect if enabled, otherwise, just request ignition
		// This should be event based and reside in modules/IKE.js
		if (status.server.reconnecting !== true) {
			switch (config.options.obc_refresh_on_start) {
				case true:
					setTimeout(() => {
						IKE.obc_refresh();
					}, 3000);
					break;

				default:
					setTimeout(() => {
						IKE.request('ignition');
					}, 3000);
			}
		}

		status.server.connected    = true;
		status.server.connecting   = false;
		status.server.reconnecting = false;

		// Send this host's data to WebSocket clients to update them
		host_data.send();

		if (typeof startup_callback === 'function') startup_callback();
		startup_callback = undefined;
	});

	socket.io.on('connect_error', (error) => {
		status.server.connected = false;
		if (status.server.reconnecting === false) {
			kodi_log('Connect error: '+error.description.code);
		}
	});

	socket.io.on('connect_timeout', () => {
		status.server.connected = false;
		kodi_log('Connect timeout');
	});

	socket.io.on('reconnect', (number) => {
		status.server.connected  = true;
		status.server.connecting = false;

		kodi_log('Reconnected after '+number+' tries');

		// Request ignition on reconnect
		IKE.request('ignition');
	});

	socket.io.on('reconnect_attempt', () => {
		status.server.connected    = false;
		status.server.connecting   = true;

		if (status.server.reconnecting === false) {
			status.server.reconnecting = true;
			log.msg({
				src : module_name,
				msg : 'Attempting to reconnect',
			});
		}
	});

	socket.io.on('reconnecting', (number) => {
		status.server.connected    = false;
		status.server.connecting   = true;
		status.server.reconnecting = true;

		// log.msg({
		// 	src : module_name,
		// 	msg : 'Attempting to reconnect, try #'+number,
		// });
	});

	socket.io.on('reconnect_error', (error) => {
		status.server.connected = false;
		// kodi_log('Reconnect error: '+error.description.code);
	});

	socket.io.on('reconnect_failed', () => {
		status.server.connected    = false;
		status.server.connecting   = false;
		status.server.reconnecting = false;
		kodi_log('Reconnect failed');
	});

	socket.io.on('pong', (number) => {
		status.server.connected    = true;
		status.server.connecting   = false;
		status.server.reconnecting = false;

		// Only display message if the value changed
		if (status.server.latency !== number) {
			log.msg({
				src : module_name,
				msg : 'Latency '+number+'ms',
			});

			status.server.latency = number;
		}
	});

	socket.io.on('ping', () => {
		// log.msg({
		// 	src : module_name,
		// 	msg : 'Pinged server',
		// });
	});

	socket.io.on('disconnect', () => {
		status.server.connected = false;
		kodi_log('Disconnected from '+config.server.host+':'+config.server.port);

		// Reset basic vars
		json.status_reset_basic(() => {});
	});

	// Open connection
	socket.manager.open(() => { socket.io.open(); });
}

// Terminate WebSocket client
function shutdown(shutdown_callback = null) {
	status.server.connecting   = false;
	status.server.reconnecting = false;

	if (status.server.connected === false) {
		if (typeof shutdown_callback === 'function') shutdown_callback();
		shutdown_callback = undefined;
		return false;
	}

	socket.io.on('disconnect', () => {
		status.server.connected = false;

		// Call function to reset the timeout
		host_data.send();

		log.msg({
			src : module_name,
			msg : 'Shut down',
		});

		if (typeof shutdown_callback === 'function') shutdown_callback();
		shutdown_callback = undefined;
	});

	socket.io.close(() => {
		log.msg({
			src : module_name,
			msg : 'io.close()',
		});
	});
}


// Output log message to kodi notification and log.msg
function kodi_log(message) {
	kodi.notify(module_name, message);

	log.msg({
		src : module_name,
		msg : message,
	});
}


module.exports = {
	io      : null,
	manager : null,

	timeouts : {},

	options : {
		autoConnect          : false,
		path                 : '/socket.io',
		perMessageDeflate    : false,
		randomizationFactor  : 0.5,
		reconnection         : true,
		reconnectionAttempts : Infinity,
		reconnectionDelay    : 250,
		reconnectionDelayMax : 1000,
		rememberUpgrade      : true,
		timeout              : 2500,
		transports           : ['websocket'],
	},


	startup  : (startup_callback)  => { startup(startup_callback);   },
	shutdown : (shutdown_callback) => { shutdown(shutdown_callback); },

	// Send vehicle bus data to bmwd
	bus_tx : (bus, data) => {
		send('bus-tx', {
			bus  : bus,
			data : data,
		});
	},

	// Send USB LCD commands/text to bmwd
	lcd_color_tx   : (data) => { send('lcd-color',   data); },
	lcd_command_tx : (data) => { send('lcd-command', data); },
	lcd_text_tx    : (data) => { send('lcd-text',    data); },

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

	send : (event, data) => { send(event, data); },
};
