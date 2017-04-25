var module_name = 'client';

module.exports = {
	io : null,

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

		// Check bus_client
		if (typeof bus_client         === 'undefined' || bus_client         === null) { return; };
		if (typeof bus_client.io      === 'undefined' || bus_client.io      === null) { return; };
		if (typeof bus_client.io.emit === 'undefined' || bus_client.io.emit === null) { return; };

		check_callback();
	},

	startup : (startup_callback) => {
		var socket_options = {
			autoConnect          : false,
			path                 : '/socket.io',
			randomizationFactor  : 0.5,
			reconnection         : true,
			reconnectionAttempts : Infinity,
			reconnectionDelay    : 1000,
			reconnectionDelayMax : 5000,
			timeout              : 20000,
		};

		log.msg({
			src : module_name,
			msg : 'server: \''+config.server.host+'\', port: '+config.server.port,
		});

		var server_url = 'http://'+config.server.host+':'+config.server.port;

		bus_client.io = require('socket.io-client')(server_url, socket_options);

		bus_client.io.on('connect', () => {
			log.msg({
				src : module_name,
				msg : 'connected to server',
			});

			// Refresh all data on first connect
			if (status.server.reconnecting !== true) {
				IKE.obc_refresh();
			}

			status.server.connected    = true;
			status.server.connecting   = false;
			status.server.reconnecting = false;

			startup_callback();
		});

		bus_client.io.on('connect_error', (error) => {
			status.server.connected = false;

			log.msg({
				src : module_name,
				msg : 'connect error: '+error.description,
			});
		});

		bus_client.io.on('connect_timeout', () => {
			status.server.connected = false;
			log.msg({
				src : module_name,
				msg : 'connect timeout',
			});
		});

		bus_client.io.on('reconnect', (number) => {
			status.server.connected    = true;
			status.server.connecting   = false;

			// Request ignition on reconnect
			IKE.request('ignition');

			log.msg({
				src : module_name,
				msg : 'reconnected after '+number+' tries',
			});
		});

		bus_client.io.on('reconnect_attempt', () => {
			status.server.connected    = false;
			status.server.connecting   = true;
			status.server.reconnecting = true;

			// log.msg({
			//   src : module_name,
			//   msg : 'attempting to reconnect',
			// });
		});

		bus_client.io.on('reconnecting', (number) => {
			status.server.connected    = false;
			status.server.connecting   = true;
			status.server.reconnecting = true;

			log.msg({
				src : module_name,
				msg : 'attempting to reconnect, try #'+number,
			});
		});

		bus_client.io.on('reconnect_error', (error) => {
			status.server.connected = false;

			log.msg({
				src : module_name,
				msg : 'reconnect error: '+error.description,
			});
		});

		bus_client.io.on('reconnect_failed', () => {
			status.server.connected    = false;
			status.server.connecting   = false;
			status.server.reconnecting = false;

			log.msg({
				src : module_name,
				msg : 'failed to reconnect',
			});
		});

		bus_client.io.on('pong', (number) => {
			status.server.latency      = number;
			status.server.connected    = true;
			status.server.connecting   = false;
			status.server.reconnecting = false;

			log.msg({
				src : module_name,
				msg : 'ping reply, latency '+number+'ms',
			});
		});

		bus_client.io.on('ping', () => {
			log.msg({
				src : module_name,
				msg : 'pinged server',
			});
		});

		bus_client.io.on('disconnect', () => {
			status.server.connected = false;

			log.msg({
				src : module_name,
				msg : 'disconnected from server',
			});
		});

		bus_client.io.on('data-receive', (data) => {
			data_handler.check_data(data);
		});

		// Open connection
		bus_client.io.open();
	},

	shutdown : (shutdown_callback) => {
		bus_client.check(() => {
			status.server.connecting   = false;
			status.server.reconnecting = false;

			if (status.server.connected !== false) {
				bus_client.io.on('disconnect', () => {
					status.server.connected = false;

					log.msg({
						src : module_name,
						msg : 'shut down',
					});

					json.reset(() => {
						shutdown_callback();
					});
				});
			}

			if (status.server.connected !== true) {
				json.reset(() => {
					shutdown_callback();
				});
			}

			bus_client.io.close(() => {
				log.msg({
					src : module_name,
					msg : 'io.close()',
				});
			});
		});
	},

	// Send vehicle data bus data to the WebSocket
	data_send : (data) => {
		data.host = os.hostname();
		bus_client.check(() => {
			bus_client.io.emit('data-send', data)
		});
	},

	// Send bus log messages WebSocket
	log_bus : (data) => {
		data.host = os.hostname();
		bus_client.check(() => {
			bus_client.io.emit('log-bus', data)
		});
	},

	// Send app log messages WebSocket
	log_msg : (data) => {
		data.host = os.hostname();
		bus_client.check(() => {
			bus_client.io.emit('log-msg', data)
		});
	},
};
