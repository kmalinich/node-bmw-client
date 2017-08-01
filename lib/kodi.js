const module_name = __filename.slice(__dirname.length + 1, -3);


// Evaluate/process data sent from websocket event
function process_player_data(player) {
	if (config.media.kodi.enable !== true) return;

	if (player.data) {
		if (player.data.item) {
			if (player.data.item.album) { update.status('kodi.player.album', player.data.item.album); }
			if (player.data.item.type ) { update.status('kodi.player.type',  player.data.item.type);  }
			if (player.data.item.title) { update.status('kodi.player.title', player.data.item.title); }
			if (player.data.item.label) { update.status('kodi.player.title', player.data.item.label); }

			if (player.data.item.artist     ) { update.status('kodi.player.artist', player.data.item.artist[0]);      }
			if (player.data.item.albumartist) { update.status('kodi.player.artist', player.data.item.albumartist[0]); }

			if (player.data.item.label || player.data.item.title) {
				if (status.kodi.player.status === 'playing') {
					IKE.text_override(status.kodi.player.artist+' - '+status.kodi.player.title);
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

// Start back at square one
function re_init() {
	if (kodi.reconnecting !== true) {
		log.msg({
			src : module_name,
			msg : 'Disconnected from '+config.media.kodi.host+':'+config.media.kodi.port,
		});

		if (kodi.socket !== null) {
			IKE.text_warning('Kodi:   disconnected', 4000);
		}

		log.msg({
			src : module_name,
			msg : 'Attempting to reconnect',
		});
	}

	kodi.connected = false;
	kodi.socket    = null;

	kodi.reconnecting  = true;
	kodi.timeouts.init = setTimeout(() => {
		kodi.init();
	}, kodi.wait_init);
}

// Loop init until it hooks
function init(init_callback = null) {
	// Don't run if not enabled
	if (config.media.kodi.enable !== true) {
		if (typeof init_callback === 'function') init_callback();
		init_callback = undefined;
		return;
	}

	if (kodi.timeouts.init !== null) {
		clearTimeout(kodi.timeout_init);
		kodi.timeouts.init = null;
	}

	// Don't run if not needed
	if (kodi.socket !== null) {
		log.msg({
			src : module_name,
			msg : 'Not initializing, socket is already populated',
		});

		if (typeof init_callback === 'function') init_callback();
		init_callback = undefined;
		return;
	}

	kodi.connected  = false;
	kodi.connecting = true;
	update.status('kodi.player.status', null);

	// Increment counter
	kodi.count_init++;

	// Only display log message on initial connection attempt
	if (kodi.reconnecting === false) {
		log.msg({
			src : module_name,
			msg : 'Connecting to '+config.media.kodi.host+':'+config.media.kodi.port,
		});
	}

	// Kodi WebSocket API library
	const kodi_ws = require('kodi-ws');

	kodi_ws(config.media.kodi.host, config.media.kodi.port).then((promise_kodi_socket) => {
		kodi.socket = promise_kodi_socket;

		kodi.connected    = true;
		kodi.connecting   = false;
		kodi.reconnecting = false;

		log.msg({
			src : module_name,
			msg : 'Connected to '+config.media.kodi.host+':'+config.media.kodi.port,
		});

		IKE.text_warning('Kodi:      connected', 3000);

		// Event/error handling
		kodi.socket.on('error', (error) => {
      re_init();
		});

		kodi.socket.notification('Application.OnVolumeChanged', (volume) => {
			update.status('kodi.volume.level', volume.data.volume);
			update.status('kodi.volume.muted', volume.data.muted);
		});


		kodi.socket.notification('Player.OnPause', (player) => {
			update.status('kodi.player.status', 'paused');
			process_player_data(player);
		});

		kodi.socket.notification('Player.OnPlay', (player) => {
			update.status('kodi.player.status', 'playing');
			process_player_data(player);
		});

		kodi.socket.notification('Player.OnPropertyChanged', (player) => {
			log.msg({
				src : module_name,
				msg : 'Player property changed',
			});
			process_player_data(player);
		});

		kodi.socket.notification('Player.OnSeek', (player) => {
			update.status('kodi.player.status', 'seeking');
			process_player_data(player);
		});

		kodi.socket.notification('Player.OnStop', (player) => {
			update.status('kodi.player.status', 'stopped');
			process_player_data(player);
		});


		kodi.socket.notification('GUI.OnDPMSActivated', () => {
			log.msg({
				src : module_name,
				msg : 'DPMS activated',
			});
		});

		kodi.socket.notification('GUI.OnDPMSDeactivated', () => {
			log.msg({
				src : module_name,
				msg : 'DPMS deactivated',
			});
		});

		kodi.socket.notification('GUI.OnScreensaverActivated', (data) => {
			log.msg({
				src : module_name,
				msg : 'Screensaver activated',
			});
		});

		kodi.socket.notification('GUI.OnScreensaverDeactivated', () => {
			log.msg({
				src : module_name,
				msg : 'Screensaver deactivated',
			});
		});


		kodi.socket.notification('AudioLibrary.OnCleanStarted', () => {
			log.msg({
				src : module_name,
				msg : 'Audio library clean started',
			});
		});

		kodi.socket.notification('AudioLibrary.OnCleanFinished', () => {
			log.msg({
				src : module_name,
				msg : 'Audio library clean finished',
			});
		});

		kodi.socket.notification('AudioLibrary.OnScanStarted', () => {
			log.msg({
				src : module_name,
				msg : 'Audio library scan started',
			});
		});

		kodi.socket.notification('AudioLibrary.OnScanFinished', () => {
			log.msg({
				src : module_name,
				msg : 'Audio library scan finished',
			});
		});

		kodi.socket.notification('AudioLibrary.OnUpdate', (data) => {
			log.msg({
				src : module_name,
				msg : 'Audio library item updated',
			});
			console.dir(data);
		});

		kodi.socket.notification('AudioLibrary.OnRemove', (data) => {
			log.msg({
				src : module_name,
				msg : 'Audio library item removed',
			});
			console.dir(data);
		});


		kodi.socket.notification('System.OnLowBattery', () => {
			log.msg({
				src : module_name,
				msg : 'System is on low battery',
			});
		});

		kodi.socket.notification('System.OnQuit', () => {
			log.msg({
				src : module_name,
				msg : 'Kodi is quitting',
			});
		});

		kodi.socket.notification('System.OnSleep', () => {
			log.msg({
				src : module_name,
				msg : 'System will be suspended',
			});
		});

		kodi.socket.notification('System.OnWake', () => {
			log.msg({
				src : module_name,
				msg : 'System woke from suspension',
			});
		});

		kodi.socket.notification('System.OnRestart', () => {
			log.msg({
				src : module_name,
				msg : 'System will be restarted',
			});
		});

		get_active_players(() => {});

		// Call me maybe?
		if (typeof init_callback === 'function') init_callback();
		init_callback = undefined;
	}).catch((e) => {
		// Handle errors

		if (kodi.reconnecting === false) {
			log.msg({
				src : module_name,
				msg : 'Connect error: '+e.code,
			});
		}

		re_init();

		// Call me maybe?
		if (typeof init_callback === 'function') init_callback();
		init_callback = undefined;
	});
}

// Get all active players
function get_active_players(get_active_players_callback) {
	if (config.media.kodi.enable !== true) {
		if (typeof get_active_players_callback === 'function') get_active_players_callback();
		get_active_players_callback = undefined;
		return;
	}

	if (!kodi.socket.Player) {
		if (typeof get_active_players_callback === 'function') get_active_players_callback();
		get_active_players_callback = undefined;
		return;
	}

	kodi.socket.Player.GetActivePlayers().then((players) => {
		if (!players[0]) {
			log.msg({
				src : module_name,
				msg : 'No players found',
			});
		}
		else {
			update.status('kodi.player.id',  players[0].playerid);
			update.status('kodi.player.type',players[0].type);

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
		if (typeof get_active_players_callback === 'function') get_active_players_callback();
		get_active_players_callback = undefined;
	}).catch((e) => {
		// Handle errors
		log.msg({
			src : module_name,
			msg : 'Data error: '+e.code,
		});
		console.log(e);

    re_init();

		// Call me maybe?
		if (typeof get_active_players_callback === 'function') get_active_players_callback();
		get_active_players_callback = undefined;
	});
}

// Clear kodi.socket and loops if need be
function term(term_callback) {
	if (config.media.kodi.enable !== true) {
		if (typeof term_callback === 'function') term_callback();
		term_callback = undefined;
		return;
	}

	log.msg({ src : module_name, msg : 'Terminating' });

	if (kodi.timeouts.init !== null) clearTimeout(kodi.timeout_init);

	kodi.socket        = null;
	kodi.timeouts.init = null;

	if (typeof term_callback === 'function') term_callback();
	term_callback = undefined;
}

// Show notification in Kodi GUI
function notify(title, message) {
	if (config.media.kodi.enable !== true) return;

	if (kodi.socket === null) {
		log.msg({
			src : module_name,
			msg : 'Disconnected, '+title+' cannot notify: \''+message+'\'',
		});
		return;
	}

	kodi.socket.GUI.ShowNotification({ 'title' : title, 'message' : message });

	// Don't log message if coming from lib/socket.js, it can crowd the log
	if (title == 'socket') return;

	log.msg({
		src : module_name,
		msg : title+' notifies: \''+message+'\'',
	});
}

function gui_activate_window(gui_window) {
	if (config.media.kodi.enable !== true) return;

	kodi.socket.GUI.ActivateWindow({ 'window' : gui_window }).catch((e) => {
		// Handle errors
		log.msg({
			src : module_name,
			msg : 'GUI.ActivateWindow error: '+e.code,
		});
		console.dir(e);

		// re_init();
	});
}

function input_execute_action(input_action) {
	if (config.media.kodi.enable !== true) return;

	kodi.socket.Input.ExecuteAction({ 'action' : input_action }).catch((e) => {
		// Handle errors
		log.msg({
			src : module_name,
			msg : 'Input.ExecuteAction error: '+e.code,
		});

		// re_init();
	});
}

function input(data) {
	if (config.media.kodi.enable !== true) return;

	if (kodi.socket === null) {
		log.msg({
			src : module_name,
			msg : 'Socket not ready, cannot input \''+data+'\' command',
		});
		return;
	}

	log.msg({
		src : module_name,
		msg : 'Sending \''+data+'\' input to Kodi',
	});

	switch (data) {
		case 'back'   : kodi.socket.Input.Back();        break;
		case 'down'   : kodi.socket.Input.Down();        break;
		case 'left'   : kodi.socket.Input.Left();        break;
		case 'right'  : kodi.socket.Input.Right();       break;
		case 'up'     : kodi.socket.Input.Up();          break;

		// Non-standard entries - should be handled in modules/CON1.js
		case 'cd'     : gui_activate_window('visualization'); break;
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
		log.msg({
			src : module_name,
			msg : 'Socket not ready, cannot send \''+action+'\' command',
		});
		return;
	}

	kodi.socket.Player.GetActivePlayers().then((players) => { // List active players
		return Promise.all(players.map((player) => { // Map players
			update.status('kodi.player.id', player.playerid);

			log.msg({
				src : module_name,
				msg : 'Sending \''+action+'\' command to player ID '+status.kodi.player.id,
			});

			switch (action) {
				case 'getitem':
					return kodi.socket.Player.GetItem(player.playerid);
					break;

				case 'stop':
					return kodi.socket.Player.Stop(player.playerid);
					break;

				case 'toggle':
					return kodi.socket.Player.PlayPause(player.playerid);
					break;

				case 'previous':
					return kodi.socket.Player.GoTo({ 'playerid' : player.playerid, 'to' : 'previous' });
					break;

				case 'next':
					return kodi.socket.Player.GoTo({ 'playerid' : player.playerid, 'to' : 'next' });
					break;
			}
		}));
	}).catch((e) => {
		// Handle errors
		log.msg({
			src : module_name,
			msg : 'Command error: '+e.code,
		});

		re_init();
	});
}

// Send commands to Kodi media player over the JSON-RPC websocket API
function volume(action) {
	if (config.media.kodi.enable !== true) return;

	if (kodi.socket === null) {
		log.msg({
			src : module_name,
			msg : 'Socket not ready, cannot send volume \''+action+'\' command',
		});
		return;
	}

	log.msg({
		src : module_name,
		msg : 'Sending volume \''+action+'\' command',
	});

	switch (action) {
		case 'down' : return input_execute_action('volumedown'); break;
		case 'up'   : return input_execute_action('volumeup');   break;

		default:
			return kodi.socket.Application.SetVolume(action).catch((e) => {
				// Handle errors
				log.msg({
					src : module_name,
					msg : 'Volume error: '+e.code,
				});

				re_init();
			});
	}
}

module.exports = {
	socket : null,

	connected    : false,
	connecting   : false,
	reconnecting : false,

	wait_init  : 1000,
	count_init : 0,
	timeouts : {
		init : null,
	},


  init : (init_cb) => { init(init_cb); },
	term : (term_cb) => { term(term_cb); },

	command : (action)         => { command(action);        },
	input   : (data)           => { input(data);            },
	notify  : (title, message) => { notify(title, message); },
	volume  : (action)         => { volume(action);         },

	gui_activate_window  : (gui_window)   => { gui_activate_window(gui_window);    },
	input_execute_action : (input_action) => { input_execute_action(input_action); },
};
