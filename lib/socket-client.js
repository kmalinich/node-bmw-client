var module_name = __filename.slice(__dirname.length + 1, -3);

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

    // Check socket_client
    if (typeof socket_client         === 'undefined' || socket_client         === null) { return; };
    if (typeof socket_client.io      === 'undefined' || socket_client.io      === null) { return; };
    if (typeof socket_client.io.emit === 'undefined' || socket_client.io.emit === null) { return; };

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

    socket_client.io = require('socket.io-client')(server_url, socket_options);

    socket_client.io.on('connect', () => {
      log.msg({
        src : module_name,
        msg : 'connected to server',
      });

      // Refresh all data on first connect
      if (status.server.reconnecting !== true) {
        omnibus.IKE.obc_refresh();
      }

      status.server.connected    = true;
      status.server.connecting   = false;
      status.server.reconnecting = false;

      startup_callback();
    });

    socket_client.io.on('connect_error', (error) => {
      status.server.connected = false;

      log.msg({
        src : module_name,
        msg : 'connect error: '+error.description,
      });
    });

    socket_client.io.on('connect_timeout', () => {
      status.server.connected = false;
      log.msg({
        src : module_name,
        msg : 'connect timeout',
      });
    });

		socket_client.io.on('reconnect', (number) => {
			status.server.connected    = true;
      status.server.connecting   = false;

      // Request ignition on reconnect
      omnibus.IKE.request('ignition');

      log.msg({
        src : module_name,
        msg : 'reconnected after '+number+' tries',
      });
    });

    socket_client.io.on('reconnect_attempt', () => {
      status.server.connected    = false;
      status.server.connecting   = true;
      status.server.reconnecting = true;

      // log.msg({
      //   src : module_name,
      //   msg : 'attempting to reconnect',
      // });
    });

    socket_client.io.on('reconnecting', (number) => {
      status.server.connected    = false;
      status.server.connecting   = true;
      status.server.reconnecting = true;

      log.msg({
        src : module_name,
        msg : 'attempting to reconnect, try #'+number,
      });
    });

    socket_client.io.on('reconnect_error', (error) => {
      status.server.connected = false;

      log.msg({
        src : module_name,
        msg : 'reconnect error: '+error.description,
      });
    });

    socket_client.io.on('reconnect_failed', () => {
      status.server.connected    = false;
      status.server.connecting   = false;
      status.server.reconnecting = false;

      log.msg({
        src : module_name,
        msg : 'failed to reconnect',
      });
    });

    socket_client.io.on('pong', (number) => {
      status.server.latency      = number;
      status.server.connected    = true;
      status.server.connecting   = false;
      status.server.reconnecting = false;

      log.msg({
        src : module_name,
        msg : 'ping reply, latency '+number+'ms',
      });
    });

    socket_client.io.on('ping', () => {
      log.msg({
        src : module_name,
        msg : 'pinged server',
      });
    });

    socket_client.io.on('disconnect', () => {
      status.server.connected = false;

      log.msg({
        src : module_name,
        msg : 'disconnected from server',
      });
    });

    socket_client.io.on('data-receive', (data) => {
      omnibus.data_handler.check_data(data);
    });

    // Open connection
    socket_client.io.open();
  },

  shutdown : (shutdown_callback) => {
    status.server.connecting   = false;
    status.server.reconnecting = false;

    if (status.server.connected !== false) {
      socket_client.io.on('disconnect', () => {
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

    socket_client.io.close(() => {
      log.msg({
        src : module_name,
        msg : 'io.close()',
      });
    });
  },

	// Send vehicle data bus data to the WebSocket
  data_send : (data) => {
		data.host = os.hostname();
    socket_client.check(() => {
			socket_client.io.emit('data-send', data)
		});
  },

	// Send bus log messages WebSocket
  log_bus : (data) => {
		data.host = os.hostname();
    socket_client.check(() => {
			socket_client.io.emit('log-bus', data)
		});
  },

	// Send app log messages WebSocket
  log_msg : (data) => {
		data.host = os.hostname();
    socket_client.check(() => {
			socket_client.io.emit('log-msg', data)
		});
  },
};
