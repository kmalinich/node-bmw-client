// Thanks
// https://gist.github.com/Xaekai/e1f711cb0ad865deafc11185641c632a

const net  = require('net');
const jsoc = require('json-socket');

const EventEmitter = require('events');

// Bump up default max event listeners
EventEmitter.defaultMaxListeners = 20;


// Socket connection statistics output
let statsInterval = null;


// Output formatted error message
function error_out(intf_name = 'unknown', message, error) {
	let error_string = `[${intf_name}] '${message}'`;

	if (typeof error.errno   === 'number') error_string += ` - errno: ${error.errno}`;
	if (typeof error.code    === 'string') error_string += ' - code: '    + error.code;
	if (typeof error.syscall === 'string') error_string += ' - syscall: ' + error.syscall;
	if (typeof error.address === 'string') error_string += ' - address: ' + error.address;
	if (typeof error.message === 'string') error_string += ' - message: ' + error.message;

	log.error(error_string);

	return error_string;
} // error_out(intf_name, message, error)


class socket extends EventEmitter {
	constructor() {
		super();

		this.terminating = false;

		this.intf = {
			can0 : null,
			can1 : null,
			dbus : null,
			ibus : null,
			isp2 : null,
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
	} // constructor()


	// Output a log message, and emit an event with the same data
	emit_log(topic, message) {
		log.lib('Event: ' + topic + ' => ' + message);
		this.emit(topic, message);
	} // emit_log(topic, message)

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
	} // bus_tx(data)


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

		const msg = {};
		msg[module] = status[module];
		this.send('status', msg);
	} // status_tx(module)


	// Send message over socket
	send(event, message) {
		// Don't send messages if shutting down
		if (this.terminating !== false) return;

		if (typeof this.intf[message.bus] === 'undefined') return;
		if (this.intf[message.bus]        === null)        return;

		if (event !== 'bus-tx') return;

		// log.lib(event + ' message sent to ' + message.bus + ' (' + message.bus + ')');

		// Send message over socket
		this.intf[message.bus].sendMessage({
			intf : status.system.intf,
			event,
			data : message,
		});
	} // send(event, message)

	// Handle incoming messages
	recv(intf, message) {
		switch (message.event) {
			case 'host-connect' : log.lib('Interface connected: ' + intf); break;

			case 'status-request' : this.status_tx(message.data); break;
		}

		this.emit('recv-' + message.event, message.data);
	} // recv(intf, message)


	// Reconnect disconnected sockets
	async reconnect(intf, override_check = false) {
		// Don't reconnect if shutting down
		if (this.terminating !== false) return;

		// Don't reconnect if this interface is not enabled
		if (config.intf[intf].enabled !== true) return;

		// Don't reconnect if already connected
		if (status.server.sockets[intf].connected !== false) return;

		// Don't reconnect if already reconnecting and not being overriden
		if (override_check !== true && status.server.sockets[intf].reconnecting !== false) return;

		update.status('server.sockets.' + intf + '.reconnecting', true,  false);

		// Knock it's block off first
		await this.intf[intf]._socket.destroy();
		update.status('server.sockets.' + intf + '.connected', false, false);

		await new Promise(resolve => setTimeout(resolve, 1000));

		log.lib(`Reconnecting '${intf}' socket`);

		await this.init_intf(intf, true);

		// Try again if not connected
		setTimeout(() => {
			this.reconnect(intf, true);
		}, 1000);
	} // async reconnect(intf, override_check)


	// Initialize event listeners for a specific interface
	async init_intf_listeners(intf) {
		// Return here if not configured to use this interface
		if (config.intf[intf].enabled !== true) return;

		// Verbose events
		this.intf[intf].on('drain',   () => { this.emit_log('drain',   intf); });
		this.intf[intf].on('listen',  () => { this.emit_log('listen',  intf); });
		this.intf[intf].on('timeout', () => { this.emit_log('timeout', intf); });


		// Close events
		this.intf[intf].on('close', async (error) => {
			update.status('server.sockets.' + intf + '.connected', false, false);

			if (error) {
				error_out(intf, 'onClose', error);
				this.emit_log('close-error', intf);

				await this.reconnect(intf);
				return;
			}

			this.emit_log('close', intf);
			await this.reconnect(intf);
		});

		this.intf[intf].on('end', async () => {
			update.status('server.sockets.' + intf + '.connected', false, false);

			this.emit_log('end', intf);

			await this.reconnect(intf);
		});

		this.intf[intf].on('timeout', async () => {
			this.emit_log('timeout', intf);
			await this.reconnect(intf);
		});


		// Error events
		this.intf[intf].on('error', async (error) => {
			update.status('server.sockets.' + intf + '.connected', false, false);

			error_out(intf, 'onError', error);
			this.emit('error-' + intf, error);
			await this.reconnect(intf);
		});


		// Normal events
		this.intf[intf].on('connect', () => {
			log.lib('Connected \'' + intf + '\' socket');

			this.emit('connect-' + intf);
		});

		this.intf[intf].on('message', message => {
			this.recv(intf, message);
		});

		this.intf[intf].on('ready', () => {
			this.emit_log('ready', intf);

			update.status('server.sockets.' + intf + '.connected',    true, false);
			update.status('server.sockets.' + intf + '.connecting',   false, false);
			update.status('server.sockets.' + intf + '.reconnecting', false, false);
		});

		log.lib('Initialized \'' + intf + '\' listeners');
	} // async init_intf_listeners(intf)

	// Connect sockets
	async init_intf(intf, reconnecting = false) {
		// Don't connect if shutting down
		if (this.terminating !== false) return;

		if (status.server.sockets[intf].reconnecting !== true) {
			if (this.intf[intf]._socket.connecting !== false || status.server.sockets[intf].connecting !== false) return;
		}

		if (reconnecting === false) log.lib('Connecting \'' + intf + '\' socket');

		update.status('server.sockets.' + intf + '.connecting', true, false);

		await this.intf[intf].connect(config.socket[intf].path);
	} // async init_intf(intf, reconnecting)


	// Initialize sockets
	async init() {
		log.lib('Initializing');

		for (const intf in config.intf) {
			update.status('server.sockets.' + intf + '.connected',    false);
			update.status('server.sockets.' + intf + '.connecting',   false);
			update.status('server.sockets.' + intf + '.reconnecting', false);

			// Skip if this interface is disabled
			if (config.intf[intf].enabled !== true) continue;

			log.lib('Initializing \'' + intf + '\'');

			const socket_options = {
				allowHalfOpen : true,
				readable      : true,
				writable      : true,
			};

			// Decorate socket to be a JsonSocket
			this.intf[intf] = new jsoc(new net.Socket(socket_options));

			// Enable keepalive
			await this.intf[intf]._socket.setKeepAlive(true);

			// Disable Nagle algorithm
			await this.intf[intf]._socket.setNoDelay(true);

			// Periodically output socket stats
			clearInterval(statsInterval);
			statsInterval = null;

			statsInterval = setInterval(() => {
				log.lib('stats ' + intf + ' ' + JSON.stringify({
					bufferSize   : this.intf[intf]._socket.bufferSize,
					bytesRead    : this.intf[intf]._socket.bytesRead,
					bytesWritten : this.intf[intf]._socket.bytesWritten,
				}));
			}, 60000);

			await this.init_intf_listeners(intf);

			// Initialize interfaces
			await this.init_intf(intf);

			log.lib('Initialized \'' + intf + '\'');
		} // for (let intf in config.intf)

		log.lib('Initialized');
	} // async init()

	// Terminate sockets
	async term() {
		log.lib('Terminating');

		this.terminating = true;

		for (const intf in config.intf) {
			if (config.intf[intf].enabled !== true) continue;
			log.lib('Ending \'' + intf + '\' socket');

			await this.intf[intf].end();
			await this.intf[intf]._socket.destroy();

			update.status('server.sockets.' + intf + '.connected',    false, false);
			update.status('server.sockets.' + intf + '.connecting',   false, false);
			update.status('server.sockets.' + intf + '.reconnecting', false, false);
		} // for (let intf in config.intf)

		log.lib('Terminated');
	} // async term()
}


module.exports = socket;
