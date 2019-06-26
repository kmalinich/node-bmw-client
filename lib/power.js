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
		update.status('power.active', state_target, false);

		this.emit('active', state_target);
	}

	init_listeners() {
		// Keyfob message handler
		update.on('status.cas.keyfob.buttons.unlock', (data) => {
			if (data.new !== true) return;

			// Set up watchers for next go-around
			update.status('power.waiting.doors.closed', false, false);
			update.status('power.waiting.doors.opened', false, false);
			update.status('power.waiting.ignition.off', false, false);
			update.status('power.waiting.ignition.on',  true,  false);

			// Clear power timeout if set
			if (timeout_power !== null) {
				log.msg('Clearing power timeout');
				clearTimeout(timeout_power);
				timeout_power = null;
			}

			// Set up failsafe timeout
			// Utilized if vehicle is unlocked but never started
			timeout_power = setTimeout(() => {
				log.msg('Hit keyfob-initiated power timeout - turning off');

				this.power(false);

				timeout_power = null;
			}, config.power.timeout);

			// Power on
			this.power(true);
		});


		// Ignition status handler
		update.on('status.vehicle.ignition', (data) => {
			switch (data.new) {
				case 'accessory' :
				case 'run'       :
				case 'start'     : {
					// Set up watchers for next go-around
					update.status('power.waiting.doors.closed', false, false);
					update.status('power.waiting.doors.opened', false, false);
					update.status('power.waiting.ignition.off', true,  false);
					update.status('power.waiting.ignition.on',  false, false);

					// Clear power timeout if set
					if (timeout_power !== null) {
						log.msg('Clearing power timeout');
						clearTimeout(timeout_power);
						timeout_power = null;
					}

					// Power on
					this.power(true);
					break;
				}

				case 'off' : {
					// Set up watchers for next go-around
					update.status('power.waiting.ignition.off', false, false);

					// Skip waiting for doors.opened if they're already unsealed
					update.status('power.waiting.doors.closed', status.doors.opened, false);
					update.status('power.waiting.doors.opened', status.doors.closed, false);

					// Set up failsafe timeout
					timeout_power = setTimeout(() => {
						log.msg('Hit power timeout - turning off');

						this.power(false);

						timeout_power = null;
					}, config.power.timeout);
				}
			}
		});


		// Doors now closed handler
		update.on('status.doors.closed', (data) => {
			if (status.power.waiting.ignition.on === true)  return;
			if (status.vehicle.ignition          !== 'off') return;

			if (data.new !== true) return;

			if (status.power.waiting.doors.closed !== true) return;

			update.status('power.waiting.doors.closed', false, false);
			update.status('power.waiting.ignition.on',  true,  false);

			this.power(false);
		});

		// Doors now opened handler
		update.on('status.doors.opened', (data) => {
			if (status.power.waiting.ignition.on === true)  return;
			if (status.vehicle.ignition          !== 'off') return;

			if (data.new !== true) return;

			// Now wait for the doors to close
			update.status('power.waiting.doors.closed', true);

			if (status.power.waiting.doors.opened === true) {
				update.status('power.waiting.doors.opened', false, false);
			}
		});


		log.msg('Initialized listeners');
	}
}


module.exports = power;
