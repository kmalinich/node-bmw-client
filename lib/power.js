const EventEmitter = require('events');


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

		this.emit('active', status.power.active);
	}

	init_listeners() {
		update.on('status.vehicle.ignition', (data) => {
			switch (data.new) {
				case 'accessory' :
				case 'run'       :
				case 'start'     : {
					// Set up watchers for next go-around
					update.status('power.waiting.doors.sealed',   false);
					update.status('power.waiting.doors.unsealed', false);
					update.status('power.waiting.ignition.off',   true);
					update.status('power.waiting.ignition.on',    false);

					this.power(true);
					break;
				}

				case 'off' : {
					// Set up watchers for next go-around
					update.status('power.waiting.ignition.off', false);

					// Skip waiting for doors.unsealed if they're already unsealed
					update.status('power.waiting.doors.sealed',   !status.doors.sealed);
					update.status('power.waiting.doors.unsealed',  status.doors.sealed);
				}
			}
		});

		update.on('status.doors.sealed', (data) => {
			if (status.power.waiting.ignition.on === true)  return;
			if (status.vehicle.ignition          !== 'off') return;

			switch (data.new) {
				case false : {
					update.status('power.waiting.doors.sealed', true);

					if (status.power.waiting.doors.unsealed === true) {
						update.status('power.waiting.doors.unsealed', false);
					}

					break;
				}

				case true : {
					if (status.power.waiting.doors.sealed === true) {
						update.status('power.waiting.doors.sealed', false);
						update.status('power.waiting.ignition.on',  true);
						this.power(false);
					}
				}
			}
		});

		log.msg('Initialized listeners');
	}
}

module.exports = power;
