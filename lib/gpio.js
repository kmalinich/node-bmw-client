const module_name = __filename.slice(__dirname.length + 1, -3).replace('-', '_');

// Only load if configured as Raspberry Pi
if (config.system.pi === true && config.gpio.enable === true && process.arch == 'arm') {
  const pi_gpio = require('pigpio');
}

function toggle(relay) {
  if (config.system.pi !== true || config.gpio.enable !== true || process.arch != 'arm') return;

  switch (relay) {
    case 1:
      gpio.relay.relay_1.digitalWrite(Math.abs(gpio.relay.relay_1.digitalRead()-1));
      break;
    case 2:
      gpio.relay.relay_2.digitalWrite(Math.abs(gpio.relay.relay_2.digitalRead()-1));
      break;
  }
}

function set(relay, value) {
  if (config.system.pi !== true || config.gpio.enable !== true || process.arch != 'arm') return;

  switch (relay) {
    case 1:
      gpio.relay.relay_1.digitalWrite(value);
      break;
    case 2:
      gpio.relay.relay_2.digitalWrite(value);
      break;
  }
}

function init(init_callback = null) {
	if (config.system.pi !== true || config.gpio.enable !== true || process.arch != 'arm') {
		if (typeof init_callback === 'function') init_callback();
		init_callback = undefined;
		return false;
	}

	log.msg({
		src : module_name,
		msg : 'Initialized',
	});

	gpio.options.edge       = pi_gpio.EITHER_EDGE;
	gpio.options.mode       = pi_gpio.OUTPUT;
	gpio.options.pullUpDown = pi_gpio.PUD_DOWN;

  pi_gpio.initialize();

  gpio.relay.relay_1 = new pi_gpio.Gpio(config.gpio.pins.relay_1, gpio.options);

  gpio.relay.relay_1.on('alert', (level, tick) => {
    gpio.state.relay_1 = level;

    log.msg({
      src : module_name,
      msg : 'relay 1 alert - level: '+level+', tick: '+tick,
    });
  });

  gpio.relay.relay_1.on('interrupt', (level) => {
    gpio.state.relay_1 = level;

    log.msg({
      src : module_name,
      msg : 'relay 1 interrupt - level: '+level,
    });
  });

  gpio.relay.relay_2 = new pi_gpio.Gpio(config.gpio.pins.relay_2, gpio.options);

  gpio.relay.relay_2.on('alert', (level, tick) => {
    gpio.state.relay_2 = level;

    log.msg({
      src : module_name,
      msg : 'relay 2 alert - level: '+level+', tick: '+tick,
    });
  });

  gpio.relay.relay_2.on('interrupt', (level) => {
    gpio.state.relay_2 = level;

    log.msg({
      src : module_name,
      msg : 'relay 2 interrupt - level: '+level,
    });
  });

	log.msg({
		src : module_name,
		msg : 'Initialized',
	});

  if (typeof init_callback === 'function') init_callback();
  init_callback = undefined;
  return;
}

function term(term_callback = null) {
	if (config.system.pi !== true || config.gpio.enable !== true || process.arch != 'arm') {
		if (typeof term_callback === 'function') term_callback();
		term_callback = undefined;
		return false;
	}

  pi_gpio.terminate();

  if (typeof term_callback === 'function') term_callback();
  term_callback = undefined;
  return;
}


module.exports = {
  options : {
    alert   : true,
    timeout : 0,
  },

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
