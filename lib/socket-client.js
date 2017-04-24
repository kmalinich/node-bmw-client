var module_name = __filename.slice(__dirname.length + 1, -3);

module.exports = {
	io : null,

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
			src : 'socket',
			msg : 'server: \''+config.server.host+'\', port: '+config.server.port,
		});

		var server_url = 'http://'+config.server.host+':'+config.server.port;

		socket_client.io = require('socket.io-client')(server_url, socket_options);

		socket_client.io.on('connect', () => {
			status.server.connected = true;
			log.msg({
				src : 'socket',
				msg : 'connected to server',
			});

			// omnibus.IKE.obc_refresh();
			startup_callback();
		});

		socket_client.io.on('connect_error', (error) => {
			status.server.connected = false;
			log.msg({
				src : 'socket',
				msg : 'connect error: '+error.description,
			});
		});

		socket_client.io.on('connect_timeout', () => {
			status.server.connected = false;
			log.msg({
				src : 'socket',
				msg : 'connect timeout',
			});
		});

		socket_client.io.on('reconnect', (number) => {
			status.server.connected = true;
			log.msg({
				src : 'socket',
				msg : 'reconnected after '+number+' tries',
			});
		});

		// socket_client.io.on('reconnect_attempt', () => {
		// 	status.server.connected = false;
		// 	log.msg({
		// 		src : 'socket',
		// 		msg : 'attempting to reconnect',
		// 	});
		// });

		socket_client.io.on('reconnecting', (number) => {
			status.server.connected = false;
			log.msg({
				src : 'socket',
				msg : 'attempting to reconnect, try #'+number,
			});
		});

		// socket_client.io.on('reconnect_error', (error) => {
		// 	status.server.connected = false;
		// 	log.msg({
		// 		src : 'socket',
		// 		msg : 'reconnect error: '+error.description,
		// 	});
		// });

		socket_client.io.on('reconnect_failed', () => {
			status.server.connected = false;
			log.msg({
				src : 'socket',
				msg : 'failed to reconnect',
			});
		});

		socket_client.io.on('pong', (number) => {
			status.server.latency = number;
			log.msg({
				src : 'socket',
				msg : 'ping reply, latency '+number+'ms',
			});
		});

		socket_client.io.on('ping', () => {
			log.msg({
				src : 'socket',
				msg : 'pinged server',
			});
		});

		socket_client.io.on('disconnect', () => {
			status.server.connected = false;
			log.msg({
				src : 'socket',
				msg : 'disconnected from server',
			});

			json.reset();
		});

		socket_client.io.on('data-receive', (data) => {
			omnibus.data_handler.check_data(data);
		});

		// Open connection
		socket_client.io.open();
	},

	shutdown : (shutdown_callback) => {
		if (status.server.connected === true) {
			socket_client.io.on('disconnect', () => {
				status.server.connected = false;
				log.msg({
					src : 'socket',
					msg : 'shut down',
				});

				json.reset(() => {
					shutdown_callback();
				});
			});
		}

		if (status.server.connected === false) {
			json.reset(() => {
				shutdown_callback();
			});
		}

		socket_client.io.close(() => {
			log.msg({
				src : 'socket',
				msg : 'io.close()',
			});
		});
	},

	data_send : (data) => {
		socket_client.io.emit('data-send', data);
	},
};
