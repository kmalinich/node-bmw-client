const express = require('express');
const app = express();

function init(init_callback = null) {
	app.all('*', (req, res, next) => {
		log.msg({ msg : '[' + req.method + '] ' + req.originalUrl });
		res.set('Content-Type', 'application/json');
		next();
	});

	app.get('/config', (req, res) => {
		res.send(JSON.stringify(config));
	});

	app.get('/console', (req, res) => {
		update.config('console.output', !config.console.output);
		res.send(JSON.stringify(config.console));
	});

	app.get('/status', (req, res) => {
		res.send(JSON.stringify(status));
	});

	app.listen(3000, () => {
		log.msg({ msg : 'Express listening on port 3000' });
	});

	log.msg({ msg : 'Initialized' });

	if (typeof init_callback === 'function') process.nextTick(init_callback);
	init_callback = undefined;
}

function term(term_callback = null) {
	log.msg({ msg : 'Terminated' });

	if (typeof term_callback === 'function') process.nextTick(term_callback);
	term_callback = undefined;
}

module.exports = {
	// Functions
	init : (init_cb) => { init(init_cb); },
	term : (term_cb) => { term(term_cb); },
};
