const objectPath = require('object-path');

const express = require('express');
const app     = express();
const server  = require('http').Server(app);

app.use(express.json());

// Only load socket.io server if this is the client app
const io = require('socket.io')(server);


const dataKeyConfigurations = {};


// Emit WebSocket data/events
async function emit(topic, data) {
	// Return here if topic is not status-tx
	if (topic !== 'status-tx') return;

	if (typeof dataKeyConfigurations[data.key.full] !== 'boolean') {
		dataKeyConfigurations[data.key.full] = false;
	}

	const dataKeyConfiguration = dataKeyConfigurations[data.key.full];
	// log.lib(`dataKeyConfiguration for ${data.key.full} : ${dataKeyConfiguration}`);

	if (dataKeyConfiguration !== true) return;

	io.emit(topic, data);
	// log.lib('Emitted ' + topic + ' message');
} // async emit(topic, data)


function emitOnVisible(key) {
	const emitObject = {
		key : {
			stub : key.split('.')[0],
			full : key,
		},

		value : {
			stub : objectPath.get(status, key),
			full : status[key.split('.')[0]],
		},
	};

	io.emit('status-tx', emitObject);
}


async function handleSocketConnection(socketConnection) {
	socketConnection.on('disconnect', reason => {
		log.lib(`socket.io client disconnected, reason: ${reason}`);
	});

	log.lib('socket.io client connected');

	socketConnection.on('client-tx', data => {
		let dataKey;

		switch (data.event) {
			case 'websocket-dash-subscribe':
				dataKey = data.data.replace(/-/g, '.');
				// log.lib(`socket.io client subscribe to ${dataKey}`);
				emitOnVisible(dataKey);
				dataKeyConfigurations[dataKey] = true;
				break;

			case 'websocket-dash-unsubscribe':
				dataKey = data.data.replace(/-/g, '.');
				// log.lib(`socket.io client unsubscribe from ${dataKey}`);
				dataKeyConfigurations[dataKey] = false;
				break;
		}
	});

	const statusKeys = [
		'engine',
		'dme',
		'fuel',
		'gpio',
		'lcm',
		'obc',
		'system',
		'temperature',
		'vehicle',
	];

	for await (const statusKey of statusKeys) {
		await socketConnection.emit('status-tx', {
			key : {
				stub : statusKey.split('.')[0],
				full : statusKey,
			},

			value : {
				stub : objectPath.get(status, statusKey),
				full : status[statusKey.split('.')[0]],
			},
		});

		await new Promise(resolve => setTimeout(resolve, 100));
	}

	// Force refresh data
	await new Promise(resolve => setTimeout(resolve, 500));
	IKE.obc_refresh();
} // async handleSocketConnection(socketConnection)


async function init() {
	log.lib('Initializing');


	io.on('connection', async (socketConnection) => {
		await handleSocketConnection(socketConnection);
	});


	app.all(/.*./, (req, res, next) => {
		log.lib('[' + req.method + '] ' + req.originalUrl, { body : req.body });
		next();
	});


	app.get('/config', (req, res) => { res.send(config); });
	app.get('/status', (req, res) => { res.send(status); });

	// Force-run garbage collection
	app.get('/app/gc', (req, res) => {
		if (typeof global.gc !== 'function') {
			res.send({ success : false });
			return;
		}

		global.gc();
		res.send({ success : true });
	});


	// Some of these are shameful

	app.post('/config', async (req, res) => {
		if (req.headers['content-type'] !== 'application/json') {
			res.send({ error : 'invalid content-type' });
			return;
		}

		config = req.body;
		await json.config_write();
		res.send(config);
	});


	app.get('/console', (req, res) => {
		update.config('console.output', !config.console.output);
		res.send(config.console);
	});


	// DME
	app.get('/dme/encode-316/:rpm', (req, res) => {
		DME.encode_316(parseInt(req.params.rpm));
		res.send(status.dme);
	});


	// DSP
	app.get('/dsp/eq/:band/:value', (req, res) => {
		DSP.eq_delta(req.params.band, req.params.value);
		res.send(status.dsp);
	});

	app.get('/dsp/get/:value', (req, res) => {
		DSP.request(req.params.value);
		res.send(status.dsp);
	});

	app.get('/dsp/loudness/:state', (req, res) => {
		DSP.loudness(req.params.state);
		res.send(status.dsp);
	});

	app.get('/dsp/m-audio/:mode', (req, res) => {
		DSP.m_audio(req.params.mode);
		res.send(status.dsp);
	});

	app.get('/dsp/mode/:mode', (req, res) => {
		DSP.dsp_mode(req.params.mode);
		res.send(status.dsp);
	});

	app.get('/dsp/speaker-test/:command', (req, res) => {
		DSP.speaker_test(req.params.command);
		res.send(status.dsp);
	});

	app.post('/dsp/eq', async (req, res) => {
		if (req.headers['content-type'] !== 'application/json') {
			res.send({ error : 'invalid content-type' });
			return;
		}

		await DSP.eq_encode(req.body);

		// Update config object value
		config.media.dsp.eq = req.body;

		res.send(status.dsp);
	});


	// FEM
	app.get('/fem/backlight/:value', (req, res) => {
		FEM.backlight(parseInt(req.params.value));
		res.send(status.fem);
	});


	// GM
	app.get('/gm/doors/closed/:value', (req, res) => {
		update.status('doors.closed', (req.params.value.toString() === 'true'), false);
		update.status('doors.open',   (req.params.value.toString() !== 'true'), false);
		res.send(status.doors);
	});

	app.get('/gm/doors/open/:value', (req, res) => {
		update.status('doors.closed', (req.params.value.toString() !== 'true'), false);
		update.status('doors.open',   (req.params.value.toString() === 'true'), false);
		res.send(status.doors);
	});

	app.get('/gm/doors/sealed/:value', (req, res) => {
		update.status('doors.sealed', (req.params.value.toString() === 'true'), false);
		res.send(status.doors);
	});

	app.get('/gm/get/:value', (req, res) => {
		GM.request(req.params.value);
		res.send(status.gm);
	});

	app.get('/gm/interior-light/:value', (req, res) => {
		GM.interior_light(parseInt(req.params.value));
		res.send(status.gm);
	});

	app.get('/gm/mirror/:mirror/:action', (req, res) => {
		GM.mirrors({
			action : req.params.action,
			mirror : req.params.mirror,
		});

		res.send(status.gm);
	});

	app.get('/gm/windows/closed/:value', (req, res) => {
		update.status('windows.closed', (req.params.value.toString() === 'true'), false);
		update.status('windows.open',   (req.params.value.toString() !== 'true'), false);
		res.send(status.windows);
	});

	app.get('/gm/windows/open/:value', (req, res) => {
		update.status('windows.closed', (req.params.value.toString() !== 'true'), false);
		update.status('windows.open',   (req.params.value.toString() === 'true'), false);
		res.send(status.windows);
	});

	app.post('/gm/decode_status_open', (req, res) => {
		if (req.headers['content-type'] !== 'application/json') {
			res.send({ error : 'invalid content-type' });
			return;
		}

		GM.decode_status_open(req.body);
		res.send(status.gm);
	});

	app.post('/gm/locks', (req, res) => {
		if (req.headers['content-type'] !== 'application/json') {
			res.send({ error : 'invalid content-type' });
			return;
		}

		GM.locks(req.body);
		res.send(status.gm);
	});

	app.post('/gm/mirrors', (req, res) => {
		if (req.headers['content-type'] !== 'application/json') {
			res.send({ error : 'invalid content-type' });
			return;
		}

		GM.mirrors(req.body);
		res.send(status.gm);
	});

	app.post('/gm/windows', (req, res) => {
		if (req.headers['content-type'] !== 'application/json') {
			res.send({ error : 'invalid content-type' });
			return;
		}

		GM.windows(req.body);
		res.send(status.gm);
	});


	// GPIO
	app.get('/gpio/set/:relay/:value', (req, res) => {
		gpio.set(req.params.relay, req.params.value);
		res.send(status.gpio);
	});

	app.get('/gpio/toggle/:relay', (req, res) => {
		gpio.toggle(req.params.relay);
		res.send(status.gpio);
	});


	// HDMI
	app.get('/hdmi/cec/command/:action', (req, res) => {
		hdmi_cec.command(req.params.action);
		res.send(status.hdmi.cec);
	});

	app.get('/hdmi/rpi/command/:action', (req, res) => {
		hdmi_rpi.command(req.params.action);
		res.send(status.hdmi.rpi);
	});


	// IHKA
	app.get('/ihka/get/:value', (req, res) => {
		IHKA.request(req.params.value);
		res.send(status.ihka);
	});

	app.get('/ihka/recirc', (req, res) => {
		IHKA.recirc();
		res.send(status.ihka);
	});

	app.post('/ihka/aux', (req, res) => {
		if (req.headers['content-type'] !== 'application/json') {
			res.send({ error : 'invalid content-type' });
			return;
		}

		IHKA.aux(req.body);
		res.send(status.ihka);
	});


	// IKE
	app.get('/ike/get/:value', (req, res) => {
		IKE.request(req.params.value);
		res.send(status.ike);
	});

	app.get('/ike/ignition/:value', (req, res) => {
		IKE.ignition(req.params.value);
		res.sendStatus(200);
	});

	app.post('/ike/textWithOptions', async (req, res) => {
		if (req.headers['content-type'] !== 'application/json') {
			res.send({ error : 'invalid content-type' });
			return;
		}

		await IKE.textWithOptions(req.body.string, req.body.options);
		res.sendStatus(200);
	});

	app.get('/ike/text/nopad/:value', (req, res) => {
		IKE.text_nopad(req.params.value);
		res.sendStatus(200);
	});

	app.get('/ike/text/normal/:value', (req, res) => {
		IKE.text(req.params.value);
		res.sendStatus(200);
	});

	app.get('/ike/text/override/:value', (req, res) => {
		IKE.text_override(req.params.value);
		res.sendStatus(200);
	});

	app.get('/ike/text/urgent/:value', (req, res) => {
		IKE.text_urgent(req.params.value);
		res.sendStatus(200);
	});

	app.get('/ike/text/urgent/off', (req, res) => {
		IKE.text_urgent_off();
		res.sendStatus(200);
	});

	app.get('/ike/text/warning/:value', (req, res) => {
		IKE.text_warning(req.params.value);
		res.sendStatus(200);
	});


	// LCM
	app.get('/lcm/comfort-turn/:action', (req, res) => {
		update.status('lights.turn.depress_elapsed', 0, false);
		LCM.comfort_turn_flash(req.params.action);
		res.send(status.lcm);
	});

	app.get('/lcm/dimmer/:value', (req, res) => {
		update.status('lcm.dimmer.value', parseInt(req.params.value), false);
		res.send(status.lcm);
	});

	app.get('/lcm/get/:value', (req, res) => {
		LCM.request(req.params.value);
		res.send(status.lcm);
	});

	app.get('/lcm/io-encode', (req, res) => {
		LCM.io_encode(req.query);
		res.send(status.lcm);
	});

	app.post('/lcm/io-encode', (req, res) => {
		if (req.headers['content-type'] !== 'application/json') {
			res.send({ error : 'invalid content-type' });
			return;
		}

		LCM.io_encode(req.body);
		res.send(status.lcm);
	});

	app.get('/lcm/police-lights/:action', (req, res) => {
		LCM.police((req.params.action.toString() === 'true' || req.params.action.toString() === 'on'));
		res.send(status.lcm);
	});

	app.get('/lcm/welcome-lights/:action', (req, res) => {
		LCM.welcome_lights((req.params.action.toString() === 'true' || req.params.action.toString() === 'on'));
		res.send(status.lcm);
	});


	// MFL
	app.get('/mfl/translate-button-media/:action/:button', (req, res) => {
		MFL.translate_button_media({
			action : req.params.action,
			button : req.params.button,
		});

		res.send(status.mfl);
	});


	// OBC
	app.get('/obc/get-all', (req, res) => {
		IKE.obc_refresh();
		res.send(status.obc);
	});

	app.get('/obc/get/:value', (req, res) => {
		IKE.obc_data('get', req.params.value);
		res.send(status.obc);
	});

	app.get('/obc/reset/:value', (req, res) => {
		IKE.obc_data('reset', req.params.value);
		res.send(status.obc);
	});

	app.get('/obc/set/clock', (req, res) => {
		IKE.obc_clock();
		res.send(status.obc);
	});


	// power lib
	app.get('/power/:state', (req, res) => {
		power.power(req.params.state);
		res.send(status.power);
	});


	// RAD
	app.get('/rad/cassette/:command', (req, res) => {
		RAD.cassette_control(req.params.command);
		res.send(status.rad);
	});

	app.get('/rad/power/:command', async (req, res) => {
		await RAD.audio_power(req.params.command);
		res.send(status.rad);
	});

	app.get('/rad/source/:command', (req, res) => {
		RAD.audio_control(req.params.command);
		res.send(status.rad);
	});

	app.get('/rad/volume/:command', (req, res) => {
		RAD.volume_control(parseInt(req.params.command));
		res.send(status.rad);
	});


	// RLS
	app.get('/rls/get/:value', (req, res) => {
		RLS.request(req.params.value);
		res.send(status.rls);
	});

	app.post('/rls/light-control', (req, res) => {
		if (req.headers['content-type'] !== 'application/json') {
			res.send({ error : 'invalid content-type' });
			return;
		}

		RLS.light_control_status(req.body);
		res.send(status.rls);
	});


	// SZM
	app.get('/szm/button/:button', (req, res) => {
		SZM.encode_button(req.params.button);
		res.send(status.szm);
	});


	// TEL
	app.post('/tel/led', (req, res) => {
		if (req.headers['content-type'] !== 'application/json') {
			res.send({ error : 'invalid content-type' });
			return;
		}

		TEL.led(req.body);
		res.send(status.tel);
	});


	log.lib('Initialized');

	await new Promise(resolve => server.listen(config.api.port, resolve));

	log.lib('Express listening on port ' + config.api.port);
} // async init()

async function term() {
	log.lib('Terminating');

	await server.close();

	log.lib('Terminated');
} // async term()


module.exports = {
	// Main functions
	emit,

	// Start/stop functions
	init,
	term,
};
