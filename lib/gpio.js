const module_name = __filename.slice(__dirname.length + 1, -3).replace('-', '_');

// Only load if configured as Raspberry Pi
if (config.gpio.enable === true && process.arch == 'arm') {
  pi_gpio = require('onoff');
}

function toggle(relay) {
  if (config.gpio.enable !== true || process.arch != 'arm') return;

  switch (relay) {
    case 1:
      gpio.relay.relay_1.writeSync(Math.abs(gpio.relay.relay_1.digitalRead()-1));
      break;
    case 2:
      gpio.relay.relay_2.writeSync(Math.abs(gpio.relay.relay_2.digitalRead()-1));
      break;
  }
}

function set(relay, value) {
  if (config.gpio.enable !== true || process.arch != 'arm') return;

  switch (relay) {
    case 1:
      gpio.relay.relay_1.writeSync(value);
      break;
    case 2:
      gpio.relay.relay_2.writeSync(value);
      break;
  }
}

function init(init_callback = null) {
	if (config.gpio.enable !== true || process.arch != 'arm') {
		if (typeof init_callback === 'function') init_callback();
		init_callback = undefined;
		return false;
	}

  gpio.relay.relay_1 = new pi_gpio.Gpio(config.gpio.pins.relay_1, 'high');
  gpio.relay.relay_2 = new pi_gpio.Gpio(config.gpio.pins.relay_2, 'high');
	// gpio.relay.relay_1.setActiveLow(true);
	// gpio.relay.relay_2.setActiveLow(true);

	log.msg({
		src : module_name,
		msg : 'Initialized',
	});

  if (typeof init_callback === 'function') init_callback();
  init_callback = undefined;
  return;
}

function term(term_callback = null) {
	if (config.gpio.enable !== true || process.arch != 'arm') {
		if (typeof term_callback === 'function') term_callback();
		term_callback = undefined;
		return false;
	}

	// Turn off the relays on exit
	gpio.relay.relay_1.writeSync(1);
	gpio.relay.relay_2.writeSync(1);

	log.msg({
		src : module_name,
		msg : 'Terminated',
	});

	if (typeof term_callback === 'function') term_callback();
	term_callback = undefined;
	return;
}


module.exports = {
  // Might switch these two to arrays
  relay : {
    relay_1 : null,
    relay_2 : null,
  },

  state : {
    relay_1 : 0,
    relay_2 : 0,
  },

  // Functions
  init   : (init_callback) => { init(init_callback); },
  term   : (term_callback) => { term(term_callback); },
  set    : (relay, value)  => { set(relay, value);   },
  toggle : (relay)         => { toggle(relay);       },
};
