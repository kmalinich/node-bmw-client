// Thanks
// https://gist.github.com/Xaekai/e1f711cb0ad865deafc11185641c632a

const net  = require('net');
const jsoc = require('json-socket');

const EventEmitter = require('events');


// Render/format error string
function error_fmt(intf_name = 'unknown', error) {
	let error_string = intf_name;

	if (typeof error.errno   === 'string') error_string += ' '  + error.errno;
	if (typeof error.code    === 'string') error_string += ' [' + error.code + ']';
	if (typeof error.syscall === 'string') error_string += ' '  + error.syscall;
	if (typeof error.address === 'string') error_string += ' '  + error.address;

	return error_string;
}


class socket extends EventEmitter {
	constructor() {
		super();

		this.intf = {
			can0 : null,
			can1 : null,
			dbus : null,
			ibus : null,
			kbus : null,
		};

		this.events = [
			'close',
			'connect',
			'drain',
			'end',
			'error',
			'lookup',
			'message',
			'ready',
			'timeout',
		];
	}


	// Output a log message, and emit an event with the same data
	emit_log(topic, message) {
		log.lib('Event: ' + topic + ' => ' + message);
		this.emit(topic, message);
	}


	// Send and receive vehicle bus data
	bus_rx(data) { this.send('bus-rx', data); }

	bus_tx(data) {
		switch (data.bus) {
			case 'both-low' : {
				// Send over IBUS first
				data.bus = 'ibus';
				this.send('bus-tx', data);

				// Send over KBUS as well, if it's enabled
				if (config.intf[data.bus].enabled === true) {
					data.bus = 'kbus';
					this.send('bus-tx', data);
				}

				break;
			}

			case 'kbus' : {
				// If this is a KBUS packet and KBUS is disabled, send via IBUS
				if (config.intf[data.bus].enabled !== true) data.bus = 'ibus';
				this.send('bus-tx', data);
				break;
			}

			default : {
				if (config.intf[data.bus].enabled !== true) return;
				this.send('bus-tx', data);
			}
		}
	}


	// Send status data object for use by other sockets
	status_tx(module) {
		// If the entire status object was requested
		if (module === 'all') {
			log.lib('Sending full status');

			this.send('status', status);
			this.emit('recv-host-data-request');
			return;
		}

		log.lib('Sending \'' + module + '\' status');

		let msg = {};
		msg[module] = status[module];
		this.send('status', msg);
	}


	// Send message over socket
	send(event, message) {
		if (typeof this.intf[message.bus] === 'undefined') return;
		if (this.intf[message.bus]        === null)        return;

		if (event !== 'bus-tx') return;

		log.lib(event + ' message sent to ' + message.bus + ' (' + message.bus + ')');

		// Send message over socket
		this.intf[message.bus].sendMessage({
			intf  : status.system.intf,
			event : event,
			data  : message,
		});
	}

	// Handle incoming messages
	recv(intf, message) {
		switch (message.event) {
			case 'host-connect' : log.lib('Interface connected: ' + intf); break;

			case 'status-request' : this.status_tx(message.data); break;
		}

		this.emit('recv-' + message.event, message.data);
	}


	// Reconnect disconnected sockets
	reconnect(intf, override_check = false) {
		// Don't reconnect if this interface is not enabled
		if (config.intf[intf].enabled !== true) return;

		// Don't reconnect if already connected
		if (status.server.sockets[intf].connected !== false) return;

		// Don't reconnect if already reconnecting and not being overriden
		if (override_check !== true && status.server.sockets[intf].reconnecting !== false) return;

		update.status('server.sockets.' + intf + '.reconnecting', true,  false);

		// Knock it's block off first
		this.intf[intf]._socket.destroy();
		update.status('server.sockets.' + intf + '.connected', false, false);


		setTimeout(() => {
			log.lib('Reconnecting \'' + intf + '\' socket');

			this.init_intf(intf, true);

			// Try again if not connected
			setTimeout(() => {
				this.reconnect(intf, true);
			}, 1000);
		}, 100);
	}

	// Initialize event listeners for a specific interface
	init_intf_listeners(intf, init_intf_listeners_cb) {
		// Return here if not configured to use this interface
		if (config.intf[intf].enabled !== true) {
			process.nextTick(init_intf_listeners_cb);
			return;
		}

		// Verbose events
		this.intf[intf].on('drain',   () => { this.emit_log('drain',   intf); });
		this.intf[intf].on('listen',  () => { this.emit_log('listen',  intf); });
		this.intf[intf].on('timeout', () => { this.emit_log('timeout', intf); });


		// Close events
		this.intf[intf].on('close', (error) => {
			update.status('server.sockets.' + intf + '.connected', false, false);

			if (error) {
				this.emit_log('close-error', intf);

				this.reconnect(intf);
				return;
			}

			this.emit_log('close', intf);
			this.reconnect(intf);
		});

		this.intf[intf].on('end', () => {
			update.status('server.sockets.' + intf + '.connected', false, false);

			this.emit_log('end', intf);

			this.reconnect(intf);
		});

		this.intf[intf].on('timeout', () => {
			this.emit_log('timeout', intf);
			this.reconnect(intf);
		});


		// Error events
		this.intf[intf].on('error', (error) => {
			update.status('server.sockets.' + intf + '.connected', false, false);

			log.error(error_fmt(intf, error));
			this.emit('error-' + intf, error);
			this.reconnect(intf);
		});


		// Normal events
		this.intf[intf].on('connect', () => {
			log.lib('Connected \'' + intf + '\' socket');

			this.emit('connect-' + intf);
		});

		this.intf[intf].on('message', (message) => {
			this.recv(intf, message);
		});

		this.intf[intf].on('ready', () => {
			this.emit_log('ready', intf);

			update.status('server.sockets.' + intf + '.connected',    true, false);
			update.status('server.sockets.' + intf + '.connecting',   false, false);
			update.status('server.sockets.' + intf + '.reconnecting', false, false);
		});

		process.nextTick(init_intf_listeners_cb);

		log.lib('Initialized \'' + intf + '\' listeners');
	}

	// Connect sockets
	init_intf(intf, reconnecting = false) {
		if (status.server.sockets[intf].reconnecting !== true) {
			if (this.intf[intf]._socket.connecting !== false || status.server.sockets[intf].connecting !== false) return;
		}

		if (reconnecting === false) log.lib('Connecting \'' + intf + '\' socket');

		update.status('server.sockets.' + intf + '.connecting', true, false);

		this.intf[intf].connect(config.socket[intf].path);
	}

	// Initialize sockets
	init(pass = null) {
		log.lib('Initializing');

		for (let intf in config.intf) {
			update.status('server.sockets.' + intf + '.connected',    false);
			update.status('server.sockets.' + intf + '.connecting',   false);
			update.status('server.sockets.' + intf + '.reconnecting', false);

			// Skip if this interface is disabled
			if (config.intf[intf].enabled !== true) continue;

			log.lib('Initializing \'' + intf + '\'');

			let socket_options = {
				allowHalfOpen : true,
				readable      : true,
				writable      : true,
			};

			// Decorate socket to be a JsonSocket
			this.intf[intf] = new jsoc(new net.Socket(socket_options));

			// Enable keepalive
			this.intf[intf]._socket.setKeepAlive(true);

			// Disable Nagle algorithm
			this.intf[intf]._socket.setNoDelay(true);

			// Periodically output socket stats
			setInterval(() => {
				log.lib([
					'stats ' + intf,
					JSON.stringify({
						bufferSize   : this.intf[intf]._socket.bufferSize,
						bytesRead    : this.intf[intf]._socket.bytesRead,
						bytesWritten : this.intf[intf]._socket.bytesWritten,
					}),
				]);
			}, 60000);

			this.init_intf_listeners(intf, () => {
				// Initialize interfaces
				process.nextTick(() => {
					this.init_intf(intf);
				});
			});

			log.lib('Initialized \'' + intf + '\'');
		} // for (let intf in config.intf)

		log.lib('Initialized');

		typeof pass === 'function' && pass();
	}

	// Terminate sockets
	term(pass = null) {
		log.lib('Terminating');

		for (let intf in config.intf) {
			if (config.intf[intf].enabled !== true) continue;
			log.lib('Ending \'' + intf + '\' socket');

			this.intf[intf].end(() => {
				this.intf[intf]._socket.destroy();

				update.status('server.sockets.' + intf + '.connected',    false, false);
				update.status('server.sockets.' + intf + '.connecting',   false, false);
				update.status('server.sockets.' + intf + '.reconnecting', false, false);
			});
		} // for (let intf in config.intf)

		setTimeout(() => {
			log.lib('Terminated');

			typeof pass === 'function' && process.nextTick(pass);
		}, 500);
	}
}


module.exports = socket;
