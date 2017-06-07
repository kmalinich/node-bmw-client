var module_name = __filename.slice(__dirname.length + 1, -3);

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

	// Check before sending data
	check : (check_callback) => {
		// Check config
		if (typeof config             === 'undefined' || config             === null) { return; };
		if (typeof config.server      === 'undefined' || config.server      === null) { return; };
		if (typeof config.server.host === 'undefined' || config.server.host === null) { return; };
		if (typeof config.server.port === 'undefined' || config.server.port === null) { return; };

		// Check status
		if (typeof status                  === 'undefined' || status                  === null) { return; };
		if (typeof status.server           === 'undefined' || status.server           === null) { return; };
		if (typeof status.server.connected === 'undefined' || status.server.connected === null) { return; };

		// Check socket
		if (typeof socket         === 'undefined' || socket         === null) { return; };
		if (typeof socket.io      === 'undefined' || socket.io      === null) { return; };
		if (typeof socket.io.emit === 'undefined' || socket.io.emit === null) { return; };

		if (typeof check_callback === 'function') check_callback();
		check_callback = undefined;
	},

	startup : (startup_callback) => {
		socket.check(() => {
			if (status.server.connected === true) {
				log.msg({
					src : module_name,
					msg : 'socket client already connected',
				});

				if (typeof startup_callback === 'function') startup_callback();
				startup_callback = undefined;
				return;
			}
		});

		kodi_log('Connecting to '+config.server.host+':'+config.server.port);

		var url = 'http://'+config.server.host+':'+config.server.port;

		socket.manager = require('socket.io-client').Manager(url, socket.options);
		socket.io      = socket.manager.socket('/');

		// Open connection
		socket.manager.open(() => { socket.io.open(); });

		socket.io.on('connect', () => {
			kodi_log('Connected to '+config.server.host+':'+config.server.port);

			// Refresh all data on first connect if enabled, otherwise, just request ignition
			if (status.server.reconnecting !== true) {
				if (config.options.obc_refresh_on_start === true) {
					IKE.obc_refresh();
				}
				else {
					IKE.request('ignition');
				}
			}

			status.server.connected    = true;
			status.server.connecting   = false;
			status.server.reconnecting = false;

			if (typeof startup_callback === 'function') startup_callback();
			startup_callback = undefined;
		});

		socket.io.on('connect_error', (error) => {
			status.server.connected = false;
			kodi_log('Connect error: '+error.description.code);
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
			status.server.reconnecting = true;

			// log.msg({
			//   src : module_name,
			//   msg : 'Attempting to reconnect',
			// });
		});

		socket.io.on('reconnecting', (number) => {
			status.server.connected    = false;
			status.server.connecting   = true;
			status.server.reconnecting = true;

			log.msg({
				src : module_name,
				msg : 'Attempting to reconnect, try #'+number,
			});
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
			status.server.latency      = number;
			status.server.connected    = true;
			status.server.connecting   = false;
			status.server.reconnecting = false;

			log.msg({
				src : module_name,
				msg : 'Ping reply, latency '+number+'ms',
			});
		});

		socket.io.on('ping', () => {
			log.msg({
				src : module_name,
				msg : 'Pinged server',
			});
		});

		socket.io.on('disconnect', () => {
			status.server.connected = false;
			kodi_log('Disconnected from '+config.server.host+':'+config.server.port);

			// Reset basic vars
			json.status_reset_basic(() => {});
		});

		socket.io.on('data-receive', (data) => {
			data_handler.check_data(data);
		});
	},

	shutdown : (shutdown_callback) => {
		socket.check(() => {
			status.server.connecting   = false;
			status.server.reconnecting = false;

			if (status.server.connected === false) {
				if (typeof shutdown_callback === 'function') shutdown_callback();
				shutdown_callback = undefined;
				return false;
			}

			socket.io.on('disconnect', () => {
				status.server.connected = false;

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
		});
	},

	// Send vehicle data bus data to WebSocket
	data_send : (data) => {
		if (config.server.bus === true) {
			data.host = os.hostname().split('.')[0];
			socket.check(() => { socket.io.emit('data-send', data); });
		}
	},

	// Send bus log messages to WebSocket
	log_bus : (data) => {
		// data.host = os.hostname().split('.')[0];
		// socket.check(() => { if (config.server.bus === true) socket.io.emit('log-bus', data); });
	},

	// Send app log messages to WebSocket
	log_msg : (data) => {
		// data.host = os.hostname().split('.')[0];
		// socket.check(() => { socket.io.emit('log-msg', data); });
	},
};
