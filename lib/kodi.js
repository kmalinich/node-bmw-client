// Start back at square one
function re_init() {
	if (kodi.reconnecting !== true) {
		log.msg('Disconnected from ' + config.media.kodi.host + ':' + config.media.kodi.port);

		if (kodi.socket !== null && kodi.timeout.init !== null) {
			IKE.text_warning('  Kodi disconnected ', 4000);
		}

		log.msg('Attempting to reconnect');

		TEL.led({ flash_yellow : true });
	}

	kodi.connected = false;
	kodi.socket    = null;

	kodi.reconnecting = true;

	kodi.timeout.init = setTimeout(() => {
		kodi.init();
	}, kodi.wait_init);
}

// Loop init until it hooks
function init(init_cb = null) {
	// Don't run if not enabled
	if (config.media.kodi.enable !== true) {
		typeof init_cb === 'function' && process.nextTick(init_cb);
		init_cb = undefined;
		return;
	}

	if (kodi.timeout.init !== null) {
		clearTimeout(kodi.timeout_init);
		kodi.timeout.init = null;
	}

	// Don't run if not needed
	if (kodi.socket !== null) {
		log.msg('Not initializing, socket is already populated');

		typeof init_cb === 'function' && process.nextTick(init_cb);
		init_cb = undefined;
		return;
	}

	kodi.connected  = false;
	kodi.connecting = true;

	update.status('kodi.player.status', null, false);

	// Increment counter
	kodi.count_init++;

	// Only display log message on initial connection attempt
	if (kodi.reconnecting === false) {
		log.msg('Connecting to ' + config.media.kodi.host + ':' + config.media.kodi.port);
	}

	// Kodi WebSocket API library
	const kodi_ws = require('kodi-ws');

	kodi_ws(config.media.kodi.host, config.media.kodi.port).then((promise_kodi_socket) => {
		kodi.socket = promise_kodi_socket;

		kodi.connected    = true;
		kodi.connecting   = false;
		kodi.reconnecting = false;

		log.msg('Connected to ' + config.media.kodi.host + ':' + config.media.kodi.port);

		kodi.notify('bmwcd', 'bmwcd connected');

		TEL.led({ flash_green : true });

		// Event/error handling
		kodi.socket.on('error', (error) => {
			log.msg('Error : ' + error.code);
			re_init();
		});


		kodi.socket.notification('Application.OnVolumeChanged', (volume) => {
			update.status('kodi.volume.level', Math.round(volume.data.volume));
			update.status('kodi.volume.muted', volume.data.muted);
		});


		kodi.socket.notification('Player.OnPause', (player) => {
			update.status('kodi.player.status', 'paused');
			TEL.led({ solid_yellow : true });
			process_player_data(player);
		});

		kodi.socket.notification('Player.OnPlay', (player) => {
			update.status('kodi.player.status', 'playing');
			TEL.led({ solid_green : true });
			process_player_data(player);
		});

		kodi.socket.notification('Player.OnPropertyChanged', (player) => {
			log.msg('Player property changed');
			process_player_data(player);
		});

		kodi.socket.notification('Player.OnSeek', (player) => {
			update.status('kodi.player.status', 'seeking');
			TEL.led({ flash_yellow : true });
			process_player_data(player);
		});

		kodi.socket.notification('Player.OnStop', (player) => {
			update.status('kodi.player.status', 'stopped');
			TEL.led({ solid_red : true });
			process_player_data(player);
		});


		kodi.socket.notification('GUI.OnDPMSActivated', () => {
			log.msg('DPMS activated');
		});

		kodi.socket.notification('GUI.OnDPMSDeactivated', () => {
			log.msg('DPMS deactivated');
		});

		kodi.socket.notification('GUI.OnScreensaverActivated', () => {
			log.msg('Screensaver activated');
		});

		kodi.socket.notification('GUI.OnScreensaverDeactivated', () => {
			log.msg('Screensaver deactivated');
		});


		kodi.socket.notification('AudioLibrary.OnCleanStarted', () => {
			log.msg('Audio library clean started');
		});

		kodi.socket.notification('AudioLibrary.OnCleanFinished', () => {
			log.msg('Audio library clean finished');
		});

		kodi.socket.notification('AudioLibrary.OnScanStarted', () => {
			log.msg('Audio library scan started');
		});

		kodi.socket.notification('AudioLibrary.OnScanFinished', () => {
			log.msg('Audio library scan finished');
		});

		kodi.socket.notification('AudioLibrary.OnUpdate', (data) => {
			log.msg('Audio library item updated, id : ' + data.data.id + ', type : ' + data.data.type);
		});

		kodi.socket.notification('AudioLibrary.OnRemove', (data) => {
			log.msg('Audio library item removed, id : ' + data.data.id + ', type : ' + data.data.type);
		});


		kodi.socket.notification('System.OnLowBattery', () => {
			log.msg('System is on low battery');
		});

		kodi.socket.notification('System.OnQuit', () => {
			log.msg('Kodi is quitting');
		});

		kodi.socket.notification('System.OnSleep', () => {
			log.msg('System will be suspended');
		});

		kodi.socket.notification('System.OnWake', () => {
			log.msg('System woke from suspension');
		});

		kodi.socket.notification('System.OnRestart', () => {
			log.msg('System will be restarted');
		});

		get_active_players(() => {});

		// Call me maybe?
		typeof init_cb === 'function' && process.nextTick(init_cb);
		init_cb = undefined;
	}).catch((e) => {
		// Handle errors
		if (kodi.reconnecting === false) {
			log.msg('Connect error : ' + e.code);
		}

		re_init();

		// Call me maybe?
		typeof init_cb === 'function' && process.nextTick(init_cb);
		init_cb = undefined;
	});
}

function init_listeners() {
	// Perform commands on power lib active event
	update.on('status.power.active',  (data) => {
		switch (data.new) {
			case false : {
				// Set volume to default
				volume(config.media.kodi.default_volume);

				// Pause playback
				command('pause');

				break;
			}

			case true : {
				// Set volume to default
				volume(config.media.kodi.default_volume);

				// Resume playback
				command('play');
			}
		}
	});

	// CON1 taps = emulate click, if the last CON1 input received wasn't rotation
	update.on('status.con1.touch.count', (data) => {
		if (status.con1.last.event === 'rotation') return;

		if (data.new > 1) {
			kodi.ignore_touch = true;
			return;
		}

		switch (data.new) {
			case 0 : {
				if (kodi.ignore_touch === true) {
					kodi.ignore_touch = false;
					return;
				}

				switch (data.old) {
					case 1 : input('in'); break;
				}
			}
		}
	});

	// Play/pause and skip track on finger touches
	// update.on('status.con1.touch.count', (data) => {
	// 	switch (data.new) {
	// 		case 2 : {
	// 			switch (data.old) {
	// 				case 1 : command('next'); break;
	// 				case 3 : command('toggle');
	// 			}
	// 		}
	// 	}
	// });

	log.msg('Initialized listeners');
}


// Get all active players
function get_active_players(get_active_players_cb) {
	if (config.media.kodi.enable !== true) {
		typeof get_active_players_cb === 'function' && process.nextTick(get_active_players_cb);
		get_active_players_cb = undefined;
		return;
	}

	if (!kodi.socket.Player) {
		typeof get_active_players_cb === 'function' && process.nextTick(get_active_players_cb);
		get_active_players_cb = undefined;
		return;
	}

	kodi.socket.Player.GetActivePlayers().then((players) => {
		if (!players[0]) {
			log.msg('No players found');
		}
		else {
			update.status('kodi.player.id',  players[0].playerid);
			update.status('kodi.player.type', players[0].type);

			let item_array = [ 'album', 'albumartist' ];

			kodi.socket.Player.GetItem(players[0].playerid, item_array).then((data) => {
				process_player_data({
					data : {
						item : data.item,
					},
				});
			});
		}

		// Call me maybe?
		typeof get_active_players_cb === 'function' && process.nextTick(get_active_players_cb);
		get_active_players_cb = undefined;
	}).catch((e) => {
		// Handle errors
		log.msg('Data error : ' + e.code);
		// console.log(e);

		re_init();

		// Call me maybe?
		typeof get_active_players_cb === 'function' && process.nextTick(get_active_players_cb);
		get_active_players_cb = undefined;
	});
}

// Clear kodi.socket and loops if need be
function term(term_cb) {
	if (config.media.kodi.enable !== true) {
		typeof term_cb === 'function' && process.nextTick(term_cb);
		term_cb = undefined;
		return;
	}

	log.msg('Terminating');

	// Pause playback
	command('pause');

	setTimeout(() => {
		if (kodi.timeout.init !== null) clearTimeout(kodi.timeout_init);

		kodi.socket       = null;
		kodi.timeout.init = null;

		log.msg('Terminated');

		typeof term_cb === 'function' && process.nextTick(term_cb);
		term_cb = undefined;
	}, 500);
}

// Show notification in Kodi GUI
function notify(title, message) {
	if (config.media.kodi.enable !== true) return;

	if (kodi.socket === null) {
		log.msg('Disconnected, ' + title + ' cannot notify: \'' + message + '\'');
		return;
	}

	kodi.socket.GUI.ShowNotification({ 'title' : title, 'message' : message });

	// Don't log message if coming from lib/socket.js, it can crowd the log
	if (title === 'socket') return;

	log.msg(title + ' notifies: \'' + message + '\'');
}

function gui_activate_window(gui_window) {
	if (config.media.kodi.enable !== true) return;

	kodi.socket.GUI.ActivateWindow({ 'window' : gui_window }).catch((e) => {
		// Handle errors
		log.msg('GUI.ActivateWindow error : ' + e.code);
		// console.dir(e);
	});
}

function input_execute_action(input_action) {
	if (config.media.kodi.enable !== true) return;

	kodi.socket.Input.ExecuteAction({ 'action' : input_action }).catch((e) => {
		// Handle errors
		log.msg('Input.ExecuteAction error : ' + e.code);
	});
}

function input(data) {
	if (config.media.kodi.enable !== true) return;

	if (kodi.socket === null) {
		log.msg('Socket not ready, cannot input \'' + data + '\' command');
		return;
	}

	log.msg('Sending \'' + data + '\' input to Kodi');

	switch (data) {
		case 'back'   : kodi.socket.Input.Back();        break;
		case 'down'   : kodi.socket.Input.Down();        break;
		case 'left'   : kodi.socket.Input.Left();        break;
		case 'right'  : kodi.socket.Input.Right();       break;
		case 'up'     : kodi.socket.Input.Up();          break;

		// Non-standard entries - should be handled in modules/CON1.js and modules/BMBT.js
		case 'cd'     : gui_activate_window('visualisation'); break;
		case 'in'     : kodi.socket.Input.Select();           break;
		case 'menu'   : kodi.socket.Input.Home();             break;
		case 'option' : kodi.socket.Input.ContextMenu();      break;
		case 'radio'  : kodi.socket.Input.ShowOSD();          break;
	}
}

// Send commands to Kodi media player over the JSON-RPC websocket API
function command(action) {
	if (config.media.kodi.enable !== true) return;

	if (kodi.socket === null) {
		log.msg('Socket not ready, cannot send \'' + action + '\' command');
		return;
	}

	kodi.socket.Player.GetActivePlayers().then((players) => { // List active players
		return Promise.all(players.map((player) => { // Map players
			update.status('kodi.player.id', player.playerid);

			log.msg('Sending \'' + action + '\' command to player ID ' + status.kodi.player.id);

			switch (action) {
				case 'getitem' : return kodi.socket.Player.GetItem(player.playerid);

				case 'stop'     : return kodi.socket.Player.Stop(player.playerid);
				case 'toggle'   : return kodi.socket.Player.PlayPause(player.playerid);
				case 'previous' : return kodi.socket.Player.GoTo({ 'playerid' : player.playerid, 'to' : 'previous' });
				case 'next'     : return kodi.socket.Player.GoTo({ 'playerid' : player.playerid, 'to' : 'next'     });

				case 'pause' : {
					if (status.kodi.player.status === 'paused') break;
					return kodi.socket.Player.PlayPause(player.playerid);
				}

				case 'play' : {
					if (status.kodi.player.status === 'playing') break;
					return kodi.socket.Player.PlayPause(player.playerid);
				}

				case 'seek-forward' : return kodi.socket.Player.SetSpeed({ 'playerid' : player.playerid, 'speed' : 2 });
				case 'seek-rewind'  : return kodi.socket.Player.SetSpeed({ 'playerid' : player.playerid, 'speed' : -2 });
			}
		}));
	}).catch((e) => {
		// Handle errors
		log.msg('Command error : ' + e.code);

		re_init();
	});
}

// Send commands to Kodi media player over the JSON-RPC websocket API
function volume(action) {
	if (config.media.kodi.enable !== true) return;

	if (kodi.socket === null) {
		log.msg('Socket not ready, cannot send volume ' + action + ' command');
		return;
	}

	log.msg('Sending volume \'' + action + '\' command');

	switch (action) {
		case 'down' : return input_execute_action('volumedown');
		case 'up'   : return input_execute_action('volumeup');

		default : {
			return kodi.socket.Application.SetVolume(action).catch((e) => {
				// Handle errors
				log.msg('Volume error : ' + e.code);

				re_init();
			});
		}
	}
}

// Evaluate/process data sent from websocket event
function process_player_data(player) {
	if (config.media.kodi.enable !== true) return;

	if (player.data) {
		if (player.data.item) {
			if (player.data.item.album) { update.status('kodi.player.album', player.data.item.album); }
			if (player.data.item.type)  { update.status('kodi.player.type',  player.data.item.type);  }
			if (player.data.item.title) { update.status('kodi.player.title', player.data.item.title); }
			if (player.data.item.label) { update.status('kodi.player.title', player.data.item.label); }

			if (player.data.item.artist)      { update.status('kodi.player.artist', player.data.item.artist[0]);      }
			if (player.data.item.albumartist) { update.status('kodi.player.artist', player.data.item.albumartist[0]); }

			if (player.data.item.label || player.data.item.title) {
				if (config.media.kodi.text.ike === true && status.kodi.player.status === 'playing') {
					IKE.text_override(status.kodi.player.artist + ' - ' + status.kodi.player.title);
				}
			}
			else {
				get_active_players(() => {});
			}
		}

		if (player.data.player) {
			if (player.data.player.playerid) { update.status('kodi.player.id', player.data.player.playerid); }
			if (player.data.player.time) {
				if (player.data.player.time.minutes) { update.status('kodi.player.time.minutes', player.data.player.time.minutes); }
				if (player.data.player.time.seconds) { update.status('kodi.player.time.seconds', player.data.player.time.seconds); }
			}
		}
	}
}


module.exports = {
	socket : null,

	connected    : false,
	connecting   : false,
	reconnecting : false,

	wait_init  : 1000,
	count_init : 0,

	timeout : {
		init : null,
	},

	ignore_touch : false,


	// Start/stop functions
	init           : init,
	init_listeners : init_listeners,
	term           : term,

	command : command,
	input   : input,
	notify  : notify,
	volume  : volume,

	gui_activate_window  : gui_activate_window,
	input_execute_action : input_execute_action,
};
