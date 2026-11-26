const EventEmitter = require('events');

// Bump up default max event listeners
EventEmitter.defaultMaxListeners = 20;


let timeoutPower = null;

class power extends EventEmitter {
	power(state) {
		let stateTarget;
		switch (state) {
			case 0     :
			case 'off' :
			case false : stateTarget = false; break;

			case 1    :
			case 'on' :
			case true : stateTarget = true; break;

			default : {
				log.lib(`Invalid power state '${state}'`);
				return;
			}
		}

		if (status.power.active === stateTarget) {
			log.lib(`Power state is already '${state}'`);
			return;
		}

		log.lib(`Settign power to state '${state}'`);
		update.status('power.active', stateTarget, false);

		this.emit('active', stateTarget);
	}

	initListeners() {
		// Keyfob message handler
		update.on('status.cas.keyfob.buttons.unlock', data => {
			if (data.new !== true) return;

			// Set up watchers for next go-around
			update.status('power.waiting.doors.closed', false, false);
			update.status('power.waiting.doors.opened', false, false);
			update.status('power.waiting.ignition.off', false, false);
			update.status('power.waiting.ignition.on',  true,  false);

			// Clear power timeout if set
			if (timeoutPower !== null) {
				log.lib('Clearing power timeout');
				clearTimeout(timeoutPower);
				timeoutPower = null;
			}

			// Set up failsafe timeout
			// Utilized if vehicle is unlocked but never started
			timeoutPower = setTimeout(() => {
				log.lib('Hit keyfob-initiated power timeout - turning off');

				this.power(false);

				timeoutPower = null;
			}, config.power.timeout); // TODO: Change this to seconds or minutes

			// Power on
			this.power(true);
		});


		// Ignition status handler
		update.on('status.vehicle.ignition', data => {
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
					if (timeoutPower !== null) {
						log.lib('Clearing power timeout');
						clearTimeout(timeoutPower);
						timeoutPower = null;
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
					timeoutPower = setTimeout(() => {
						log.lib('Hit power timeout - turning off');

						this.power(false);

						timeoutPower = null;
					}, config.power.timeout);
				}
			}
		});


		// Doors now closed handler
		update.on('status.doors.closed', data => {
			if (status.power.waiting.ignition.on === true)  return;
			if (status.vehicle.ignition          !== 'off') return;

			if (data.new !== true) return;

			if (status.power.waiting.doors.closed !== true) return;

			update.status('power.waiting.doors.closed', false, false);
			update.status('power.waiting.ignition.on',  true,  false);

			this.power(false);
		});

		// Doors now opened handler
		update.on('status.doors.opened', data => {
			if (status.power.waiting.ignition.on === true)  return;
			if (status.vehicle.ignition          !== 'off') return;

			if (data.new !== true) return;

			// Now wait for the doors to close
			update.status('power.waiting.doors.closed', true);

			if (status.power.waiting.doors.opened === true) {
				update.status('power.waiting.doors.opened', false, false);
			}
		});


		log.lib('Initialized listeners');
	}
}


module.exports = power;
