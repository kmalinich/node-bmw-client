const EventEmitter = require('events');

let timeout_power = null;

class power extends EventEmitter {
	// Functions
	power(state) {
		let state_target;
		switch (state) {
			case 0     :
			case 'off' :
			case false : state_target = false; break;

			case 1    :
			case 'on' :
			case true : state_target = true; break;

			default : {
				log.msg('Invalid power state: \'' + state + '\'');
				return;
			}
		}

		if (status.power.active === state_target) {
			log.msg('Power state is already \'' + state + '\'');
			return;
		}

		log.msg('Setting power to state : ' + state_target);
		update.status('power.active', state_target);

		this.emit('active', state_target);
	}

	init_listeners() {
		update.on('status.vehicle.ignition', (data) => {
			switch (data.new) {
				case 'accessory' :
				case 'run'       :
				case 'start'     : {
					// Set up watchers for next go-around
					update.status('power.waiting.doors.closed');
					update.status('power.waiting.doors.open');
					update.status('power.waiting.ignition.off', true);
					update.status('power.waiting.ignition.on');

					if (timeout_power !== null) {
						log.msg('Clearing power timeout');
						clearTimeout(timeout_power);
						timeout_power = null;
					}

					this.power(true);
					break;
				}

				case 'off' : {
					// Set up watchers for next go-around
					update.status('power.waiting.ignition.off', true);

					// Skip waiting for doors.open if they're already unsealed
					update.status('power.waiting.doors.closed', status.doors.open);
					update.status('power.waiting.doors.open',   status.doors.closed);

					// Set up failsafe timeout
					timeout_power = setTimeout(() => {
						log.msg('Hit power timeout - turning off');

						this.power(false);

						timeout_power = null;
					}, config.power.timeout);
				}
			}
		});

		update.on('status.doors.closed', (data) => {
			if (status.power.waiting.ignition.on === true)  return;
			if (status.vehicle.ignition          !== 'off') return;

			if (data.new !== true) return;

			if (status.power.waiting.doors.closed !== true) return;

			update.status('power.waiting.doors.closed');
			update.status('power.waiting.ignition.on', true);

			this.power(false);
		});

		update.on('status.doors.open', (data) => {
			if (status.power.waiting.ignition.on === true)  return;
			if (status.vehicle.ignition          !== 'off') return;

			if (data.new !== true) return;

			update.status('power.waiting.doors.closed', true);

			if (status.power.waiting.doors.open === true) {
				update.status('power.waiting.doors.open');
			}
		});

		log.msg('Initialized listeners');
	}
}

module.exports = power;
