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
	}


	// Initialize event listeners for a specific interface
	init_intf_listeners(intf, init_intf_listeners_cb) {
		// Return here if not configured to use this interface
		if (config.bus[intf].enabled !== true) {
			process.nextTick(init_intf_listeners_cb);
			return;
		}

		this.intf[intf].on('connect', () => {
			log.msg('Connected \'' + intf + '\' socket client');
		});

		this.intf[intf].on('error', (error) => {
			log.msg(intf + ': error ' + error);
			this.emit('error-' + intf, error);
			console.error(intf + ': ', error);
		});

		this.intf[intf].on('listen', () => {
			log.msg(intf + ': listen');
			this.emit('listen-' + intf);
		});

		this.intf[intf].on('end', () => {
			log.msg(intf + ': end');
		});

		this.intf[intf].on('data', (message) => {
			log.msg(intf + ': data received');
			this.recv(intf, message);
		});

		log.msg('Initialized \'' + intf + '\' listeners');

		process.nextTick(init_intf_listeners_cb);
	}

	// Connect socket clients
	init_intf(intf) {
		if (config.bus[intf].enabled === true) {
			log.msg('Connecting \'' + intf + '\' socket client');
			this.intf[intf].connect(config.socket[intf].path);
		}
	}

	// Configure event handlers
	init_listeners(pass) {
		this.init_intf_listeners('can0', () => {
			// Initialize interfaces
			process.nextTick(() => {
				this.init_intf('can0');
				log.msg('Initialized \'can0\' interface');
			});
		});

		this.init_intf_listeners('can1', () => {
			// Initialize interfaces
			process.nextTick(() => {
				this.init_intf('can1');
				log.msg('Initialized \'can1\' interface');
			});
		});

		this.init_intf_listeners('dbus', () => {
			// Initialize interfaces
			process.nextTick(() => {
				this.init_intf('dbus');
				log.msg('Initialized \'dbus\' interface');
			});
		});

		this.init_intf_listeners('ibus', () => {
			// Initialize interfaces
			process.nextTick(() => {
				this.init_intf('ibus');
				log.msg('Initialized \'ibus\' interface');
			});
		});

		this.init_intf_listeners('kbus', () => {
			// Initialize interfaces
			process.nextTick(() => {
				this.init_intf('kbus');
				log.msg('Initialized \'kbus\' interface');
			});
		});

		setTimeout(() => {
			log.msg('Initialized listeners');
			process.nextTick(pass);
		}, 250);
	}


	// Initialize socket clients
	init(pass) {
		if (config.bus.can0.enabled === true) {
			log.msg('Initializing \'can0\' socket client');

			this.intf.can0 = new net.Socket({
				allowHalfOpen : false,
				readable      : true,
				writable      : true,
			});
		}

		if (config.bus.can1.enabled === true) {
			log.msg('Initializing \'can1\' socket client');

			this.intf.can1 = new net.Socket({
				allowHalfOpen : false,
				readable      : true,
				writable      : true,
			});
		}

		if (config.bus.dbus.enabled === true) {
			log.msg('Initializing \'dbus\' socket client');

			this.intf.dbus = new net.Socket({
				allowHalfOpen : false,
				readable      : true,
				writable      : true,
			});
		}

		if (config.bus.ibus.enabled === true) {
			log.msg('Initializing \'ibus\' socket client');

			this.intf.ibus = new net.Socket({
				allowHalfOpen : false,
				readable      : true,
				writable      : true,
			});
		}

		if (config.bus.kbus.enabled === true) {
			log.msg('Initializing \'kbus\' socket client');

			this.intf.kbus = new net.Socket({
				allowHalfOpen : false,
				readable      : true,
				writable      : true,
			});
		}

		// Setup events
		process.nextTick(() => {
			this.init_listeners(pass);
		});
	}

	// Terminate socket server
	term(pass) {
		log.msg('Terminating');

		// Disconnect interface
		switch (status.server.connected) {
			case false : {
				log.msg('socket router socket already disconnected');
				break;
			}

			case true : {
				this.intf = null;
				update.status('server.connected', false);
			}
		}

		setTimeout(() => {
			log.msg('Terminated');
			process.nextTick(pass);
		}, 250);
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
				if (config.bus[data.bus].enabled === true) {
					data.bus = 'kbus';
					this.send('bus-tx', data);
				}

				break;
			}

			case 'kbus' : {
				// If this is a KBUS packet and KBUS is disabled, send via IBUS
				if (config.bus[data.bus].enabled !== true) data.bus = 'ibus';
				this.send('bus-tx', data);
				break;
			}

			default : {
				if (config.bus[data.bus].enabled !== true) return;
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
}


module.exports = socket;
