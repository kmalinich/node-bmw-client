// Convert integer to hex string
function i2s(data, prefix = true) {
	var hexstr = data.toString(16).toUpperCase();
  var hexstr = hexstr.length === 1 && '0'+hexstr || hexstr;
  var string = prefix === true && '0x'+hexstr || hexstr;
  return string;
}

// Clean all the text strings
function clean_class_all() {
	// This is really dumb and there is a better way
	clean_class('#engine-running');
	clean_class('#engine-speed');
	clean_class('#doors-front-left');
	clean_class('#doors-front-right');
	clean_class('#doors-hood');
	clean_class('#doors-rear-left');
	clean_class('#doors-rear-right');
	clean_class('#doors-trunk');
	clean_class('#obc-aux-heat-timer-1');
	clean_class('#obc-aux-heat-timer-2');
	clean_class('#obc-coding-unit-cons');
	clean_class('#obc-coding-unit-distance');
	clean_class('#obc-coding-unit-speed');
	clean_class('#obc-coding-unit-temp');
	clean_class('#obc-coding-unit-time');
	clean_class('#obc-consumption-1');
	clean_class('#obc-consumption-1-unit');
	clean_class('#obc-consumption-2');
	clean_class('#obc-consumption-2-unit');
	clean_class('#obc-date');
	clean_class('#obc-distance');
	clean_class('#obc-distance-unit');
	clean_class('#obc-range');
	clean_class('#obc-range-unit');
	clean_class('#obc-speedavg');
	clean_class('#obc-speedavg-unit');
	clean_class('#obc-speedlimit');
	clean_class('#obc-speedlimit-unit');
	clean_class('#obc-stopwatch');
	clean_class('#obc-temp-exterior');
	clean_class('#obc-temp-exterior-unit');
	clean_class('#obc-time');
	clean_class('#obc-timer');
	clean_class('#temperature-coolant');
	clean_class('#temperature-coolant-unit');
	clean_class('#vehicle-handbrake');
	clean_class('#vehicle-ignition');
	clean_class('#vehicle-reverse');
	clean_class('#vehicle-speed');
	clean_class('#vehicle-speed-unit');
	clean_class('#windows-front-left');
	clean_class('#windows-front-right');
	clean_class('#windows-rear-left');
	clean_class('#windows-rear-right');
	clean_class('#windows-roof');
	//clean_class('');
}

// Remove all color-coded CSS classes from a text id
function clean_class(id) {
	$(id).removeClass('text-danger').removeClass('text-success').removeClass('text-warning').removeClass('text-primary').removeClass('text-info').text('');
}

function hdmi_command(command) {
	$.ajax({
		url      : '/api/hdmi',
		type     : 'POST',
		dataType : 'json',
		data     : {
			command : command,
		},
		success : (return_data) => {
			console.log(return_data);
		}
	});
}

function form_gm() {
	console.log($('#form-gm').serialize());
	$.ajax({
		url      : '/api/gm',
		type     : 'POST',
		dataType : 'json',
		data     : $('#form-gm').serialize(),
		success  : (return_data) => {
			console.log(return_data);
		}
	});
}

function form_ike_get() {
	$.ajax({
		url      : '/api/ike',
		type     : 'POST',
		dataType : 'json',
		data     : $('#form-ike-get').serialize(),
		success  : (return_data) => {
			console.log(return_data);
		}
	});
}

function form_ike_reset() {
  var input_data = $('#form-ike-reset').serializeArray().map((v) => {
    return v.value;
  });

  var post_data = {
		command : 'obc-reset',
		value   : input_data[0],
	};

	console.log(post_data);
	$.ajax({
		url      : '/api/ike',
		type     : 'POST',
		dataType : 'json',
		data     : post_data,
		success  : (return_data) => {
			console.log(return_data);
		}
	});
}

function ike_text() {
	$.ajax({
		url      : '/api/ike',
		type     : 'POST',
		dataType : 'json',
		data     : {
			command : 'ike-text',
			value   : $('#ike-text').val(),
		},
		success  : (return_data) => {
			console.log(return_data);
		}
	});
}

function form_lcm() {
	$.ajax({
		url      : '/api/lcm',
		type     : 'POST',
		dataType : 'json',
		data     : $('#form-lcm').serialize(),
		success  : (return_data) => {
			console.log(return_data);
		}
	});
}

// Central locking/unlocking
function gm_cl(action) {
	console.log('gm_cl(%s);', action);

	$.ajax({
		url      : '/api/gm',
		type     : 'POST',
		dataType : 'json',
		data     : {
'command'        : 'locks',
'command-action' : action,
		},
		success : (return_data) => {
			console.log(return_data);
		}
	});
}

// AJAX for GM interior_light
function gm_interior_light(value) {
	$.ajax({
		url      : '/api/gm',
		type     : 'POST',
		dataType : 'json',
		data     : 'interior-light='+value,
		success  : (return_data) => {
			console.log(return_data);
		}
	});
}

// GM window control
function gm_windows(window, action) {
	console.log('gm_windows(%s, %s);', window, action);

	$.ajax({
		url      : '/api/gm',
		type     : 'POST',
		dataType : 'json',
		data     : {
'window'        : window,
'window-action' : action,
		},
		success  : (return_data) => {
			console.log(return_data);
		}
	});
}

// AJAX for IKE backlight
function ike_backlight(value) {
	console.log('ike_backlight(%s);', value);

	$.ajax({
		url      : '/api/ike',
		type     : 'POST',
		dataType : 'json',
		data     : 'ike-backlight='+value,
		success  : (return_data) => {
			console.log(return_data);
		}
	});
}

function ike_set_clock() {
	$.ajax({
		url      : '/api/ike',
		type     : 'POST',
		dataType : 'json',
		success  : (return_data) => {
			console.log(return_data);
		}
	});
}

// AJAX for LCM dimmer
function lcm_dimmer(value) {
	console.log('lcm_dimmer(%s);', value);

	$.ajax({
		url      : '/api/lcm',
		type     : 'POST',
		dataType : 'json',
		data     : 'lcm-dimmer='+value,
		success  : (return_data) => {
			console.log(return_data);
		}
	});
}

// Get GM IO status
function gm_get() {
	console.log('gm_get()');

	$.ajax({
		url      : '/api/gm',
		type     : 'POST',
		dataType : 'json',
		data     : {
'command' : 'door-status',
		},
		success : (return_data) => {
			console.log(return_data);
		}
	});

	$.ajax({
		url      : '/api/gm',
		type     : 'POST',
		dataType : 'json',
		data     : {
'command' : 'io-status',
		},
		success : (return_data) => {
			console.log(return_data);
		}
	});
}

// Get LCM IO status
function lcm_get() {
	console.log('lcm_get()');

	$.ajax({
		url      : '/api/lcm',
		type     : 'POST',
		dataType : 'json',
		data     : 'lcm-get=true',
		success  : (return_data) => {
			console.log(return_data);
		}
	});
}

// Prepare GM page
function prepare_gm() {
	prepare_gm_interior_light();
}

// Initialize GM interior_light slider
function prepare_gm_interior_light() {
	var slider = $('#slider-gm-interior-light')[0];

	noUiSlider.create(slider, {
		start   : 0,
		step    : 1,
		connect : [true, false],
		range   : {
'min': 0,
'max': 255
		}
	});

	slider.noUiSlider.on('update', (data) => {
		var value = parseInt(data[0]);
		gm_interior_light(value);
	});
}

// Prepare IKE page
function prepare_ike() {
	prepare_ike_backlight();
}

// Initialize IKE backlight slider
function prepare_ike_backlight() {
	$('#slider-ike-backlight').on('slideStart', (data) => {
		console.log('ike_backlight_slideStart: %s', data.value);
		ike_backlight(data.value);
	});

	$('#slider-ike-backlight').on('slideStop', (data) => {
		console.log('ike_backlight_slidestop: %s', data.value);
		ike_backlight(data.value);
	});
}

// Prepare LCM page
function prepare_lcm() {
	prepare_lcm_dimmer();
}

// Initialize LCM dimmer slider
function prepare_lcm_dimmer() {
	var slider = $('#slider-lcm-dimmer')[0];

	noUiSlider.create(slider, {
		start   : 0,
		step    : 1,
		connect : [true, false],
		range   : {
'min': 0,
'max': 255
		}
	});

	slider.noUiSlider.on('change', (data) => {
		var value = parseInt(data[0]);
		console.log('LCM dimmer slider: %s', value);
	});
}

// Get status object, parse, and display
function status() {
	$.ajax({
		url      : '/api/status',
		type     : 'GET',
		dataType : 'json',
		success  : (return_data) => {
			// Clean up page
			clean_class_all();

			// Time and date
			$('#obc-time').text(return_data.obc.time);
			$('#obc-date').text(return_data.obc.date);

			// Engine status
			$('#engine-speed').text(return_data.engine.speed);
			if (return_data.engine.running) {
				$('#engine-running').text('Engine running').addClass('text-success');
			}
			else {
				$('#engine-running').text('Engine off').addClass('text-danger');
			}

			/*
			 * Temperatures
			 */

			// Units
			if (!return_data.coding.unit.temp) {
				return_data.coding.unit.temp = 'c';
			}

			$('#temperature-coolant-unit').text(return_data.coding.unit.temp.toUpperCase());
			$('#obc-temp-exterior-unit'  ).text(return_data.coding.unit.temp.toUpperCase());

			if (return_data.coding.unit.temp == 'c') {
				$('#temperature-coolant').text(return_data.temperature.coolant.c);
				$('#obc-temp-exterior').text(return_data.temperature.exterior.obc.c);
			}
			else if (return_data.coding.unit.temp == 'f') {
				$('#temperature-coolant').text(return_data.temperature.coolant.f);
				$('#obc-temp-exterior'  ).text(return_data.temperature.exterior.obc.f);
			}

			$('#vehicle-odometer-mi').text(return_data.vehicle.odometer.mi);
			$('#vehicle-vin').text(return_data.vehicle.vin);

			/*
			 * Vehicle sensors
			 */

			// Handbrake
			if (return_data.vehicle.handbrake) {
				$('#vehicle-handbrake').text('Handbrake on').addClass('text-danger');
			}
			else {
				$('#vehicle-handbrake').text('Handbrake off').addClass('text-success');
			}

			// Reverse
			if (return_data.vehicle.reverse) {
				$('#vehicle-reverse').text('In reverse').addClass('text-danger');
			}
			else {
				$('#vehicle-reverse').text('Not in reverse').addClass('text-success');
			}

			// Ignition
			switch (return_data.vehicle.ignition) {
				case 'run':
					$('#vehicle-ignition').text('Ignition run').addClass('text-success');
					break;
				case 'accessory':
					$('#vehicle-ignition').text('Ignition accessory').addClass('text-info');
					break;
				case 'start':
					$('#vehicle-ignition').text('Ignition start').addClass('text-warning');
					break;
				default:
					$('#vehicle-ignition').text('Ignition off').addClass('text-danger');
					break;
			}

			// Doors (doors) and window status
			if (return_data.doors.front_left)    { $('#doors-front-left').text('Door open');      } else { $('#doors-front-left').text('Door closed');      }
			if (return_data.doors.front_right)   { $('#doors-front-right').text('Door open');     } else { $('#doors-front-right').text('Door closed');     }
			if (return_data.doors.hood)          { $('#doors-hood').text('Hood open');            } else { $('#doors-hood').text('Hood closed');            }
			if (return_data.doors.rear_left)     { $('#doors-rear-left').text('Door open');       } else { $('#doors-rear-left').text('Door closed');       }
			if (return_data.doors.rear_right)    { $('#doors-rear-right').text('Door open');      } else { $('#doors-rear-right').text('Door closed');      }
			if (return_data.doors.trunk)         { $('#doors-trunk').text('Trunk open');          } else { $('#doors-trunk').text('Trunk closed');          }
			if (return_data.windows.front_left)  { $('#windows-front-left').text('Window open');  } else { $('#windows-front-left').text('Window closed');  }
			if (return_data.windows.front_right) { $('#windows-front-right').text('Window open'); } else { $('#windows-front-right').text('Window closed'); }
			if (return_data.windows.rear_left)   { $('#windows-rear-left').text('Window open');   } else { $('#windows-rear-left').text('Window closed');   }
			if (return_data.windows.rear_right)  { $('#windows-rear-right').text('Window open');  } else { $('#windows-rear-right').text('Window closed');  }
			if (return_data.windows.roof)        { $('#windows-roof').text('Moonroof open');      } else { $('#windows-roof').text('Moonroof closed');      }

			// Lighting status
			if (return_data.lights.interior) { $('#lights-interior').text('interior lights on'); } else { $('#lights-interior').text('interior lights off'); }

			// Central locking status
			if (return_data.vehicle.locked) { $('#vehicle-locked').text('Locked'); } else { $('#vehicle-locked').text('Unlocked'); }

			// Current, average, and limit speed
			if (return_data.coding.unit.speed === null) {
				return_data.coding.unit.speed = 'mph';
			}

			$('#vehicle-speed-unit' ).text(return_data.coding.unit.speed.toUpperCase());
			$('#obc-speedavg-unit'  ).text(return_data.coding.unit.speed.toUpperCase());
			$('#obc-speedlimit-unit').text(return_data.coding.unit.speed.toUpperCase());
			$('#obc-speedlimit'     ).text(return_data.obc.speedlimit);

			if (return_data.coding.unit.speed == 'kmh') {
				$('#vehicle-speed' ).text(return_data.vehicle.speed.kmh);
				$('#obc-speedavg'  ).text(return_data.obc.speedavg.kmh);
			}
			else if (return_data.coding.unit.speed == 'mph') {
				$('#vehicle-speed' ).text(return_data.vehicle.speed.mph);
				$('#obc-speedavg'  ).text(return_data.obc.speedavg.mph);
			}

			// Distance to arrival and range to empty
			$('#obc-distance-unit').text(return_data.coding.unit.distance);
			$('#obc-range-unit'   ).text(return_data.coding.unit.distance);
			$('#obc-distance').text(return_data.obc.distance);

			if (return_data.coding.unit.distance == 'mi') {
				$('#obc-range').text(return_data.obc.range.mi);
			}

			else if (return_data.coding.unit.distance == 'km') {
				$('#obc-range').text(return_data.obc.range.km);
			}

			// Fuel consumption
			$('#obc-consumption-1-unit').text(return_data.coding.unit.cons);
			$('#obc-consumption-2-unit').text(return_data.coding.unit.cons);

			if (return_data.coding.unit.cons == 'mpg') {
				$('#obc-consumption-1').text(return_data.obc.consumption.c1.mpg);
				$('#obc-consumption-2').text(return_data.obc.consumption.c2.mpg);
			}

			else if ( return_data.coding.unit.cons == 'l100') {
				$('#obc-consumption-1').text(return_data.obc.consumption.c1.l100);
				$('#obc-consumption-2').text(return_data.obc.consumption.c2.l100);
			}

			// Stopwatch, timer, aux heat timers
			$('#obc-aux-heat-timer-1').text(return_data.obc.aux_heat_timer.t1);
			$('#obc-aux-heat-timer-2').text(return_data.obc.aux_heat_timer.t2);
			$('#obc-stopwatch'       ).text(return_data.obc.stopwatch);
			$('#obc-timer'           ).text(return_data.obc.timer);

			// Coding data
			$('#obc-coding-unit-cons'    ).text(return_data.coding.unit.cons    );
			$('#obc-coding-unit-distance').text(return_data.coding.unit.distance);
			$('#obc-coding-unit-speed'   ).text(return_data.coding.unit.speed   );
			$('#obc-coding-unit-temp'    ).text(return_data.coding.unit.temp    );
			$('#obc-coding-unit-time'    ).text(return_data.coding.unit.time    );
		}
	});
}

function obc_refresh(callback) {
	// Data refresh from OBC/IKE
	$.ajax({
		url      : '/api/ike',
		type     : 'POST',
		dataType : 'json',
		data     : 'obc-get=all',
		success  : (return_data) => {
			console.log(return_data);
			if (typeof callback === 'function') {
				callback();
			}
		}
	});
}

function lcm_pulse() {
	// Pulse clamps 15, 30A, 30B, once
	$.ajax({
		url      : '/api/lcm',
		type     : 'POST',
		dataType : 'json',
		data     : 'clamp_15=on&clamp_30a=on&clamp_30b=on',
		success  : (return_data) => {
			console.log(return_data);
		}
	});
}

// Convert a string to hex
function str2hex(str) {
	var hex = '';
	for(var i=0; i<str.length; i++) {
		hex += ''+str.charCodeAt(i).toString(16);
	}
	return hex;
}

// Live IBUS data websocket
function ws_ibus() {
	// Open WebSocket
	var socket = io();

	socket.on('connect', () => {
		$('#ws-bus-header').removeClass('text-warning').removeClass('text-success').removeClass('text-danger').addClass('text-success').text('Socket connected');
	});

	socket.on('error', (error) => {
		console.error(error);
		$('#ws-bus-header').removeClass('text-warning').removeClass('text-success').addClass('text-danger').removeClass('text-success').text('Socket error');
	});

	socket.on('disconnect', () => {
		$('#ws-bus-header').removeClass('text-warning').removeClass('text-danger').addClass('text-warning').removeClass('text-success').text('Socket disconnected');
	});

	socket.on('data-receive', (data) => {
		var msg_fmt   = '';
		var timestamp = moment().format('h:mm:ss a');

		// Format the message
		data.msg.forEach((bit) => {
			// Convert it to hexadecimal
			msg_fmt += i2s(bit, false)+' ';
		});

		// Add a new row to the table
		var tr = '';
		tr += '<tr>';
		tr += '<td>'+timestamp+'</td>';
		tr += '<td>'+data.bus+'</td>';
		tr += '<td>'+data.src.name+'</td>';
		tr += '<td>'+data.dst.name+'</td>';
		tr += '<td>'+msg_fmt+'</td>';
		tr += '</tr>';

		$('#ws-bus-table tbody').prepend(tr);
	});

	// Assemble and send data from form below table
	$('#ws-bus-send').click(() => {
		var data_send = {};

		// Parse incoming data
		data_send.src = $('#ws-bus-src').val();
		data_send.dst = $('#ws-bus-dst').val();

		// Create the message array by removing whitespaces and splitting by comma
		data_send.msg = $('#ws-bus-msg').val().replace(' ', '').replace('0x', '').split(',');

		// Format the message
		var msg_array = [];
		for (var i = 0; i < data_send.msg.length; i++) {
			// Convert it to hexadecimal
			msg_array.push(parseInt(data_send.msg[i], 16));
		}
		data_send.msg = msg_array;

		socket.emit('data-send', data_send);
	});
}

$(() => {
	$.material.init();
});
