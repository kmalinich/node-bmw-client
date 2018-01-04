/* eslint no-console:0     */
/* eslint no-undef:0       */
/* eslint no-unused-vars:0 */

const amp    = require('amp-message');
const zeromq = require('zeromq');

const EventEmitter = require('events');

class socket extends EventEmitter {
	constructor() {
		super();

		this.intf = zeromq.socket(this.get_type());
	}

	// Return zeroMQ socket type from config data
	get_type() {
		switch (app_intf) {
			case 'client' : return 'router';
			default       : return 'dealer';
		}
	}

	// Return full zeroMQ URL from config data
	get_url() {
		return config.zeromq.proto + '://' + config.zeromq.host + ':' + config.zeromq.port;
	}


	// Send data over zeroMQ
	send(event, data) {
		// Don't bother sending anything if we're disconnected
		if (status.server.connected === false) {
			// log.msg({ msg : 'Server disconnected, cannot send message' });
			return;
		}

		if (this.intf === null) return;

		if (event !== 'bus-tx') return;

		let dst = data.bus;

		let message = {
			host  : status.system,
			event : event,
			data  : data,
		};

		// Encode object as AMP message
		let amp_message = new amp();
		amp_message.push(message);

		// Send AMP message over zeroMQ
		this.intf.send([ dst, app_intf + '-tx', amp_message.toBuffer() ]);
	}


	// Configure event handlers
	init_listeners(pass, fail) {
		this.intf.on('accept', (count) => {
			log.msg({ msg : 'accept: ' + count });
			this.emit('accept', count);
		});

		this.intf.on('accept_error', (error) => {
			log.msg({ msg : 'accept error ' + error });
			console.error(error);
			this.emit('accept_error', error);
		});

		this.intf.on('bind', () => {
			log.msg({ msg : 'bind' });
			update.status('server.connected', true);

			update.status('server.connecting',   false);
			update.status('server.reconnecting', false);

			// Send this host's data to zeroMQ clients to update them
			host_data.send();

			this.emit('bind');
		});

		this.intf.on('bind_error', (error) => {
			log.msg({ msg : 'bind error ' + error });
			console.error(error);
			update.status('server.connected', false);
			this.emit('bind_error', error);
		});

		this.intf.on('close', () => {
			log.msg({ msg : 'close' });
			update.status('server.connected', false);
		});

		this.intf.on('close_error', (error) => {
			log.msg({ msg : 'close error ' + error });
			console.error(error);
			update.status('server.connected', false);
			this.emit('close_error', error);
		});

		this.intf.on('connect', () => {
			log.msg({ msg : 'connect' });
			update.status('server.connected',    true);
			update.status('server.connecting',   false);
			update.status('server.reconnecting', false);

			// Send this host's data to zeroMQ clients to update them
			host_data.send();
		});

		this.intf.on('connect_delay', () => {
			log.msg({ msg : 'connect_delay' });
		});

		this.intf.on('connect_retry', () => {
			log.msg({ msg : 'connect_retry' });
			update.status('server.connected',    false);
			update.status('server.connecting',   true);
			update.status('server.reconnecting', true);
		});

		this.intf.on('disconnect', (count) => {
			log.msg({ msg : 'disconnect: ' + count });
		});

		this.intf.on('error', (error) => {
			log.msg({ msg : 'error ' + error });
			console.error(error);
			this.emit('error', error);
		});

		this.intf.on('listen', () => {
			log.msg({ msg : 'listen' });
			this.emit('listen');
		});

		this.intf.on('monitor_error', (error) => {
			log.msg({ msg : 'monitor_error ' + error });
			console.error(error);
		});

		this.intf.on('unbind', () => {
			log.msg({ msg : 'unbind' });
			update.status('server.connected', false);

			// Reset basic vars
			json.status_reset_basic();
		});

		this.intf.on('message', (identity, topic, message) => {
			// log.msg({ msg : topic+' message received' });
			// Decode AMP message
			this.recv(message);
		});

		// Enable monitor to utilize events
		this.intf.monitor();


		// Manipulate USB LCD based on IKE ignition events
		IKE.on('ignition-poweroff', () => {
			// Overhead LCD commands
			this.lcd_command_tx('clear');
			this.lcd_command_tx('off');
		});

		IKE.on('ignition-powerup', () => {
			// Overhead LCD commands
			this.lcd_command_tx('on');
			this.lcd_text_tx({
				upper : 'State:',
				lower : 'powerup',
			});
		});


		log.msg({ msg : 'Initialized event listeners' });

		// Configure interfaces
		process.nextTick(() => {
			this.intf_config(pass, fail);
			log.msg({ msg : 'Initialized' });
		});
	}

	// Bind interface
	intf_config(pass, fail) {
		this.intf.identity = app_intf;
		log.msg({ msg : 'Set ' + this.get_type(app_intf) + ' identity: \'' + app_intf + '\'' });

		log.msg({ msg : 'Binding interface: \'' + app_intf + '\'' });
		this.intf.bind(this.get_url());

		process.nextTick(pass);
	}


	// Initialize zeroMQ server
	init(pass, fail) {
		log.msg({ msg : 'Initializing' });

		// Setup events
		process.nextTick(() => {
			this.init_listeners(pass, fail);
		});
	}

	// Terminate zeroMQ server
	term(pass, fail) {
		log.msg({ msg : 'Terminating' });

		// Disconnect interfaces
		switch (status.server.connected) {
			case true:
				// this.intf.close();
				this.intf = null;
				update.status('server.connected', false);
				break;
			case false:
				log.msg({ msg : 'zeroMQ router socket already disconnected' });
		}

		setTimeout(() => {
			log.msg({ msg : 'Terminated' });
			process.nextTick(pass);
		}, 250);
	}


	// Send USB LCD commands/text to bmwi@lcd
	lcd_color_tx(data) {
		this.send('lcd-color', data);
	}

	lcd_command_tx(data) {
		this.send('lcd-command', data);
	}

	lcd_text_tx(data) {
		this.send('lcd-text', data);
	}


	// Send and receive vehicle bus data
	bus_rx(bus, data) {
		this.send('bus-rx', {
			bus  : bus,
			data : data,
		});
	}

	bus_tx(bus, data) {
		if (bus === 'both-low') {
			this.send('bus-tx', {
				bus  : 'ibus',
				data : data,
			});

			this.send('bus-tx', {
				bus  : 'kbus',
				data : data,
			});
			return;
		}

		// If this is a KBUS packet and KBUS is disabled, send via IBUS
		if (bus === 'kbus' && config.kbus.enabled === false) bus = 'ibus';

		this.send('bus-tx', {
			bus  : bus,
			data : data,
		});
	}

	// Send status data object for use by other zeroMQ clients
	status_tx(module) {
		// If the entire status object was requested
		if (module == 'all') {
			log.msg({ msg : 'Sending full status' });

			this.send('status', status);
			host_data.send();
			return;
		}

		log.msg({ msg : 'Sending \'' + module + '\' status' });

		let msg = {};
		msg[module] = status[module];
		this.send('status', msg);
	}
}

// Handle incoming messages
socket.prototype.recv = function (message) {
	// Decode AMP-encoded messages from zeroMQ
	let data = new amp(message).shift();

	switch (data.event) {
		case 'status-request' : this.status_tx(data.data); break;
	}

	this.emit('recv-' + data.event, data.data);
};

module.exports = socket;
