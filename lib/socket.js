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


	// Initialize zeroMQ server
	init(pass) {
		log.msg('Initializing');

		// Enable monitor to utilize events
		this.intf.monitor();
		log.msg('Initialized monitor on interface');

		// Bind and configure interface
		this.intf.identity = app_intf;
		log.msg('Set ' + this.get_type(app_intf) + ' identity: \'' + app_intf + '\'');

		this.intf.bind(this.get_url());
		log.msg('Bound interface: \'' + this.get_url() + '\'');

		// Setup events
		process.nextTick(() => {
			this.init_listeners(pass);
			log.msg('Initialized');
		});
	}

	// Configure event handlers
	init_listeners(pass) {
		// this.intf.on('accept', (count) => {
		// 	log.msg('accept: ' + count);
		// 	this.emit('accept', count);
		// });

		this.intf.on('accept_error', (error) => {
			log.msg('accept error ' + error);
			this.emit('accept_error', error);
		});

		this.intf.on('bind', () => {
			log.msg('bind');
			update.status('server.connected', true);

			update.status('server.connecting',   false);
			update.status('server.reconnecting', false);

			this.emit('bind');
		});

		this.intf.on('bind_error', (error) => {
			log.msg('bind error ' + error);
			update.status('server.connected', false);
			this.emit('bind_error', error);
		});

		this.intf.on('close', () => {
			log.msg('close');
			update.status('server.connected', false);
		});

		this.intf.on('close_error', (error) => {
			log.msg('close error ' + error);
			update.status('server.connected', false);
			this.emit('close_error', error);
		});

		this.intf.on('connect', () => {
			log.msg('connect');
			update.status('server.connected',    true);
			update.status('server.connecting',   false);
			update.status('server.reconnecting', false);
		});

		this.intf.on('connect_delay', () => {
			log.msg('connect_delay');
		});

		this.intf.on('connect_retry', () => {
			log.msg('connect_retry');
			update.status('server.connected',    false);
			update.status('server.connecting',   true);
			update.status('server.reconnecting', true);
		});

		this.intf.on('disconnect', (count) => {
			log.msg('disconnect: ' + count);
		});

		this.intf.on('error', (error) => {
			log.msg('error ' + error);
			this.emit('error', error);
		});

		this.intf.on('listen', () => {
			log.msg('listen');
			this.emit('listen');
		});

		this.intf.on('monitor_error', (error) => {
			log.msg('monitor_error ' + error);
		});

		this.intf.on('unbind', () => {
			log.msg('unbind');
			update.status('server.connected', false);
		});

		this.intf.on('message', (identity, topic, message) => {
			// log.msg(topic + ' message received');
			this.recv(message);
		});


		// Manipulate USB LCD on power lib active event
		update.on('status.power.active', (data) => {
			switch (data.new) {
				case false : {
					this.lcd_tx_command('on');
					this.lcd_tx_text({
						upper : 'State:',
						lower : 'powerup',
					});
					break;
				}

				case true : {
					this.lcd_tx_command('clear');
					this.lcd_tx_command('off');
				}
			}
		});

		log.msg('Initialized listeners');

		process.nextTick(pass);
	}

	// Terminate zeroMQ server
	term(pass) {
		log.msg('Terminating');

		// Disconnect interface
		switch (status.server.connected) {
			case false : {
				log.msg('zeroMQ router socket already disconnected');
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


	// Send USB LCD commands/text to bmwi@lcd
	lcd_tx_color(data)   { this.send('lcd-color',   data); }
	lcd_tx_command(data) { this.send('lcd-command', data); }
	lcd_tx_text(data)    { this.send('lcd-text',    data); }


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


	// Send status data object for use by other zeroMQ clients
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


	// Handle incoming messages
	recv(message) {
		// Decode AMP-encoded messages from zeroMQ
		let data = new amp(message).shift();

		switch (data.event) {
			case 'host-connect' : log.msg('Interface connected: ' + data.data.intf); break;

			case 'status-request' : this.status_tx(data.data); break;
		}

		this.emit('recv-' + data.event, data.data);
	}

	// Send data over zeroMQ
	send(event, data) {
		// Don't bother sending anything if we're disconnected
		if (status.server.connected === false) {
			// log.msg('Server disconnected, cannot send message);
			return;
		}

		if (this.intf === null) return;

		if (event !== 'bus-tx') return;

		let dst = data.bus;

		let message = {
			host : {
				name : status.system.host.short,
				intf : status.system.intf,
			},

			event : event,
			data  : data,
		};

		// Encode object as AMP message
		let amp_message = new amp();
		amp_message.push(message);

		// Send AMP message over zeroMQ
		this.intf.send([ dst, app_intf + '-tx', amp_message.toBuffer() ]);
	}
}

module.exports = socket;
