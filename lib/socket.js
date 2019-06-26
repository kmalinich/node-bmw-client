/* eslint no-console : 0 */

// Thanks
// https://gist.github.com/Xaekai/e1f711cb0ad865deafc11185641c632a

const amp = require('amp-message');
const net = require('net');

const EventEmitter = require('events');


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

		this.events = [ 'close', 'connect', 'data', 'drain', 'end', 'error', 'lookup', 'ready', 'timeout' ];
	}


	// Output a log message, and emit an event with the same data
	emit_log(topic, message) {
		log.msg('Event: ' + topic + ': ' + message);
		this.emit(topic + '-' + message);
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


	// Send status data object for use by other socket clients
	status_tx(module) {
		// If the entire status object was requested
		if (module === 'all') {
			log.msg('Sending full status');

			this.send('status', status);
			this.emit('recv-host-data-request');
			return;
		}

		log.msg('Sending \'' + module + '\' status');

		let msg = {};
		msg[module] = status[module];
		this.send('status', msg);
	}


	// Send data over socket
	send(event, data) {
		if (this.intf[data.bus] === null) return;

		if (event !== 'bus-tx') return;

		let message = {
			intf  : status.system.intf,
			event : event,
			data  : data,
		};

		// Encode object as AMP message
		let amp_message = new amp();
		amp_message.push(message);

		// Send AMP message over socket
		this.intf[data.bus].write(amp_message.toBuffer());
	}

	// Handle incoming messages
	recv(intf, message) {
		// if (typeof message !== 'object') return;

		// Decode AMP-encoded messages from socket
		let data = new amp(message);

		// This looks confusing, because it is
		if (typeof data         !== 'object') return;
		if (typeof data.args    !== 'object') return;
		if (typeof data.args[0] !== 'object') return;

		data = data.args[0];

		switch (data.event) {
			case 'host-connect' : log.msg('Interface connected: ' + intf); break;

			case 'status-request' : this.status_tx(data.data); break;
		}

		this.emit('recv-' + data.event, data.data);
	}


	// Reconnect disconnected socket clients
	reconnect(intf) {
		if (config.intf[intf].enabled !== true) return;

		// Attempt reconnect if not currently connecting
		if (this.intf[intf].connecting === true) return;

		log.msg('Reconnecting \'' + intf + '\' socket client');

		// First terminate existing socket clients
		setTimeout(() => {
			this.intf[intf].end();

			setTimeout(() => {
				process.nextTick(() => {
					this.init_intf(intf);
					log.msg('Initialized \'' + intf + '\' interface');
				});
			}, 1000);
		}, 1000);
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
			if (error) {
				this.emit_log('close-error', intf);
				this.reconnect(intf);
				return;
			}

			this.emit_log('close', intf);
		});

		this.intf[intf].on('end', () => {
			this.emit_log('end', intf);
			this.reconnect(intf);
		});


		// Error events
		this.intf[intf].on('error', (error) => {
			log.msg(intf + ': error ' + error);
			this.emit('error-' + intf, error);

			console.error(intf + ': ', error);
			// this.reconnect(intf);
		});

		// Regular events
		this.intf[intf].on('connect', () => {
			log.msg('Connected \'' + intf + '\' socket client');
			this.emit('connect-' + intf);
		});

		this.intf[intf].on('data', (message) => {
			// log.msg(intf + ': data received');
			this.recv(intf, message);
		});

		this.intf[intf].on('ready', () => {
			this.emit_log('ready', intf);

			this.emit('recv-host-connect', {
				intf : intf,
			});
		});

		process.nextTick(init_intf_listeners_cb);

		log.msg('Initialized \'' + intf + '\' listeners');
	}

	// Connect socket clients
	init_intf(intf, init_intf_cb = null) {
		if (config.intf[intf].enabled !== true) return;

		log.msg('Connecting \'' + intf + '\' socket client');
		this.intf[intf].connect(config.socket[intf].path);

		typeof init_intf_cb === 'function' && init_intf_cb();
	}

	// Configure event handlers
	init_listeners(pass) {
		let intf_keys = Object.keys(config.intf);
		let intf_last = intf_keys[(intf_keys.length - 1)];

		for (let intf in config.intf) {
			// Execute callback function if this is the last interface
			if (intf === intf_last) {
				setTimeout(() => {
					process.nextTick(pass);
				}, 1000);
			}

			if (config.intf[intf].enabled !== true) continue;

			this.init_intf_listeners(intf, () => {
				// Initialize interfaces
				process.nextTick(() => {
					this.init_intf(intf, () => {
						log.msg('Initialized \'' + intf + '\' interface');
					});
				});
			});
		} // for (let intf in config.intf)
	}


	// Initialize socket clients
	init(pass) {
		for (let intf in config.intf) {
			if (config.intf[intf].enabled !== true) continue;

			log.msg('Initializing \'' + intf + '\' socket client');

			this.intf[intf] = new net.Socket({
				allowHalfOpen : false,
				readable      : true,
				writable      : true,
			});
		} // for (let intf in config.intf)

		// Setup events
		process.nextTick(() => {
			this.init_listeners(pass);
		});
	}

	// Terminate socket clients
	term(pass) {
		log.msg('Terminating');

		for (let intf in config.intf) {
			if (config.intf[intf].enabled !== true) continue;
			log.msg('Ending \'' + intf + '\' socket client');
			this.intf[intf].end();
		} // for (let intf in config.intf)

		setTimeout(() => {
			log.msg('Terminated');
			process.nextTick(pass);
		}, 500);
	}
}


module.exports = socket;
